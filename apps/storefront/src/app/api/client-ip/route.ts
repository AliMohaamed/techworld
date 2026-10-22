import { NextRequest, NextResponse } from "next/server";

/**
 * Returns the caller's public IP so checkout can store it for the Meta
 * Conversions API (client_ip_address); Convex mutations cannot see it.
 * The site sits behind Cloudflare, then Vercel, so Cloudflare's header wins.
 */
export function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwarded ||
    null;
  return NextResponse.json({ ip }, { headers: { "Cache-Control": "no-store" } });
}
