import { fetchClientIp, readCookie } from "./browser-context";

/**
 * Browser-side Meta Pixel. Everything is a no-op unless
 * NEXT_PUBLIC_META_PIXEL_ID is set at build time. Call sites go through
 * lib/tracking.ts, which reports each event to Meta and TikTok together.
 *
 * Purchase fires on the success page once the checkout is placed, with the
 * value read back from the stored order (cart.getPurchaseSummary). The backend
 * sends the same Purchase through the Conversions API
 * (packages/backend/convex/metaConversions.ts) with the same event id, so Meta
 * counts it once.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined;
export const META_CURRENCY = "EGP";

export type MetaBrowserEvent =
  | "PageView"
  | "ViewContent"
  | "Search"
  | "AddToWishlist"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "Purchase";

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
    // Without this, Meta's "automatic events" guess extra events, including a
    // Purchase, from button clicks with no real value. Every event we report
    // is sent explicitly through trackMetaEvent.
    fbq("set", "autoConfig", false, META_PIXEL_ID);
    fbq("init", META_PIXEL_ID);
  }
  return window.fbq;
}

/** `eventId` lets Meta deduplicate this event against a server-side copy. */
export function trackMetaEvent(event: MetaBrowserEvent, params?: Record<string, unknown>, eventId?: string) {
  if (eventId) getFbq()?.("track", event, params, { eventID: eventId });
  else getFbq()?.("track", event, params);
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

/**
 * Browser identifiers stored on the order at checkout, so the server-side
 * Purchase can be matched to the ad click. Undefined when the pixel is off.
 */
export async function getMetaAttribution() {
  if (!META_PIXEL_ID || typeof window === "undefined") return undefined;
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
    clientUserAgent: navigator.userAgent,
    clientIpAddress: await fetchClientIp(),
    eventSourceUrl: window.location.href,
  };
}
