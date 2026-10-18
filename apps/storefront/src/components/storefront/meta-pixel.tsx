"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, trackMetaEvent } from "@/lib/meta-pixel";

/**
 * Loads the Meta Pixel and reports a PageView on the first load and on every
 * client-side navigation, which a plain snippet in <head> would miss.
 * Renders nothing when NEXT_PUBLIC_META_PIXEL_ID is not configured.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    trackMetaEvent("PageView");
  }, [pathname]);

  if (!META_PIXEL_ID) return null;

  return (
    <>
      <Script id="meta-pixel" src="https://connect.facebook.net/en_US/fbevents.js" strategy="afterInteractive" />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
