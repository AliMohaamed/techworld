export type Permission =
  | "VIEW_FINANCIALS"
  | "VERIFY_PAYMENTS"
  | "MANAGE_CATEGORIES"
  | "MANAGE_PRODUCTS"
  | "MANAGE_DISPLAY_STOCK"
  | "ADJUST_REAL_STOCK";

export async function requirePermission(ctx: { db: any, auth: any }, permission: Permission) {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Unauthenticated call. Please log in first.");
  }

  // Requires the user to be synchronized with the users table via email
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .unique();

  if (!user) {
    throw new Error("User record not found. Unauthorized.");
  }

  if (!user.permissions.includes(permission)) {
    throw new Error(`Unauthorized: Requires '${permission}' permission.`);
  }

  return user;
}
