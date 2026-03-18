import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requirePermission } from "./lib/rbac";

export const createOrder = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
       throw new Error("Unauthenticated. Please log in first.");
    }

    // Identify the valid user in our DB
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User profile not found. Please complete profile setup.");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
       throw new Error("Product not found");
    }

    // Decrement display_stock (virtual reservation)
    if (product.display_stock < args.quantity) {
       throw new Error("Insufficient display stock available for this order.");
    }

    const newDisplayStock = product.display_stock - args.quantity;
    await ctx.db.patch(args.productId, {
      display_stock: newDisplayStock,
    });

    // Create the order in PENDING_PAYMENT_INPUT state
    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      productId: args.productId,
      quantity: args.quantity,
      state: "PENDING_PAYMENT_INPUT",
    });

    // Audit Logging
    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: user._id,
      entityId: orderId,
      actionType: "ORDER_CREATED_PENDING",
      changes: {
        productId: args.productId,
        quantity: args.quantity,
        newDisplayStock,
        state: "PENDING_PAYMENT_INPUT"
      },
    });

    return orderId;
  },
});

// Payment input transition
export const payOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.state !== "PENDING_PAYMENT_INPUT" && order.state !== "STALLED_PAYMENT") {
      throw new Error(`Invalid transition from ${order.state}`);
    }

    await ctx.db.patch(args.orderId, { state: "AWAITING_VERIFICATION" });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: (await ctx.auth.getUserIdentity())?.subject as any,
      entityId: args.orderId,
      actionType: "ORDER_PAYMENT_SUBMITTED",
      changes: { from: order.state, to: "AWAITING_VERIFICATION" },
    });
  },
});

// Verification approval with strict -5 oversell buffer
export const verifyPayment = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "VERIFY_PAYMENTS");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.state !== "AWAITING_VERIFICATION") {
      throw new Error("Order not found or not in verification state");
    }

    const product = await ctx.db.get(order.productId);
    if (!product) throw new Error("Product not found");

    // Strict Rule: real_stock is permitted to drop up to hard limit of -5.
    const newRealStock = product.real_stock - order.quantity;
    if (newRealStock < -5) {
      throw new Error("Insufficient Stock: real_stock cannot drop below -5.");
    }

    // Atomic update of real_stock and order state to CONFIRMED
    await ctx.db.patch(order.productId, { real_stock: newRealStock });
    await ctx.db.patch(args.orderId, { state: "CONFIRMED" });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: user._id,
      entityId: args.orderId,
      actionType: "ORDER_VERIFIED",
      changes: { from: "AWAITING_VERIFICATION", to: "CONFIRMED", newRealStock },
    });
  },
});

// Verification rejection with Soft Sync mechanism
export const rejectPayment = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "VERIFY_PAYMENTS");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.state !== "AWAITING_VERIFICATION") {
      throw new Error("Order not found or not in verification state");
    }

    const product = await ctx.db.get(order.productId);
    if (!product) throw new Error("Product not found");

    // Cancel the order
    await ctx.db.patch(args.orderId, { state: "CANCELLED" });

    // SOFT SYNC RULE:
    // If display_stock drops below real_stock, sync them. 
    // We don't automatically increment display_stock.
    if (product.display_stock < product.real_stock) {
      await ctx.db.patch(order.productId, { display_stock: product.real_stock });
    }

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: user._id,
      entityId: args.orderId,
      actionType: "ORDER_REJECTED",
      changes: { 
        from: "AWAITING_VERIFICATION", 
        to: "CANCELLED",
        softSyncTriggered: product.display_stock < product.real_stock
      },
    });
  },
});

export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});
