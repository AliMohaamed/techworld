import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";
import { createAuth } from "./auth";
import { permissionValidators, permissionValues } from "./lib/permissions";

export const updateStaff = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_USERS");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "Staff record not found",
      });
    }

    const auth = createAuth(ctx);
    const authContext = await auth.$context;

    const updates: any = {};
    const authUpdates: any = {};

    if (args.name !== undefined) {
      const normalizedName = args.name.trim();
      updates.name = normalizedName;
      authUpdates.name = normalizedName;
    }

    if (args.email !== undefined) {
      const normalizedEmail = args.email.trim().toLowerCase();
      // Check if email is already taken by another user
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
        .unique();

      if (existingUser && existingUser._id !== args.userId) {
        throw new ConvexError({
          code: "EMAIL_TAKEN",
          message: "Email is already in use by another staff member.",
        });
      }

      updates.email = normalizedEmail;
      authUpdates.email = normalizedEmail;
    }

    // Update Convex record
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.userId, updates);
    }

    // Update Auth system if identifier exists
    if (user.identifier) {
      if (Object.keys(authUpdates).length > 0) {
        await authContext.internalAdapter.updateUser(
          user.identifier,
          authUpdates,
        );
      }

      if (args.password) {
        const passwordHash = await authContext.password.hash(args.password);
        // Find the credential account for this user
        const accounts = await authContext.internalAdapter.findAccounts(
          user.identifier,
        );
        const credentialAccount = accounts.find(
          (a) => a.providerId === "credential",
        );

        if (credentialAccount) {
          await authContext.internalAdapter.updateAccount(
            credentialAccount.id,
            {
              password: passwordHash,
              accountId: updates.email ?? user.email, // Keep accountId in sync with email
            },
          );
        }
      }
    }

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: actor._id,
      entityId: args.userId,
      actionType: "STAFF_UPDATED",
      changes: { updates, passwordChanged: !!args.password },
    });

    return { success: true };
  },
});

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
      isActive: true,
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

/**
 * Robust Bootstrap Mutation
 * Creates or updates the admin account with full permissions, regardless of existing users.
 * This is used for initial setup or recovery in production.
 */
export const bootstrapAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = createAuth(ctx);
    const authContext = await auth.$context;
    const normalizedEmail = args.email.trim().toLowerCase();
    const normalizedName = args.name.trim();

    // 1. Check if ANY user record already exists in the 'users' table
    let staffUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    // 2. Auth System Registration / Lookup
    let authUserResult = await authContext.internalAdapter.findUserByEmail(
      normalizedEmail,
      { includeAccounts: true }
    );

    const passwordHash = await authContext.password.hash(args.password);
    let authUserId: string;

    if (!authUserResult) {
      // Create new auth user
      const newAuthUser = await authContext.internalAdapter.createUser({
        email: normalizedEmail,
        emailVerified: true,
        name: normalizedName,
      });
      authUserId = newAuthUser.id;

      await authContext.internalAdapter.createAccount({
        accountId: normalizedEmail,
        password: passwordHash,
        providerId: "credential",
        userId: authUserId,
      });
    } else {
      authUserId = authUserResult.user.id;
      // Update existing auth user's password
      const accounts = authUserResult.accounts;
      const credentialAccount = accounts.find((a) => a.providerId === "credential");

      if (credentialAccount) {
        await authContext.internalAdapter.updateAccount(credentialAccount.id, {
          password: passwordHash,
          accountId: normalizedEmail,
        });
      } else {
        await authContext.internalAdapter.createAccount({
          accountId: normalizedEmail,
          password: passwordHash,
          providerId: "credential",
          userId: authUserId,
        });
      }
    }

    // 3. Convex User Record (Syncing ID if needed)
    if (staffUser) {
      await ctx.db.patch(staffUser._id, {
        name: normalizedName,
        identifier: authUserId,
        permissions: [...permissionValues],
        isActive: true,
      });
    } else {
      const newId = await ctx.db.insert("users", {
        name: normalizedName,
        email: normalizedEmail,
        identifier: authUserId,
        permissions: [...permissionValues],
        isActive: true,
      });
      staffUser = (await ctx.db.get(newId))!;
    }

    // 4. Audit Log
    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: staffUser._id,
      entityId: String(staffUser._id),
      actionType: "ADMIN_BOOTSTRAP_FORCE",
      changes: { email: normalizedEmail, permissions: permissionValues },
    });

    return {
      success: true,
      userId: staffUser._id,
      email: normalizedEmail,
    };
  },
});

