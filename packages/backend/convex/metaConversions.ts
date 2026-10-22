import { v } from "convex/values";
import { ActionCtx, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { META_EVENT_MAX_AGE_MS, normalizePhone, normalizeText, sha256Hex, splitName } from "./lib/metaConversions";

/**
 * Meta Conversions API delivery. Purchases are queued in `meta_events` by
 * `queueMetaPurchase` (lib/metaConversions.ts) when a checkout is placed, and
 * sent from here.
 *
 * Convex env vars:
 * - META_PIXEL_ID              dataset / pixel id (same as the storefront's)
 * - META_CAPI_ACCESS_TOKEN     Conversions API token, never exposed to clients
 * - META_CAPI_TEST_EVENT_CODE  optional, routes events to Events Manager > Test events
 * - META_GRAPH_API_VERSION     optional override, defaults below
 *
 * Without the pixel id and token, events stay PENDING; the hourly flush sends
 * them once configured, as long as they are still inside Meta's 7-day window.
 */
const DEFAULT_GRAPH_API_VERSION = "v23.0";
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;
// Comfortably longer than one request, so a lease never expires mid-send.
const LEASE_MS = 2 * 60 * 1000;
// Worst case (every request timing out) must stay well under the 10-minute action limit.
const FLUSH_BATCH_SIZE = 25;

function getConfig() {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return null;
  return {
    pixelId,
    accessToken,
    testEventCode: process.env.META_CAPI_TEST_EVENT_CODE?.trim() || undefined,
    apiVersion: process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION,
  };
}

export const getSendContext = internalQuery({
  args: { metaEventId: v.id("meta_events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.metaEventId);
    if (!event) return null;
    const order = await ctx.db.get(event.orderId);
    const governorate = order?.governorateId ? await ctx.db.get(order.governorateId) : null;
    return {
      event,
      customer: order
        ? {
            name: order.customerName,
            phone: order.customerPhone,
            altPhone: order.customerAltPhone,
            email: order.customerEmail,
            governorate: governorate?.name_en,
            attribution: order.metaAttribution,
          }
        : null,
    };
  },
});

export const listPendingEvents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("meta_events")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .take(FLUSH_BATCH_SIZE);
    return pending.map((event) => ({ _id: event._id, eventTime: event.eventTime }));
  },
});

export const recordAttempt = internalMutation({
  args: {
    metaEventId: v.id("meta_events"),
    outcome: v.union(v.literal("SENT"), v.literal("ERROR"), v.literal("EXPIRED")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.metaEventId);
    if (!event || event.status !== "PENDING") return;

    if (args.outcome === "EXPIRED") {
      await ctx.db.patch(event._id, { status: "EXPIRED", leaseUntil: undefined });
    } else if (args.outcome === "SENT") {
      await ctx.db.patch(event._id, {
        status: "SENT",
        attempts: event.attempts + 1,
        sentAt: Date.now(),
        lastError: undefined,
        leaseUntil: undefined,
      });
    } else {
      const attempts = event.attempts + 1;
      await ctx.db.patch(event._id, {
        status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        attempts,
        lastError: args.error?.slice(0, 1000),
        leaseUntil: undefined,
      });
    }

    if (args.outcome !== "ERROR" || event.attempts + 1 >= MAX_ATTEMPTS) {
      await ctx.db.insert("audit_logs", {
        entityId: String(event.orderId),
        actionType: `META_PURCHASE_${args.outcome === "ERROR" ? "FAILED" : args.outcome}`,
        timestamp: Date.now(),
        changes: { eventId: event.eventId, error: args.error },
      });
    }
  },
});

/**
 * Takes a short exclusive lease on a PENDING event. Mutations are serialised,
 * so when the immediate send and the hourly flush race for the same event,
 * only one of them gets to call Meta.
 */
export const claimEvent = internalMutation({
  args: { metaEventId: v.id("meta_events") },
  handler: async (ctx, args): Promise<boolean> => {
    const event = await ctx.db.get(args.metaEventId);
    const now = Date.now();
    if (!event || event.status !== "PENDING" || (event.leaseUntil ?? 0) > now) return false;
    await ctx.db.patch(event._id, { leaseUntil: now + LEASE_MS });
    return true;
  },
});

/**
 * Manual recovery after fixing the cause of a FAILED send (e.g. a wrong token):
 * `npx convex run metaConversions:requeueFailedEvents --prod`. Events older than
 * Meta's 7-day window are left alone; the next send marks them EXPIRED.
 */
