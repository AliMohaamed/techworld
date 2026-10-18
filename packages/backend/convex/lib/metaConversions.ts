import { MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { writeAuditLog } from "./audit";
import { canDeliverFrom } from "./orderTransitions";

export const META_CURRENCY = "EGP";

/** Meta rejects events whose event_time is more than 7 days in the past. */
export const META_EVENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type OrderState = Doc<"orders">["state"];

export function purchaseEventId(order: Doc<"orders">) {
  return `purchase-${order.shortCode ?? order._id}`;
}

/**
 * Queues the Meta `Purchase` for a customer order the moment it is delivered
 * and the cash balance collected. Call it from every mutation that can move an
 * order into DELIVERED; it is a no-op for any other transition.
 *
 * - Value is the product total after discounts; shipping is excluded.
 * - A checkout is several order rows sharing a short code, so the event is
 *   keyed on the short code and recorded at most once, even if the order is
 *   later moved back and delivered again.
 * - Orders from blacklisted phone numbers are never reported.
 */
export async function queueMetaPurchase(
  ctx: MutationCtx,
  args: {
    order: Doc<"orders">;
    lines: Doc<"orders">[];
    fromState: OrderState;
    toState: OrderState;
    actorId?: Id<"users">;
  },
) {
  const { order, lines, fromState, toState } = args;
  // Customers pay a deposit that staff verify (CONFIRMED) and the balance in cash
  // on delivery, so the sale is only complete at DELIVERED, and only for confirmed
  // orders. updateGenericStatus already rejects any other route; this is a backstop.
  if (toState !== "DELIVERED" || !canDeliverFrom(lines.map((line) => line.state))) {
    return;
  }

  const eventId = purchaseEventId(order);
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
        actionType: "META_PURCHASE_SKIPPED",
        changes: { eventId, reason: "BLACKLISTED_PHONE" },
      });
      return;
    }
  }

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

  const metaEventId = await ctx.db.insert("meta_events", {
    eventId,
    eventName: "Purchase",
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
    actionType: "META_PURCHASE_QUEUED",
    changes: { eventId, value, currency: META_CURRENCY, from: fromState, to: toState },
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
