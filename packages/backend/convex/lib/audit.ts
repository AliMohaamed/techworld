import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const auditLogArgs = {
  userId: v.optional(v.id("users")),
  entityId: v.string(),
  actionType: v.string(),
  changes: v.any(),
};

export type AuditLogInput = {
  userId?: Id<"users">;
  entityId: string;
  actionType: string;
  changes: unknown;
};

type AuditInsertRecord = {
  userId?: Id<"users">;
  entityId: string;
  actionType: string;
  timestamp: number;
  changes: unknown;
};

type AuditWriterCtx = {
  db: {
    insert: (table: "audit_logs", value: AuditInsertRecord) => Promise<unknown>;
  };
};

type AuditSchedulerCtx = {
  scheduler: {
    runAfter: (
      delayMs: number,
      funcRef: typeof internal.audit.logAudit,
      args: AuditLogInput,
    ) => Promise<unknown>;
  };
};

export async function writeAuditLog(ctx: AuditWriterCtx, args: AuditLogInput) {
  await ctx.db.insert("audit_logs", {
    userId: args.userId,
    entityId: args.entityId,
    actionType: args.actionType,
    timestamp: Date.now(),
    changes: args.changes,
  });
}

export async function scheduleAuditLog(ctx: AuditSchedulerCtx, args: AuditLogInput) {
  await ctx.scheduler.runAfter(0, internal.audit.logAudit, args);
}
