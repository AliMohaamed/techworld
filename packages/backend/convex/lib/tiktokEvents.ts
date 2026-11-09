import { MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { writeAuditLog } from "./audit";
import { META_CURRENCY, normalizePhone, purchaseTotals, sha256Hex } from "./metaConversions";

export type TikTokOrderEventName = Doc<"tiktok_events">["eventName"];

/** Events older than this are not sent (same 7-day window as Meta). */
export const TIKTOK_EVENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const ID_PREFIX: Record<TikTokOrderEventName, string> = {
  PlaceAnOrder: "tt-order",
  Purchase: "tt-purchase",
};

/**
 * One id per checkout and event, shared with the storefront's browser copy
 * (via cart.getPurchaseSummary) so TikTok deduplicates the two.
 */
export function tiktokEventId(eventName: TikTokOrderEventName, order: Doc<"orders">) {
  return `${ID_PREFIX[eventName]}-${order.shortCode ?? order._id}`;
}

/**
 * Queues the server-side PlaceAnOrder and Purchase for a checkout, called once
 * by placeOrderFromSession after every line is inserted. Value and contents
 * come from purchaseTotals(), the same numbers the browser events carry.
 * Orders from blacklisted phone numbers are never reported.
 */
export async function queueTikTokOrderEvents(ctx: MutationCtx, args: { order: Doc<"orders">; lines: Doc<"orders">[] }) {
  const { order, lines } = args;

  if (order.customerPhone) {
    const customerPhone = order.customerPhone;
    const blacklisted = await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", customerPhone))
      .first();
    if (blacklisted) {
      await writeAuditLog(ctx, {
        entityId: String(order._id),
        actionType: "TIKTOK_EVENTS_SKIPPED",
        changes: { shortCode: order.shortCode, reason: "BLACKLISTED_PHONE" },
      });
      return;
    }
  }

  const { value, contents } = purchaseTotals(lines);
  const eventTime = Math.floor(Date.now() / 1000);

  for (const eventName of ["PlaceAnOrder", "Purchase"] as const) {
    const eventId = tiktokEventId(eventName, order);
    const existing = await ctx.db
      .query("tiktok_events")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .first();
    if (existing) continue;

    const tiktokEventDocId = await ctx.db.insert("tiktok_events", {
      eventId,
      eventName,
      shortCode: order.shortCode,
      orderId: order._id,
      eventTime,
      value,
      currency: META_CURRENCY,
      contents,
      status: "PENDING",
      attempts: 0,
    });

    await writeAuditLog(ctx, {
      entityId: String(order._id),
      actionType: "TIKTOK_EVENT_QUEUED",
      changes: { eventId, eventName, value, currency: META_CURRENCY },
    });

    await ctx.scheduler.runAfter(0, internal.tiktokEvents.sendEvent, { tiktokEventId: tiktokEventDocId });
  }
}

/** TikTok expects E.164 with the plus sign before hashing: +201XXXXXXXXX. */
export async function hashTikTokPhone(raw: string) {
  const digits = normalizePhone(raw);
  return digits ? await sha256Hex(`+${digits}`) : undefined;
}

export async function hashTikTokEmail(raw: string) {
  const email = raw.trim().toLowerCase();
  return email ? await sha256Hex(email) : undefined;
}
