import { query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { hasPermission } from "./lib/permissions";

export const dashboardMetrics = query({
  args: {
    timeWindow: v.union(
      v.literal("today"),
      v.literal("last7days"),
      v.literal("last30days")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "VIEW_ANALYTICS");
    const canViewFinancials = hasPermission(user, "VIEW_FINANCIALS");

    const now = Date.now();
    let startTime = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (args.timeWindow === "today") {
      startTime = todayStart.getTime();
    } else if (args.timeWindow === "last7days") {
      startTime = now - 7 * 24 * 60 * 60 * 1000;
    } else if (args.timeWindow === "last30days") {
      startTime = now - 30 * 24 * 60 * 60 * 1000;
    }

    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.gte(q.field("_creationTime"), startTime))
      .collect();

    // Metrics calculation
    let totalOrders = orders.length;
    let netProfit = 0;
    let totalCogs = 0;
    let courierFees = 0;
    let rtoCount = 0;
    let shippedCount = 0;
    let totalRevenue = 0;

    const statusBreakdown: Record<string, number> = {};
    const velocityMap: Record<string, number> = {};

    for (const order of orders) {
      statusBreakdown[order.state] = (statusBreakdown[order.state] || 0) + 1;
      
      totalRevenue += order.total_price;

      if (order.state === "DELIVERED") {
        if (canViewFinancials) {
          const cogs = (order.unit_cogs || 0) * order.quantity;
          totalCogs += cogs;
          netProfit += order.total_price - cogs;
        }
      }

      if (["SHIPPED", "DELIVERED", "RTO"].includes(order.state)) {
        shippedCount++;
        courierFees += order.appliedShippingFee || 0;
      }

      if (order.state === "RTO") {
        rtoCount++;
      }

      // Time Series bucket (daily or hourly)
      const d = new Date(order._creationTime);
      let key = "";
      if (args.timeWindow === "today") {
        key = `${d.getHours()}:00`;
      } else {
        key = d.toISOString().split("T")[0]; // YYYY-MM-DD
      }
      velocityMap[key] = (velocityMap[key] || 0) + 1;
    }

    const rtoRate = shippedCount > 0 ? (rtoCount / shippedCount) * 100 : 0;
    
    // Sort velocity data
    const velocityData = Object.entries(velocityMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalOrders,
      totalRevenue: canViewFinancials ? totalRevenue : null,
      netProfit: canViewFinancials ? netProfit : null,
      totalCogs: canViewFinancials ? totalCogs : null,
      courierFees,
      rtoRate,
      statusBreakdown: Object.entries(statusBreakdown).map(([name, value]) => ({ name, value })),
      velocityData,
      timeWindow: args.timeWindow,
      metadata: {
        startTime,
        endTime: now,
        isFinancialsVisible: canViewFinancials
      }
    };
  },
});
