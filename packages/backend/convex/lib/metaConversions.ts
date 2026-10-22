import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { writeAuditLog } from "./audit";

export const META_CURRENCY = "EGP";

/** Meta rejects events whose event_time is more than 7 days in the past. */
export const META_EVENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Same id as the browser Purchase on the success page, so Meta deduplicates them. */
export function purchaseEventId(order: Doc<"orders">) {
  return `purchase-${order.shortCode ?? order._id}`;
}

/**
 * Value and contents of a checkout's Purchase, from its stored order lines.
 * Both the Conversions API event and the browser Pixel event (via
 * cart.getPurchaseSummary) use this, so the two always carry the same numbers.
 * Value is the product total after discounts; shipping is excluded.
 */
export function purchaseTotals(lines: Doc<"orders">[]) {
  const byProduct = new Map<string, { quantity: number; total: number }>();
  for (const line of lines) {
    const entry = byProduct.get(line.productId) ?? { quantity: 0, total: 0 };
    entry.quantity += line.quantity;
    entry.total += line.total_price;
    byProduct.set(line.productId, entry);
  }
  const contents = Array.from(byProduct, ([id, { quantity, total }]) => ({
    id,
    quantity,
    item_price: quantity > 0 ? Math.round((total / quantity) * 100) / 100 : 0,
  }));
  const value = lines.reduce((sum, line) => sum + line.total_price, 0);
  return { value, contents };
}

export type MetaEventName = Doc<"meta_events">["eventName"];

const EVENT_KINDS = {
  // Sent at checkout, deduplicated against the browser Purchase on the success page.
  Purchase: { idPrefix: "purchase", audit: "META_PURCHASE" },
  // Server only, when the cash is collected. A custom event with its own id, so
  // Meta never merges it with or counts it as a Purchase; used for a custom
  // conversion that measures delivered revenue.
  OrderDelivered: { idPrefix: "delivered", audit: "META_DELIVERED" },
} as const satisfies Record<MetaEventName, { idPrefix: string; audit: string }>;

type QueueArgs = {
  order: Doc<"orders">;
  lines: Doc<"orders">[];
  actorId?: Id<"users">;
};

/**
 * Queues the server-side Meta `Purchase` for a checkout, called once by
 * placeOrderFromSession after every line is inserted. The storefront fires the
 * browser Purchase on the success page with the same event id, so Meta counts
 * the sale once even when both arrive.
 */
export const queueMetaPurchase = (ctx: MutationCtx, args: QueueArgs) => queueMetaEvent(ctx, "Purchase", args);

/** Queues the custom `OrderDelivered` event when staff mark an order delivered. */
export const queueMetaOrderDelivered = (ctx: MutationCtx, args: QueueArgs) =>
  queueMetaEvent(ctx, "OrderDelivered", args);

/**
 * - Value and contents come from purchaseTotals().
 * - A checkout is several order rows sharing a short code, so each event is
 *   keyed on the short code and recorded at most once, even if an order is
 *   delivered, moved back and delivered again.
 * - Orders from blacklisted phone numbers are never reported.
 */
async function queueMetaEvent(ctx: MutationCtx, eventName: MetaEventName, args: QueueArgs) {
  const { order, lines } = args;
  const kind = EVENT_KINDS[eventName];
  const eventId = `${kind.idPrefix}-${order.shortCode ?? order._id}`;
  const existing = await ctx.db
    .query("meta_events")
    .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
    .first();
  if (existing) {
    return;
  }

  if (order.customerPhone) {
    const customerPhone = order.customerPhone;
    const blacklisted = await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", customerPhone))
      .first();
    if (blacklisted) {
      await writeAuditLog(ctx, {
        userId: args.actorId,
        entityId: String(order._id),
        actionType: `${kind.audit}_SKIPPED`,
        changes: { eventId, reason: "BLACKLISTED_PHONE" },
      });
      return;
    }
  }

  const { value, contents } = purchaseTotals(lines);

  const metaEventId = await ctx.db.insert("meta_events", {
    eventId,
    eventName,
    shortCode: order.shortCode,
    orderId: order._id,
    eventTime: Math.floor(Date.now() / 1000),
    value,
    currency: META_CURRENCY,
    contents,
    status: "PENDING",
    attempts: 0,
  });

  await writeAuditLog(ctx, {
    userId: args.actorId,
    entityId: String(order._id),
    actionType: `${kind.audit}_QUEUED`,
    changes: { eventId, eventName, value, currency: META_CURRENCY },
  });

  await ctx.scheduler.runAfter(0, internal.metaConversions.sendEvent, { metaEventId });
}

// ---------------------------------------------------------------------------
// Customer-data normalisation, per Meta's Conversions API hashing rules.
// ---------------------------------------------------------------------------

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Egyptian numbers to E.164 digits without the plus: 01XXXXXXXXX -> 201XXXXXXXXX. */
export function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return `20${digits}`;
}

/** Lowercase, no punctuation or whitespace. Keeps Arabic letters intact. */
export function normalizeText(raw: string) {
  const value = raw.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
  return value || null;
}

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  return {
    first: parts[0],
    last: parts.length > 1 ? parts[parts.length - 1] : null,
  };
}
