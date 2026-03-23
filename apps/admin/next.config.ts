import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@techworld/ui", "@techworld/backend"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "clean-heron-293.convex.cloud", pathname: "/**" },
      { protocol: "https", hostname: "usable-wren-18.convex.cloud", pathname: "/**" },
    ],
  },
};

export default withNextIntl(nextConfig);
