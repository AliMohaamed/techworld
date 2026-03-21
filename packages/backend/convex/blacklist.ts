import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";

export const listBlacklist = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    return await ctx.db.query("blacklist").collect();
  },
});

export const getByPhone = query({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .unique();
  },
});

export const addToBlacklist = mutation({
  args: {
    phoneNumber: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    
    const existing = await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .unique();

    if (existing) {
      return { success: false, error: "Phone number already blacklisted" };
    }

    const timestamp = Date.now();
    await ctx.db.insert("blacklist", {
      phoneNumber: args.phoneNumber,
      reason: args.reason,
      addedBy: user._id,
      addedAt: timestamp,
    });

    // Log the addition to the blacklist
    await ctx.db.insert("audit_logs", {
      userId: user._id,
      entityId: args.phoneNumber,
      actionType: "ADD_TO_BLACKLIST",
      timestamp,
      changes: { phoneNumber: args.phoneNumber, reason: args.reason },
    });

    return { success: true };
  },
});

export const removeFromBlacklist = mutation({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    
    const existing = await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .unique();

    if (!existing) {
      return { success: false, error: "Phone number not found in blacklist" };
    }

    const timestamp = Date.now();
    await ctx.db.delete(existing._id);

    // Log the removal from the blacklist
    await ctx.db.insert("audit_logs", {
      userId: user._id,
      entityId: args.phoneNumber,
      actionType: "REMOVE_FROM_BLACKLIST",
      timestamp,
      changes: { phoneNumber: args.phoneNumber },
    });

    return { success: true };
  },
});
