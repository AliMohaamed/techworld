import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();

const authConfig = convexUrl && convexSiteUrl
  ? {
      convexUrl,
      convexSiteUrl,
    }
  : {
      convexUrl: "",
      convexSiteUrl: "",
    };

const noop = () => {};
const auth = (authConfig.convexUrl ? convexBetterAuthNextJs(authConfig) : {
  handler: { GET: noop, POST: noop },
  preloadAuthQuery: noop,
  isAuthenticated: noop,
  getToken: noop,
  fetchAuthQuery: noop,
  fetchAuthMutation: noop,
  fetchAuthAction: noop,
}) as any;

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = auth;
