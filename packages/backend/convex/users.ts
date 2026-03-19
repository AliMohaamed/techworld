import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";

export const updateUserPermissions = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(v.union(v.literal("VIEW_FINANCIALS"), v.literal("VERIFY_PAYMENTS"))),
  },
  handler: async (ctx, args) => {
    // Only admins (or those with a specific permission if defined) can update permissions
    // For now, we'll require VERIFY_PAYMENTS as a proxy for admin-level actions or 
    // simply rely on the fact that this is an administrative mutation.
    // In a real scenario, we might have an 'ADMIN' permission.
    await requirePermission(ctx, "VERIFY_PAYMENTS");

    const oldUser = await ctx.db.get(args.userId);
    if (!oldUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      permissions: args.permissions,
    });

    // Log the audit record
    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: (await ctx.auth.getUserIdentity())?.subject as any, // ID of the person making the change
      entityId: args.userId,
      actionType: "USER_PERMISSIONS_UPDATED",
      changes: {
        before: oldUser.permissions,
        after: args.permissions,
      },
    });

    return { success: true };
  },
});

export const getUserPermissions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user.permissions;
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();
  },
});
