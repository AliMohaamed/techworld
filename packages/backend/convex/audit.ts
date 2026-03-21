import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { paginationOptsValidator } from "convex/server";
import { auditLogArgs } from "./lib/audit";

export const logAudit = internalMutation({
  args: auditLogArgs,
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      userId: args.userId,
      entityId: args.entityId,
      actionType: args.actionType,
      timestamp: Date.now(),
      changes: args.changes,
    });
  },
});

export const paginatedList = query({
  args: { 
    paginationOpts: paginationOptsValidator,
    actionType: v.optional(v.string()),
    entityId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only super admins or those with VIEW_AUDIT_LOGS should see audit logs
    await requirePermission(ctx, "VIEW_AUDIT_LOGS");

    let query;

    if (args.actionType) {
      query = ctx.db
        .query("audit_logs")
        .withIndex("by_actionType_timestamp", (q) => q.eq("actionType", args.actionType as string));
    } else if (args.entityId) {
      query = ctx.db
        .query("audit_logs")
        .withIndex("by_entityId_timestamp", (q) => q.eq("entityId", args.entityId as string));
    } else {
      query = ctx.db.query("audit_logs").withIndex("by_timestamp");
    }

    const logs = await query.order("desc").paginate(args.paginationOpts);

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
