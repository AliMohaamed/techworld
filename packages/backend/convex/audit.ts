import { query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { paginationOptsValidator } from "convex/server";

export const paginatedList = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    // Only super admins or those with VIEW_AUDIT_LOGS should see audit logs
    await requirePermission(ctx, "VIEW_AUDIT_LOGS");

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_timestamp")
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...logs,
      page: await Promise.all(
        logs.page.map(async (log) => {
          const user = log.userId ? await ctx.db.get(log.userId) : null;
          return {
            ...log,
            userName: user?.name ?? "System",
            userEmail: user?.email ?? "system@techworld.com"
          };
        })
      )
    };
  },
});
