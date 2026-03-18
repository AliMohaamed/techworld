import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const markStalledOrdersCron = internalMutation({
  args: {},
  handler: async (ctx) => {
    const STALL_THRESHOLD_MS = 24 * 60 * 60 * 1000;
    const thresholdTime = Date.now() - STALL_THRESHOLD_MS;

    // Find all orders in PENDING_PAYMENT_INPUT state older than 24 hours
    const staleOrders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("state"), "PENDING_PAYMENT_INPUT"))
      .filter((q) => q.lt(q.field("_creationTime"), thresholdTime))
      .collect();

    for (const order of staleOrders) {
      await ctx.db.patch(order._id, {
        state: "STALLED_PAYMENT",
      });

      // Audit transition for each stalled order
      await ctx.db.insert("audit_logs", {
        userId: undefined, // System initiated
        entityId: order._id,
        actionType: "ORDER_STALLED_BY_CRON",
        timestamp: Date.now(),
        changes: {
          prevState: "PENDING_PAYMENT_INPUT",
          newState: "STALLED_PAYMENT",
          reason: "Age > 24 hours without payment input",
        },
      });
    }

    return { stalledCount: staleOrders.length };
  },
});
