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
    throw new ConvexError({
      code: "USER_NOT_FOUND",
      message: "User record not found. Unauthorized.",
    });
  }

  if (!hasPermission(user, permission)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: `Unauthorized: Requires '${permission}' permission.`,
    });
  }

  return user;
}


