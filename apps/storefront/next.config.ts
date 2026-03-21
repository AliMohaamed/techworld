import type { NextConfig } from "next";

function toRemoteUrl(urlValue: string | undefined) {
  if (!urlValue) {
    return null;
  }

  try {
    return new URL(urlValue);
  } catch {
    return null;
  }
}

const remotePatterns: any[] = [
  ...[
    toRemoteUrl(process.env.NEXT_PUBLIC_CONVEX_SITE_URL),
    toRemoteUrl(process.env.NEXT_PUBLIC_CONVEX_URL),
  ]
    .filter((url): url is URL => url !== null)
    .map((url) => ({
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    })),
  {
    protocol: "https",
    hostname: "clean-heron-293.convex.cloud",
    pathname: "/**",
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@techworld/ui"],
  images: {
    remotePatterns,
  },
};

export default nextConfig;
