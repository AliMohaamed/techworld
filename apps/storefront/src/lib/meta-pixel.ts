/**
 * Browser-side Meta Pixel. Everything is a no-op unless
 * NEXT_PUBLIC_META_PIXEL_ID is set at build time.
 *
 * Purchase is intentionally not tracked here: the sale completes on delivery,
 * when the cash balance is collected, so the backend reports it through the Conversions API
 * (packages/backend/convex/metaConversions.ts).
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || undefined;
export const META_CURRENCY = "EGP";

type BrowserEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout";

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

export function trackMetaEvent(event: BrowserEvent, params?: Record<string, unknown>) {
  getFbq()?.("track", event, params);
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
