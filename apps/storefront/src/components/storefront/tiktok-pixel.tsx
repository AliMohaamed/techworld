"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { TIKTOK_PIXEL_ID, captureTikTokClickId, trackTikTokPageView } from "@/lib/tiktok-pixel";

/**
 * Loads the TikTok Pixel and reports a page view on the first load and on
 * every client-side navigation, which the plain base-code snippet would miss.
 * Also keeps the ad click id (ttclid) for server-side attribution.
 * Renders nothing; inactive when NEXT_PUBLIC_TIKTOK_PIXEL_ID is not configured.
 */
export function TikTokPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!TIKTOK_PIXEL_ID) return;
    captureTikTokClickId();
    trackTikTokPageView();
  }, [pathname]);

  return null;
}
