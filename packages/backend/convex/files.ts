import { mutation } from "./_generated/server";
import { requirePermission } from "./lib/rbac";

export const generateReceiptUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "VERIFY_PAYMENTS");
    return await ctx.storage.generateUploadUrl();
  },
});
