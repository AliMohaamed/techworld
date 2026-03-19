import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const logAudit = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    entityId: v.string(),
    actionType: v.string(),
    changes: v.any(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.insert("audit_logs", {
      userId: args.userId,
      entityId: args.entityId,
      actionType: args.actionType,
      timestamp: Date.now(),
      changes: args.changes,
    });
  },
});
