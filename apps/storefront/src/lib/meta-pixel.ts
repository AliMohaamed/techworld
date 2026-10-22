/**
 * Browser-side Meta Pixel. Everything is a no-op unless
 * NEXT_PUBLIC_META_PIXEL_ID is set at build time.
 *
 * Purchase fires on the success page once the checkout is placed. The backend
 * sends the same Purchase through the Conversions API
 * (packages/backend/convex/metaConversions.ts) with the same event id, so Meta
 * counts it once.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined;
export const META_CURRENCY = "EGP";

type BrowserEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/**
 * Installs the standard fbq command queue and initialises the pixel on first
 * use, so events fired before fbevents.js finishes loading are kept in order
 * after `init`. The script itself is loaded by <MetaPixel />.
 */
function getFbq(): Fbq | null {
  if (!META_PIXEL_ID || typeof window === "undefined") return null;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq ??= fbq;
    fbq("init", META_PIXEL_ID);
  }
  return window.fbq;
}

/** `eventId` lets Meta deduplicate this event against its server-side copy. */
export function trackMetaEvent(event: BrowserEvent, params?: Record<string, unknown>, eventId?: string) {
  if (eventId) getFbq()?.("track", event, params, { eventID: eventId });
  else getFbq()?.("track", event, params);
}

/** Must match purchaseEventId() in packages/backend/convex/lib/metaConversions.ts. */
export const purchaseEventId = (shortCode: string) => `purchase-${shortCode}`;

const PENDING_PURCHASE_KEY = "tw-meta-purchase";

type PendingPurchase = { shortCode: string; contents: MetaContent[]; value: number };

/** Called by checkout right after the order is placed, for the success page to report. */
export function savePendingPurchase(purchase: PendingPurchase) {
  if (!META_PIXEL_ID) return;
  try {
    window.sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(purchase));
  } catch {
    // Storage blocked; the server-side Purchase still reports the sale.
  }
}

/**
 * Fires the browser Purchase for `shortCode` if this tab just placed that
 * order. The pending entry is removed first, so a reload, a shared success
 * link or another order's code never reports a sale.
 */
export function trackPendingPurchase(shortCode: string) {
  if (!META_PIXEL_ID) return;
  let purchase: PendingPurchase | null = null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_PURCHASE_KEY);
    window.sessionStorage.removeItem(PENDING_PURCHASE_KEY);
    purchase = raw ? (JSON.parse(raw) as PendingPurchase) : null;
  } catch {
    return;
  }
  if (!purchase || purchase.shortCode !== shortCode) return;
  trackMetaEvent("Purchase", productEventParams(purchase.contents, purchase.value), purchaseEventId(shortCode));
}

export type MetaContent = { id: string; quantity: number; item_price: number };

/** Standard e-commerce parameters, with product ids as content_ids. */
export function productEventParams(contents: MetaContent[], value: number) {
  return {
    content_type: "product",
    content_ids: Array.from(new Set(contents.map((item) => item.id))),
    contents,
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
    value,
    currency: META_CURRENCY,
  };
}

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Browser identifiers stored on the order at checkout, so the server-side
 * Purchase can be attributed to the ad click. Undefined when the pixel is off.
 */
export function getMetaAttribution() {
  if (!META_PIXEL_ID || typeof window === "undefined") return undefined;
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    clientUserAgent: navigator.userAgent,
    eventSourceUrl: window.location.href,
  };
}
