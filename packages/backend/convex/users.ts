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

/**
 * Super Admin Seeding Mutation
 * Used to bootstrap or repair the initial staff user when the admin dashboard
 * is locked due to 'User Record Not Found'.
 */
export const createSuperAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();

    // 1. Check if a staff record already exists for this email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existingUser) {
      // 2. If it exists, ensure it has ALL permission flags
      await ctx.db.patch(existingUser._id, {
        permissions: [...permissionValues],
      });

      return {
        status: "updated",
        userId: existingUser._id,
        email: normalizedEmail,
        permissions: [...permissionValues],
      };
    }

    // 3. Otherwise, create a new record in the 'users' table
    const userId = await ctx.db.insert("users", {
      name: "Super Admin", // Default name for bootstrap
      email: normalizedEmail,
      permissions: [...permissionValues],
    });

    // 4. Log the manual bootstrap action
    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: userId,
      entityId: userId,
      actionType: "SUPER_ADMIN_BOOTSTRAP",
      changes: {
        email: normalizedEmail,
        method: "createSuperAdmin_seed",
      },
    });

    return {
      status: "created",
      userId,
      email: normalizedEmail,
      permissions: [...permissionValues],
    };
  },
});

