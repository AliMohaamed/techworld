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

const remotePatterns = [
  toRemoteUrl(process.env.NEXT_PUBLIC_CONVEX_SITE_URL),
  toRemoteUrl(process.env.NEXT_PUBLIC_CONVEX_URL),
].filter((pattern): pattern is URL => pattern !== null);

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
