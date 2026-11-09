import { v } from "convex/values";
import { ActionCtx, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { TIKTOK_EVENT_MAX_AGE_MS, hashTikTokEmail, hashTikTokPhone } from "./lib/tiktokEvents";

/**
 * TikTok Events API delivery. PlaceAnOrder and Purchase are queued in
 * `tiktok_events` by `queueTikTokOrderEvents` (lib/tiktokEvents.ts) when a
 * checkout is placed, and sent from here. Funnel events (ViewContent,
 * AddToCart, ...) are sent by the storefront's /api/tiktok/events route instead.
 *
 * Convex env vars:
 * - TIKTOK_PIXEL_ID              pixel code (same as the storefront's)
 * - TIKTOK_EVENTS_ACCESS_TOKEN   Events API access token, never exposed to clients
 * - TIKTOK_TEST_EVENT_CODE       optional, routes events to Events Manager > Test events
 *
 * Without the pixel id and token, events stay PENDING; the hourly flush sends
 * them once configured, as long as they are still inside the 7-day window.
 */
const TIKTOK_EVENTS_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 15_000;
const LEASE_MS = 2 * 60 * 1000;
const FLUSH_BATCH_SIZE = 25;

function getConfig() {
  const pixelId = process.env.TIKTOK_PIXEL_ID?.trim();
  const accessToken = process.env.TIKTOK_EVENTS_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return null;
  return {
    pixelId,
    accessToken,
    testEventCode: process.env.TIKTOK_TEST_EVENT_CODE?.trim() || undefined,
  };
}

export const getSendContext = internalQuery({
  args: { tiktokEventId: v.id("tiktok_events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.tiktokEventId);
    if (!event) return null;
    const order = await ctx.db.get(event.orderId);
    const productNames: Record<string, string> = {};
    for (const item of event.contents) {
      const productId = ctx.db.normalizeId("products", item.id);
      const product = productId ? await ctx.db.get(productId) : null;
      if (product) productNames[item.id] = product.name_en;
    }
    return {
      event,
      productNames,
      customer: order
        ? {
            phone: order.customerPhone,
            email: order.customerEmail,
            attribution: order.tiktokAttribution,
          }
        : null,
    };
  },
});

export const listPendingEvents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("tiktok_events")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .take(FLUSH_BATCH_SIZE);
    return pending.map((event) => event._id);
  },
});

/** Exclusive short lease, so the immediate send and the hourly flush never both call TikTok. */
export const claimEvent = internalMutation({
  args: { tiktokEventId: v.id("tiktok_events") },
  handler: async (ctx, args): Promise<boolean> => {
    const event = await ctx.db.get(args.tiktokEventId);
    const now = Date.now();
    if (!event || event.status !== "PENDING" || (event.leaseUntil ?? 0) > now) return false;
    await ctx.db.patch(event._id, { leaseUntil: now + LEASE_MS });
    return true;
  },
});

export const recordAttempt = internalMutation({
  args: {
    tiktokEventId: v.id("tiktok_events"),
    outcome: v.union(v.literal("SENT"), v.literal("ERROR"), v.literal("EXPIRED")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.tiktokEventId);
    if (!event || event.status !== "PENDING") return;

    const attempts = event.attempts + (args.outcome === "EXPIRED" ? 0 : 1);
    const status =
      args.outcome === "ERROR" ? (attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING") : args.outcome;
    await ctx.db.patch(event._id, {
      status,
      attempts,
      sentAt: args.outcome === "SENT" ? Date.now() : event.sentAt,
      lastError: args.outcome === "ERROR" ? args.error?.slice(0, 1000) : undefined,
      leaseUntil: undefined,
    });

    if (status !== "PENDING") {
      await ctx.db.insert("audit_logs", {
        entityId: String(event.orderId),
        actionType: `TIKTOK_EVENT_${status}`,
        timestamp: Date.now(),
        changes: { eventId: event.eventId, eventName: event.eventName, error: args.error },
      });
    }
  },
});

/**
 * Manual recovery after fixing the cause of a FAILED send (e.g. a wrong token):
 * `npx convex run tiktokEvents:requeueFailedEvents --prod`.
 */
export const requeueFailedEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query("tiktok_events")
      .withIndex("by_status", (q) => q.eq("status", "FAILED"))
      .take(200);
    const cutoff = Math.floor((Date.now() - TIKTOK_EVENT_MAX_AGE_MS) / 1000);
    let requeued = 0;
    for (const event of failed) {
      if (event.eventTime < cutoff) continue;
      await ctx.db.patch(event._id, { status: "PENDING", attempts: 0, leaseUntil: undefined });
      requeued++;
    }
    if (requeued > 0) {
      await ctx.scheduler.runAfter(0, internal.tiktokEvents.flushPendingEvents, {});
    }
    return { requeued };
  },
});

