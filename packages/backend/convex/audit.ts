import { internalMutation } from "./_generated/server";
import { auditLogArgs, writeAuditLog } from "./lib/audit";

export const logAudit = internalMutation({
  args: auditLogArgs,
  handler: async (ctx, args) => {
    await writeAuditLog(ctx, args);
  },
});