export const requeueFailedEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query("meta_events")
      .withIndex("by_status", (q) => q.eq("status", "FAILED"))
      .take(200);
    const cutoff = Math.floor((Date.now() - META_EVENT_MAX_AGE_MS) / 1000);
    let requeued = 0;
    for (const event of failed) {
      if (event.eventTime < cutoff) continue;
      await ctx.db.patch(event._id, { status: "PENDING", attempts: 0, leaseUntil: undefined });
      requeued++;
    }
    if (requeued > 0) {
      await ctx.scheduler.runAfter(0, internal.metaConversions.flushPendingEvents, {});
    }
    return { requeued };
  },
});

export const sendEvent = internalAction({
  args: { metaEventId: v.id("meta_events") },
  handler: async (ctx, args) => {
    const config = getConfig();
    if (!config) {
      console.log("Meta Conversions API not configured; Purchase left pending.");
      return;
    }
    await deliverEvent(ctx, config, args.metaEventId);
  },
});

/** Hourly: retries failed sends and delivers events queued before the token existed. */
export const flushPendingEvents = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number }> => {
    const config = getConfig();
    if (!config) return { processed: 0 };
    const pending = await ctx.runQuery(internal.metaConversions.listPendingEvents, {});
    for (const event of pending) {
      await deliverEvent(ctx, config, event._id);
    }
    return { processed: pending.length };
  },
});

async function deliverEvent(
  ctx: ActionCtx,
  config: NonNullable<ReturnType<typeof getConfig>>,
  metaEventId: Id<"meta_events">,
): Promise<void> {
  const claimed = await ctx.runMutation(internal.metaConversions.claimEvent, { metaEventId });
  if (!claimed) return;
  const context = await ctx.runQuery(internal.metaConversions.getSendContext, { metaEventId });
  if (!context || context.event.status !== "PENDING") return;
  const { event, customer } = context;

  if (Date.now() - event.eventTime * 1000 > META_EVENT_MAX_AGE_MS) {
    await ctx.runMutation(internal.metaConversions.recordAttempt, {
      metaEventId: event._id,
      outcome: "EXPIRED",
    });
    return;
  }

  const hashAll = async (values: (string | null | undefined)[]) => {
    const present = Array.from(new Set(values.filter((value): value is string => Boolean(value))));
    return present.length ? await Promise.all(present.map(sha256Hex)) : undefined;
  };
  const name = customer?.name ? splitName(customer.name) : { first: null, last: null };
  const attribution = customer?.attribution;

  const userData = {
    em: await hashAll([customer?.email?.trim().toLowerCase()]),
    ph: await hashAll([
      customer?.phone ? normalizePhone(customer.phone) : null,
      customer?.altPhone ? normalizePhone(customer.altPhone) : null,
    ]),
    fn: await hashAll([name.first ? normalizeText(name.first) : null]),
    ln: await hashAll([name.last ? normalizeText(name.last) : null]),
    st: await hashAll([customer?.governorate ? normalizeText(customer.governorate) : null]),
    country: await hashAll(["eg"]),
    fbp: attribution?.fbp,
    fbc: attribution?.fbc,
    client_user_agent: attribution?.clientUserAgent,
  };

  const body = {
    data: [
      {
        event_name: event.eventName,
        event_time: event.eventTime,
        event_id: event.eventId,
        // Meta requires a user agent for "website" events; orders placed
        // before checkout captured one are still reported, just less matchable.
        action_source: attribution?.clientUserAgent ? "website" : "other",
        event_source_url: attribution?.eventSourceUrl,
        user_data: userData,
        custom_data: {
          currency: event.currency,
          value: event.value,
          content_type: "product",
          content_ids: event.contents.map((item) => item.id),
          contents: event.contents,
          num_items: event.contents.reduce((sum, item) => sum + item.quantity, 0),
          order_id: event.shortCode ?? String(event.orderId),
        },
      },
    ],
    test_event_code: config.testEventCode,
    access_token: config.accessToken,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.pixelId)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (res.ok) {
      await ctx.runMutation(internal.metaConversions.recordAttempt, {
        metaEventId: event._id,
        outcome: "SENT",
      });
    } else {
      await ctx.runMutation(internal.metaConversions.recordAttempt, {
        metaEventId: event._id,
        outcome: "ERROR",
        error: `HTTP ${res.status}: ${await res.text()}`,
      });
    }
  } catch (e) {
    clearTimeout(timeout);
    await ctx.runMutation(internal.metaConversions.recordAttempt, {
      metaEventId: event._id,
      outcome: "ERROR",
      error: controller.signal.aborted ? `Timed out after ${REQUEST_TIMEOUT_MS}ms` : String(e),
    });
  }
}
