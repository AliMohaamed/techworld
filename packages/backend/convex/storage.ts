import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { Id } from "./_generated/dataModel";

export const generateCatalogUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_PRODUCTS");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Resolves one or more Convex storage IDs to their serving URLs.
 * Used by the admin upload component to preview images immediately after upload.
 */
export const getStorageUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, string | null> = {};
    for (const id of args.storageIds) {
      try {
        results[id] = await ctx.storage.getUrl(id as Id<"_storage">);
      } catch {
        results[id] = null;
      }
    }
    return results;
  },
});

