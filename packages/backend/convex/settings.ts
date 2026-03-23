import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";

export const getSystemConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("system_configs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
  },
});

export const listAllConfigs = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    return await ctx.db.query("system_configs").collect();
  },
});

export const updateSystemConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    
    const existing = await ctx.db
      .query("system_configs")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    const timestamp = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedAt: timestamp,
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("system_configs", {
        key: args.key,
        value: args.value,
        updatedAt: timestamp,
        updatedBy: user._id,
      });
    }

    // Log the configuration change
    await ctx.db.insert("audit_logs", {
      userId: user._id,
      entityId: args.key,
      actionType: "UPDATE_SYSTEM_CONFIG",
      timestamp,
      changes: { key: args.key, value: args.value },
    });

    return { success: true };
  },
});
