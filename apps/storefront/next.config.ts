import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const remotePatterns: any[] = [
  {
    protocol: "https",
    hostname: "cdn.techworldegypt.com",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "pub-73aedd8a4e824555a4079204e3f4b219.r2.dev",
    pathname: "/**",
  },
  ...(process.env.NEXT_PUBLIC_R2_PUBLIC_HOST
    ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST, pathname: "/**" }]
    : []),
];

const nextConfig: NextConfig = {
  transpilePackages: ["@techworld/ui", "@techworld/backend"],
  images: {
    remotePatterns,
  },
};

export default withNextIntl(nextConfig);
