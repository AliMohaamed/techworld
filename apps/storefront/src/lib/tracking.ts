import { newEventId } from "./browser-context";
import { META_PIXEL_ID, productEventParams, trackMetaEvent } from "./meta-pixel";
import {
  TIKTOK_CURRENCY,
  TIKTOK_PIXEL_ID,
  sendTikTokServerEvent,
  trackTikTokBrowserEvent,
  type TikTokContent,
  type TikTokProperties,
} from "./tiktok-pixel";

/**
 * One entry point for ad-platform events: each call reports the event to the
 * Meta Pixel and the TikTok Pixel, and sends TikTok's server copy, all under a
 * single freshly generated event id.
 *
 * Product ids are the catalogue's product `_id`s, so a Meta or TikTok product
 * catalogue must use the same ids. Values are in EGP, from real prices.
 */
export type TrackedItem = { id: string; quantity: number; price: number; name?: string };

type FunnelEvent = "ViewContent" | "AddToWishlist" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo";

function tiktokProducts(items: TrackedItem[], value: number): TikTokProperties {
  return {
    content_type: "product",
    contents: items.map(
      (item): TikTokContent => ({
        content_id: item.id,
        content_type: "product",
        content_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }),
    ),
    value,
    currency: TIKTOK_CURRENCY,
  };
}

function metaProducts(items: TrackedItem[], value: number) {
  const params: Record<string, unknown> = productEventParams(
    items.map((item) => ({ id: item.id, quantity: item.quantity, item_price: item.price })),
    value,
  );
  if (items.length === 1 && items[0].name) params.content_name = items[0].name;
  return params;
}

function sendTikTok(event: Parameters<typeof trackTikTokBrowserEvent>[0], properties: TikTokProperties, eventId: string) {
  trackTikTokBrowserEvent(event, properties, eventId);
  sendTikTokServerEvent(event, properties, eventId);
}

/** `value` defaults to the sum of price × quantity. */
export function trackProductEvent(event: FunnelEvent, items: TrackedItem[], value?: number) {
  if (items.length === 0) return;
  const total = value ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const eventId = newEventId(event.toLowerCase());
  trackMetaEvent(event, metaProducts(items, total), eventId);
  sendTikTok(event, tiktokProducts(items, total), eventId);
}

export function trackSearch(query: string) {
  const searchString = query.trim().slice(0, 200);
  if (!searchString) return;
  const eventId = newEventId("search");
  trackMetaEvent("Search", { search_string: searchString }, eventId);
  sendTikTok("Search", { search_string: searchString, query: searchString }, eventId);
}

export type PurchaseSummary = {
  eventId: string;
  tiktokEventIds: { placeAnOrder: string; purchase: string };
  value: number;
  contents: { id: string; quantity: number; item_price: number }[];
};

/**
 * Browser copies of the checkout's order events, with the ids and values from
 * cart.getPurchaseSummary. The server copies are sent by Convex.
 */
export function trackOrderPlaced(summary: PurchaseSummary, shortCode: string) {
  trackMetaEvent("Purchase", productEventParams(summary.contents, summary.value), summary.eventId);
  const items = summary.contents.map((item) => ({ id: item.id, quantity: item.quantity, price: item.item_price }));
  const properties = { ...tiktokProducts(items, summary.value), order_id: shortCode };
  trackTikTokBrowserEvent("PlaceAnOrder", properties, summary.tiktokEventIds.placeAnOrder);
  trackTikTokBrowserEvent("Purchase", properties, summary.tiktokEventIds.purchase);
}

const TRACKING_ENABLED = Boolean(META_PIXEL_ID || TIKTOK_PIXEL_ID);
const PENDING_PURCHASE_KEY = "tw-meta-purchase";

/** Called by checkout right after the order is placed: the success page may now report it. */
export function markPurchasePending(shortCode: string) {
  if (!TRACKING_ENABLED) return;
  try {
    window.sessionStorage.setItem(PENDING_PURCHASE_KEY, shortCode);
  } catch {
    // Storage blocked; the server-side events still report the sale.
  }
}

/**
 * True once, in the tab that just placed `shortCode`. The marker is removed as
 * it is read, so a reload, a revisit or a shared success link never reports
 * the sale again.
 */
export function takePendingPurchase(shortCode: string) {
  if (!TRACKING_ENABLED) return false;
  try {
    if (window.sessionStorage.getItem(PENDING_PURCHASE_KEY) !== shortCode) return false;
    window.sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    return true;
  } catch {
    return false;
  }
}
