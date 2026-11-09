import { after, NextRequest, NextResponse } from "next/server";

/**
 * Server copy of the storefront's TikTok funnel events (lib/tiktok-pixel.ts →
 * sendTikTokServerEvent). The browser sends the same event with the same
 * event_id through the pixel, and TikTok deduplicates the pair.
 *
 * PlaceAnOrder and Purchase are not accepted here: Convex sends those from the
 * stored order, so their value cannot be forged from the browser.
 *
 * Env (server only): TIKTOK_EVENTS_ACCESS_TOKEN, optional TIKTOK_TEST_EVENT_CODE.
 * The pixel id comes from NEXT_PUBLIC_TIKTOK_PIXEL_ID.
 */
const TIKTOK_EVENTS_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const ALLOWED_EVENTS = new Set(["ViewContent", "Search", "AddToWishlist", "AddToCart", "InitiateCheckout", "AddPaymentInfo"]);
const MAX_BODY_BYTES = 16 * 1024;
const MAX_EVENT_AGE_SECONDS = 60 * 60;

const str = (value: unknown, max: number) =>
  typeof value === "string" && value.length > 0 && value.length <= max ? value : undefined;
const token = (value: unknown, max: number) => {
  const s = str(value, max);
  return s && /^[\x21-\x7e]+$/.test(s) ? s : undefined;
};
const sha256 = (value: unknown) => (typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : undefined);
const num = (value: unknown, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max ? value : undefined;
const url = (value: unknown) => {
  const s = str(value, 2048);
  return s && /^https?:\/\//.test(s) ? s : undefined;
};

function sanitizeProperties(input: unknown) {
  const p = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const contents = Array.isArray(p.contents)
    ? p.contents.slice(0, 50).flatMap((raw) => {
        const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const contentId = str(item.content_id, 100);
        if (!contentId) return [];
        return [
          {
            content_id: contentId,
            content_type: "product",
            content_name: str(item.content_name, 200),
            quantity: num(item.quantity, 10_000),
            price: num(item.price, 10_000_000),
          },
        ];
      })
    : undefined;
  return {
    contents: contents?.length ? contents : undefined,
    content_type: contents?.length ? "product" : undefined,
    value: num(p.value, 100_000_000),
    currency: "EGP",
    search_string: str(p.search_string, 200),
    query: str(p.query, 200),
  };
}

function clientIp(request: NextRequest) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip && /^[0-9a-fA-F.:]{3,45}$/.test(ip) ? ip : undefined;
}

export async function POST(request: NextRequest) {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim();
  const accessToken = process.env.TIKTOK_EVENTS_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return new NextResponse(null, { status: 204 });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const event = typeof body.event === "string" && ALLOWED_EVENTS.has(body.event) ? body.event : undefined;
  const eventId = typeof body.eventId === "string" && /^[\w-]{8,100}$/.test(body.eventId) ? body.eventId : undefined;
  if (!event || !eventId) return new NextResponse(null, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const claimedTime = num(body.eventTime, now + 60);
  const eventTime = claimedTime && now - claimedTime < MAX_EVENT_AGE_SECONDS ? Math.min(claimedTime, now) : now;
  const user = (body.user && typeof body.user === "object" ? body.user : {}) as Record<string, unknown>;
  const page = (body.page && typeof body.page === "object" ? body.page : {}) as Record<string, unknown>;

  const payload = {
    event_source: "web",
    event_source_id: pixelId,
    test_event_code: process.env.TIKTOK_TEST_EVENT_CODE?.trim() || undefined,
    data: [
      {
        event,
        event_time: eventTime,
        event_id: eventId,
        user: {
          ttp: token(user.ttp, 200),
          ttclid: token(user.ttclid, 500),
          email: sha256(user.email),
          phone: sha256(user.phone),
          external_id: sha256(user.external_id),
          ip: clientIp(request),
          user_agent: str(request.headers.get("user-agent"), 512),
        },
        page: { url: url(page.url), referrer: url(page.referrer) },
        properties: sanitizeProperties(body.properties),
      },
    ],
  };

  // Respond at once; the send finishes in the background.
  after(async () => {
    try {
      const res = await fetch(TIKTOK_EVENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Access-Token": accessToken },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      const code = (() => {
        try {
          return (JSON.parse(text) as { code?: number }).code;
        } catch {
          return undefined;
        }
      })();
      if (!res.ok || code !== 0) console.error(`TikTok Events API rejected ${event}: HTTP ${res.status} ${text}`);
    } catch (error) {
      console.error(`TikTok Events API request failed for ${event}:`, error);
    }
  });

  return new NextResponse(null, { status: 202 });
}
