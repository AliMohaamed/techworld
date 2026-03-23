import { ConvexError } from "convex/values";
import { QueryCtx } from "../_generated/server";
import { hasPermission, Permission } from "./permissions";

export async function requirePermission(
  ctx: Pick<QueryCtx, "db" | "auth">,
  permission: Permission,
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Unauthenticated call. Please log in first.",
    });
  }

  const identifier = identity.subject ?? null;
  const email = identity.email ?? null;

  // 1. Try Lookup by Identifier (High Confidence)
  let user = identifier
    ? await ctx.db
        .query("users")
        .withIndex("by_identifier", (q) => q.eq("identifier", identifier))
        .unique()
    : null;

  // 2. Fallback to Email if identifier record is missing OR has no permissions
  if (!user || user.permissions.length === 0) {
    const emailUser = email
      ? await ctx.db
          .query("users")
          .withIndex("by_email", (q) => q.eq("email", email))
          .unique()
      : null;
    
    // If email record has more permissions, prefer it (Legacy Repair)
    if (emailUser && (emailUser.permissions.length > 0)) {
      user = emailUser;
      // We can only patch the identifier during a mutation, so we skip it here
      // Admin dashboard bootstrap repairs this during login/createSuperAdmin.
    }
  }

  if (!user) {
    throw new ConvexError({
      code: "USER_NOT_FOUND",
      message: `User record not found for identity ${email ?? identifier}. Admin access must be provisioned.`,
    });
  }

  if ((user as any).isActive === false) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Access Denied: Your staff account has been deactivated.",
    });
  }

  if (!hasPermission(user, permission)) {
    console.error(`[RBAC] Permission Missing: ${permission}`);
    console.error(`[RBAC] User: ${user.email} (ID: ${user._id})`);
    console.error(`[RBAC] User Permissions: ${JSON.stringify(user.permissions)}`);
    
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Unauthorized: Your account lacks the required '${permission}' permission.`,
    });
  }

  return user;
}


