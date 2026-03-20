import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@techworld/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "clean-heron-293.convex.cloud", pathname: "/**" },
    ],
  },
};

export default nextConfig;