export const provisionStaff = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    permissions: v.array(v.union(...permissionValidators)),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_USERS");
    const normalizedEmail = args.email.trim().toLowerCase();
    const normalizedName = args.name.trim();

    // 1. BOUND PERMISSION CHECK
    for (const permission of args.permissions) {
      if (!actor.permissions.includes(permission)) {
        throw new ConvexError({ 
          code: "PERMISSION_ESCALATION", 
          message: `You cannot grant '${permission}' because you do not have it.` 
        });
      }
    }

    // 2. AUTH SYSTEM REGISTRATION (CRITICAL UX FIX)
    const auth = createAuth(ctx);
    const authContext = await auth.$context;
    
    // Check if auth user exists
    const existingAuthUser = await authContext.internalAdapter.findUserByEmail(
      normalizedEmail,
      { includeAccounts: false }
    );
    if (existingAuthUser) {
      throw new ConvexError({ code: "USER_EXISTS", message: "An authentication user with this email already exists." });
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

    // 3. CONVEX USER RECORD
    const userId = await ctx.db.insert("users", {
      name: normalizedName,
      email: normalizedEmail,
      identifier: authUser.id,
      permissions: args.permissions,
      isActive: true,
    });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: actor._id,
      entityId: userId,
      actionType: "STAFF_PROVISIONED",
      changes: { email: normalizedEmail, permissions: args.permissions, identifier: authUser.id },
    });

    return userId;
  },
});

export const updateStaffPermissions = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(v.union(...permissionValidators)),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_USERS");

    if (actor._id === args.userId) {
      throw new ConvexError({ code: "SELF_MODIFICATION_LOCKED", message: "You cannot modify your own permissions." });
    }

    const oldUser = await ctx.db.get(args.userId);
    if (!oldUser) {
      throw new ConvexError({ code: "USER_NOT_FOUND", message: "Staff record not found" });
    }

    // ESCALATION GUARD (US3 Bound Check)
    for (const permission of args.permissions) {
      if (!actor.permissions.includes(permission)) {
        throw new ConvexError({ 
          code: "PERMISSION_ESCALATION", 
          message: `You cannot grant '${permission}' because you do not have it.` 
        });
      }
    }

    await ctx.db.patch(args.userId, {
      permissions: args.permissions,
    });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: actor._id,
      entityId: args.userId,
      actionType: "USER_PERMISSIONS_UPDATED",
      changes: {
        from: oldUser.permissions,
        to: args.permissions,
      },
    });

    return { success: true };
  },
});



export const toggleStaffStatus = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_USERS");
    
    if (actor._id === args.userId) {
      throw new ConvexError({ code: "SELF_MODIFICATION_LOCKED", message: "You cannot deactivate your own account." });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ code: "USER_NOT_FOUND", message: "Staff record not found" });
    }

    const nextIsActive = user.isActive === false; // If it was false, it'll become true. If it was true or undefined, it'll become false.
    await ctx.db.patch(args.userId, { isActive: nextIsActive });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: actor._id,
      entityId: args.userId,
      actionType: "STAFF_STATUS_TOGGLED",
      changes: { from: user.isActive ?? true, to: nextIsActive },
    });

    return { isActive: nextIsActive };
  },
});

/**
 * Migration/Repair Mutation: Ensures all staff user records have isActive: true
 * Run this from the Convex Dashboard to fix schema validation errors.
 */
export const repairStaffSchema = mutation({
  args: {},
  handler: async (ctx) => {
    // Requires a Super Admin or similar to run manually if needed
    const users = await ctx.db.query("users").collect();
    let count = 0;
    for (const user of users) {
      if (user.isActive === undefined) {
        await ctx.db.patch(user._id, { isActive: true });
        count++;
      }
    }
    return { success: true, repairedCount: count };
  },
});

export const updateUserPermissions = updateStaffPermissions;

export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_USERS");
    return await ctx.db.query("users").collect();
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
      // 2. If it exists, ensure it has ALL permission flags and is ACTIVE
      await ctx.db.patch(existingUser._id, {
        permissions: [...permissionValues],
        isActive: true,
      });

      return {
        status: "updated",
        userId: existingUser._id,
        email: normalizedEmail,
        isActive: true,
        permissions: [...permissionValues],
      };
    }

    // 3. Otherwise, create a new record in the 'users' table
    const userId = await ctx.db.insert("users", {
      name: "Super Admin", // Default name for bootstrap
      email: normalizedEmail,
      permissions: [...permissionValues],
      isActive: true,
    });

    // 4. Log the manual bootstrap action
    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: userId,
      entityId: String(userId),
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
      isActive: true,
      permissions: [...permissionValues],
    };
  },
});

