import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const authConfig = process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CONVEX_SITE_URL
  ? {
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,
      convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL,
    }
  : {
      convexUrl: "",
      convexSiteUrl: "",
    };

const auth = (authConfig.convexUrl ? convexBetterAuthNextJs(authConfig) : {}) as any;

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = auth;
