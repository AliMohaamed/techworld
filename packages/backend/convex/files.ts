import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import * as r2 from "./lib/r2";

export const generateReceiptUploadUrl = mutation({
  args: { contentType: v.string() },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "VERIFY_PAYMENTS");
    const uuid = crypto.randomUUID();
    const mimeParts = args.contentType.split("/");
    const ext = mimeParts[mimeParts.length - 1] || "bin";
    const key = `receipts/${uuid}.${ext}`;
    const uploadUrl = await r2.presignPut(key, args.contentType, 600);
    return { uploadUrl, key };
  },
});
