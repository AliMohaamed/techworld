import { QueryCtx } from "../_generated/server";
import { Permission } from "./permissions";

export async function requirePermission(
  ctx: Pick<QueryCtx, "db" | "auth">,
  permission: Permission,
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthenticated call. Please log in first.");
  }

  const identifier = identity.subject ?? null;
  const email = identity.email ?? null;

  const user =
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
      : null);

  if (!user) {
    throw new Error("User record not found. Unauthorized.");
  }

  if (!user.permissions.includes(permission)) {
    throw new Error(`Unauthorized: Requires '${permission}' permission.`);
  }

  return user;
}
