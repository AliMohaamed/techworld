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
      total_price: product.selling_price * args.quantity,
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

function generateShortCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TW-${code}`;
}

/**
 * Public mutation to convert a guest's cart session into one or more PENDING_PAYMENT_INPUT orders.
 * Returns the shortCode.
 */
export const placeOrderFromSession = mutation({
  args: {
    sessionId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch current cart
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session || session.items.length === 0) {
      throw new Error("Cannot place order with an empty cart");
    }

    const shortCode = generateShortCode();
    const now = Date.now();

    // 2. Process each item (Atomic in Convex)
    for (const item of session.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      // Ensure we have display stock (Virtual Reservation)
      if (product.display_stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name_en}`);
      }

      // Update product display_stock
      await ctx.db.patch(item.productId, {
        display_stock: product.display_stock - item.quantity,
      });

      // Insert order record
      await ctx.db.insert("orders", {
        sessionId: args.sessionId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerAddress: args.customerAddress,
        productId: item.productId,
        quantity: item.quantity,
        total_price: product.selling_price * item.quantity,
        state: "PENDING_PAYMENT_INPUT",
        shortCode,
      });

      // Audit Log for this line item creation
      await ctx.runMutation(internal.audit.logAudit, {
        entityId: args.sessionId,
        actionType: "GUEST_ORDER_CREATED",
        changes: {
          productId: item.productId,
          quantity: item.quantity,
          shortCode,
          customerName: args.customerName
        },
      });
    }

    // 3. Clear the cart
    await ctx.db.delete(session._id);

    return shortCode;
  },
});

/**
 * Public query to fetch all order line items for a specific shortCode.
 * Used for the Success page verification.
 */
export const getOrdersByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", args.shortCode))
      .collect();
  },
});