export const sendEvent = internalAction({
  args: { tiktokEventId: v.id("tiktok_events") },
  handler: async (ctx, args) => {
    const config = getConfig();
    if (!config) {
      console.log("TikTok Events API not configured; event left pending.");
      return;
    }
    await deliverEvent(ctx, config, args.tiktokEventId);
  },
});

/** Hourly: retries failed sends and delivers events queued before the token existed. */
export const flushPendingEvents = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number }> => {
    const config = getConfig();
    if (!config) return { processed: 0 };
    const pending = await ctx.runQuery(internal.tiktokEvents.listPendingEvents, {});
    for (const id of pending) {
      await deliverEvent(ctx, config, id);
    }
    return { processed: pending.length };
  },
});

async function deliverEvent(
  ctx: ActionCtx,
  config: NonNullable<ReturnType<typeof getConfig>>,
  tiktokEventId: Id<"tiktok_events">,
): Promise<void> {
  const claimed = await ctx.runMutation(internal.tiktokEvents.claimEvent, { tiktokEventId });
  if (!claimed) return;
  const context = await ctx.runQuery(internal.tiktokEvents.getSendContext, { tiktokEventId });
  if (!context || context.event.status !== "PENDING") return;
  const { event, customer, productNames } = context;

  if (Date.now() - event.eventTime * 1000 > TIKTOK_EVENT_MAX_AGE_MS) {
    await ctx.runMutation(internal.tiktokEvents.recordAttempt, { tiktokEventId, outcome: "EXPIRED" });
    return;
  }

  const attribution = customer?.attribution;
  const phoneHash = customer?.phone ? await hashTikTokPhone(customer.phone) : undefined;
  const body = {
    event_source: "web",
    event_source_id: config.pixelId,
    test_event_code: config.testEventCode,
    data: [
      {
        event: event.eventName,
        event_time: event.eventTime,
        event_id: event.eventId,
        user: {
          ttclid: attribution?.ttclid,
          ttp: attribution?.ttp,
          // The storefront's ttq.identify uses the same hashed phone as external_id.
          external_id: phoneHash,
          phone: phoneHash,
          email: customer?.email ? await hashTikTokEmail(customer.email) : undefined,
          ip: attribution?.ipAddress,
          user_agent: attribution?.userAgent,
        },
        page: attribution?.pageUrl ? { url: attribution.pageUrl } : undefined,
        properties: {
          currency: event.currency,
          value: event.value,
          content_type: "product",
          order_id: event.shortCode ?? String(event.orderId),
          contents: event.contents.map((item) => ({
            content_id: item.id,
            content_type: "product",
            content_name: productNames[item.id],
            quantity: item.quantity,
            price: item.item_price,
          })),
        },
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(TIKTOK_EVENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": config.accessToken },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const text = await res.text();
    // TikTok reports most failures as HTTP 200 with a non-zero `code`.
    let code: number | undefined;
    try {
      code = (JSON.parse(text) as { code?: number }).code;
    } catch {
      code = undefined;
    }
    if (res.ok && code === 0) {
      await ctx.runMutation(internal.tiktokEvents.recordAttempt, { tiktokEventId, outcome: "SENT" });
    } else {
      await ctx.runMutation(internal.tiktokEvents.recordAttempt, {
        tiktokEventId,
        outcome: "ERROR",
        error: `HTTP ${res.status}: ${text}`,
      });
    }
  } catch (e) {
    clearTimeout(timeout);
    await ctx.runMutation(internal.tiktokEvents.recordAttempt, {
      tiktokEventId,
      outcome: "ERROR",
      error: controller.signal.aborted ? `Timed out after ${REQUEST_TIMEOUT_MS}ms` : String(e),
    });
  }
}
