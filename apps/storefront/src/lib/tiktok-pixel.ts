import { fetchClientIp, readCookie, sha256Hex, writeCookie } from "./browser-context";

/**
 * Browser-side TikTok Pixel plus the Events API copy of funnel events.
 * Everything is a no-op unless NEXT_PUBLIC_TIKTOK_PIXEL_ID is set at build time.
 * Call sites go through lib/tracking.ts.
 *
 * Deduplication: every event carries an `event_id`. Funnel events are sent
 * from the browser (ttq.track) and, with the same id, from our server via
 * /api/tiktok/events. PlaceAnOrder and Purchase are sent server-side by Convex
 * (packages/backend/convex/tiktokEvents.ts) and from the success page with the
 * ids returned by cart.getPurchaseSummary.
 */
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() || undefined;
export const TIKTOK_CURRENCY = "EGP";

export type TikTokEvent =
  | "ViewContent"
  | "Search"
  | "AddToWishlist"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "PlaceAnOrder"
  | "Purchase";

export type TikTokContent = {
  content_id: string;
  content_type: "product";
  content_name?: string;
  quantity: number;
  price: number;
};

export type TikTokProperties = {
  contents?: TikTokContent[];
  content_type?: "product";
  value?: number;
  currency?: string;
  search_string?: string;
  query?: string;
  order_id?: string;
};

type TtqApi = {
  load: (pixelId: string, options?: Record<string, unknown>) => void;
  page: () => void;
  track: (event: string, properties?: Record<string, unknown>, options?: { event_id?: string }) => void;
  identify: (data: Record<string, string>) => void;
};

declare global {
  interface Window {
    ttq?: TtqApi;
    TiktokAnalyticsObject?: string;
  }
}

const TTQ_METHODS = [
  "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group",
  "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
];

/**
 * TikTok's official base code, as a function: installs the ttq command queue
 * and loads events.js once. Events fired before the script arrives are queued
 * and replayed in order. Page views are reported by <TikTokPixel />.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- port of TikTok's untyped loader */
function installTtq(pixelId: string) {
  const w = window as any;
  const name = "ttq";
  w.TiktokAnalyticsObject = name;
  const ttq = (w[name] = w[name] || []);
  ttq.methods = TTQ_METHODS;
  ttq.setAndDefer = function (target: any, method: string) {
    target[method] = function (...args: unknown[]) {
      target.push([method, ...args]);
    };
  };
  for (const method of TTQ_METHODS) ttq.setAndDefer(ttq, method);
  ttq.instance = function (id: string) {
    const instance = ttq._i[id] || [];
    for (const method of TTQ_METHODS) ttq.setAndDefer(instance, method);
    return instance;
  };
  ttq.load = function (id: string, options?: Record<string, unknown>) {
    const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i || {};
    ttq._i[id] = [];
    ttq._i[id]._u = src;
    ttq._t = ttq._t || {};
    ttq._t[id] = +new Date();
    ttq._o = ttq._o || {};
    ttq._o[id] = options || {};
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${src}?sdkid=${id}&lib=${name}`;
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
  };
  ttq.load(pixelId);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

let installed = false;

function getTtq(): TtqApi | null {
  if (!TIKTOK_PIXEL_ID || typeof window === "undefined") return null;
  if (!installed) {
    installed = true;
    if (!window.ttq) installTtq(TIKTOK_PIXEL_ID);
  }
  return window.ttq ?? null;
}

export function trackTikTokPageView() {
  getTtq()?.page();
}

/** Browser copy only. */
export function trackTikTokBrowserEvent(event: TikTokEvent, properties: TikTokProperties, eventId: string) {
  getTtq()?.track(event, properties, { event_id: eventId });
}

// ---------------------------------------------------------------------------
// Click id and advanced matching
// ---------------------------------------------------------------------------

const TTCLID_COOKIE = "tw_ttclid";
const TTCLID_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // covers TikTok's longest click attribution window
const IDENTITY_KEY = "tw-tt-identity";

/** Keeps the `ttclid` from a TikTok ad landing URL, so later server events can be attributed to the click. */
export function captureTikTokClickId() {
  if (!TIKTOK_PIXEL_ID || typeof window === "undefined") return;
  const ttclid = new URLSearchParams(window.location.search).get("ttclid");
  if (ttclid && ttclid.length <= 500) writeCookie(TTCLID_COOKIE, ttclid, TTCLID_MAX_AGE_SECONDS);
}

type HashedIdentity = { email?: string; phone_number?: string; external_id?: string };

function readIdentity(): HashedIdentity | undefined {
  try {
    const raw = window.sessionStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as HashedIdentity) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Advanced matching. Values are SHA-256 hashed in the browser; the phone is
 * hashed in E.164 form (+201XXXXXXXXX) and doubles as external_id, matching
 * what the Convex Events API sender computes from the stored order.
 * `phone` is an Egyptian local number (01XXXXXXXXX).
 */
export async function identifyTikTokUser({ email, phone }: { email?: string; phone?: string }) {
  if (!TIKTOK_PIXEL_ID || typeof window === "undefined") return;
  try {
    const identity: HashedIdentity = {};
    const normalizedEmail = email?.trim().toLowerCase();
    if (normalizedEmail) identity.email = await sha256Hex(normalizedEmail);
    const digits = phone?.replace(/\D/g, "");
    if (digits) {
      const e164 = digits.startsWith("20") ? `+${digits}` : `+20${digits.replace(/^0/, "")}`;
      identity.phone_number = await sha256Hex(e164);
      identity.external_id = identity.phone_number;
    }
    if (Object.keys(identity).length === 0) return;
    getTtq()?.identify(identity as Record<string, string>);
    window.sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // crypto.subtle is unavailable outside secure contexts; matching is optional.
  }
}

/** Browser identifiers stored on the order at checkout, for the server-side PlaceAnOrder/Purchase. */
export async function getTikTokAttribution() {
  if (!TIKTOK_PIXEL_ID || typeof window === "undefined") return undefined;
  return {
    ttp: readCookie("_ttp"),
    ttclid: readCookie(TTCLID_COOKIE),
    userAgent: navigator.userAgent,
    ipAddress: await fetchClientIp(),
    pageUrl: window.location.href,
  };
}

/**
 * Server copy of a funnel event, through our /api/tiktok/events route (which
 * holds the access token and adds the visitor's IP and user agent). Fire and
 * forget: `keepalive` lets it finish even if the page navigates away.
 */
export function sendTikTokServerEvent(event: TikTokEvent, properties: TikTokProperties, eventId: string) {
  if (!TIKTOK_PIXEL_ID || typeof window === "undefined") return;
  const identity = readIdentity();
  const body = JSON.stringify({
    event,
    eventId,
    eventTime: Math.floor(Date.now() / 1000),
    properties,
    page: { url: window.location.href, referrer: document.referrer || undefined },
    user: {
      ttp: readCookie("_ttp"),
      ttclid: readCookie(TTCLID_COOKIE),
      email: identity?.email,
      phone: identity?.phone_number,
      external_id: identity?.external_id,
    },
  });
  fetch("/api/tiktok/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // The browser copy still reports the event.
  });
}
