import { mutation } from "./_generated/server";
import { requirePermission } from "./lib/rbac";

export const generateCatalogUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_PRODUCTS");
    return await ctx.storage.generateUploadUrl();
  },
});
