import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";
import { createAuth } from "./auth";
import { permissionValidators, permissionValues } from "./lib/permissions";

export const createInitialAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const existingStaffUser = await ctx.db.query("users").first();
    if (existingStaffUser) {
      throw new Error("Initial admin bootstrap is already locked. A staff user already exists.");
    }

    const auth = createAuth(ctx);
    const authContext = await auth.$context;
    const normalizedEmail = args.email.trim().toLowerCase();
    const normalizedName = args.name.trim();

    const existingAuthUser = await authContext.internalAdapter.findUserByEmail(
      normalizedEmail,
      { includeAccounts: false },
    );

    if (existingAuthUser) {
      throw new Error("An authentication user with this email already exists.");
    }

    const authUser = await authContext.internalAdapter.createUser({
      email: normalizedEmail,
      emailVerified: true,
      name: normalizedName,
    });

    const passwordHash = await authContext.password.hash(args.password);

    await authContext.internalAdapter.createAccount({
      accountId: normalizedEmail,
      password: passwordHash,
      providerId: "credential",
      userId: authUser.id,
    });

    const staffUserId = await ctx.db.insert("users", {
      name: normalizedName,
      email: normalizedEmail,
      identifier: authUser.id,
      permissions: [...permissionValues],
    });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: staffUserId,
      entityId: staffUserId,
      actionType: "CREATE_INITIAL_ADMIN",
      timestamp: Date.now(),
      changes: {
        email: normalizedEmail,
        permissions: permissionValues,
      },
    });

    return {
      email: normalizedEmail,
      permissions: permissionValues,
      userId: staffUserId,
    };
  },
});

export const updateUserPermissions = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(v.union(...permissionValidators)),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "MANAGE_USERS");

    const oldUser = await ctx.db.get(args.userId);
    if (!oldUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      permissions: args.permissions,
    });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: args.userId,
      entityId: args.userId,
      actionType: "USER_PERMISSIONS_UPDATED",
      timestamp: Date.now(),
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
    if (!identity) {
      return null;
    }

    const identifier = identity.subject ?? null;
    const email = identity.email ?? null;

    return (
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
        : null)
    );
  },
});
