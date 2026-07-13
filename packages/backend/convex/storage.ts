import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { Id } from "./_generated/dataModel";
import { resolveRef } from "./lib/storageRef";
import * as r2 from "./lib/r2";

export const generateCatalogUploadUrl = mutation({
  args: { contentType: v.string() },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "MANAGE_PRODUCTS");
    const uuid = crypto.randomUUID();
    const key = `public/catalog/${uuid}.webp`;
    const uploadUrl = await r2.presignPut(key, args.contentType, 600);
    return { uploadUrl, key };
  },
});

/**
 * Resolves one or more storage references (either R2 keys or legacy Convex storage IDs) to serving URLs.
 * Used by the admin upload component to preview images immediately after upload.
 */
export const getStorageUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const results: Record<string, string | null> = {};
    for (const id of args.storageIds) {
      try {
        results[id] = await resolveRef(ctx, id);
      } catch {
        results[id] = null;
      }
    }
    return results;
  },
});

