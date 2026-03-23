import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3001";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  });
};

async function getSafeAuthUser(ctx: Parameters<typeof authComponent.getAuthUser>[0]) {
  try {
    return await authComponent.getAuthUser(ctx);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unauthenticated")) {
      return null;
    }
    throw error;
  }
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return getSafeAuthUser(ctx);
  },
});

export const getCurrentStaffProfile = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getSafeAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const identifier = authUser.userId ?? undefined;
    const email = authUser.email ?? undefined;

    const staffUser =
      (identifier
        ? await ctx.db
            .query("users")
            .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
            .unique()
        : null) ??
      (email
        ? await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", email))
            .unique()
        : null);

    return {
      authUser,
      staffUser,
      permissions: staffUser?.permissions ?? [],
    };
  },
});
