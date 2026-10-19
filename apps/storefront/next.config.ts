import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const remotePatterns: any[] = [
  { protocol: "https", hostname: "cdn.techworldegypt.com", pathname: "/**" },
  { protocol: "https", hostname: "pub-73aedd8a4e824555a4079204e3f4b219.r2.dev", pathname: "/**" },
  ...(process.env.NEXT_PUBLIC_R2_PUBLIC_HOST
    ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST, pathname: "/**" }]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@techworld/ui", "@techworld/backend"],
  // Bots on this list get <meta> tags in <head> instead of streamed into <body>.
  // Next's default covers facebookexternalhit but not Facebot.
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|Facebot`, "i"),
  images: {
    // Serve straight from the R2 CDN (zero egress); images are already compressed at upload time.
    unoptimized: true,
    remotePatterns,
  },
};

export default withNextIntl(nextConfig);
