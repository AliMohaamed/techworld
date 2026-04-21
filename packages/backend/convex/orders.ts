import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requirePermission } from "./lib/rbac";
import { hasPermission } from "./lib/permissions";
import { scheduleAuditLog, writeAuditLog } from "./lib/audit";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { orderStateValidator } from "./schema";

async function getOrderOrThrow(ctx: { db: { get: (id: Id<"orders">) => Promise<Doc<"orders"> | null> } }, orderId: Id<"orders">) {
  const order = await ctx.db.get(orderId);
  if (!order) {
    throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
  }
  return order;
}

async function getActorUserId(ctx: Parameters<typeof requirePermission>[0]) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return undefined;
  }

  const identifier = identity.subject ?? null;
  const email = identity.email ?? null;

  const actor =
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

  return actor?._id;
}

async function getReceiptUrl(ctx: Pick<QueryCtx, "storage">, receiptRef: string | Id<"_storage"> | undefined) {
  if (!receiptRef) {
    return null;
  }

  try {
    return await ctx.storage.getUrl(receiptRef as Id<"_storage">);
  } catch {
    return null;
  }
}

async function canViewFinancials(ctx: Pick<QueryCtx, "db" | "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return false;
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

  return hasPermission(user, "VIEW_FINANCIALS");
}

export const listAwaitingVerificationOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    await requirePermission(ctx, "VIEW_ORDERS");

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_state", (q) => q.eq("state", "AWAITING_VERIFICATION"))
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const product = await ctx.db.get(order.productId);
        const sku = await ctx.db.get(order.skuId);
        const category = product ? await ctx.db.get(product.categoryId) : null;
        const receiptUrl = await getReceiptUrl(ctx, order.paymentReceiptRef);

        return {
          ...order,
          product,
          sku,
          category,
          receiptUrl,
        };
      }),
    );
  },
});

export const listAllOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    await requirePermission(ctx, "VIEW_ORDERS");

    const orders = await ctx.db
      .query("orders")
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const product = await ctx.db.get(order.productId);
        const sku = await ctx.db.get(order.skuId);
        const category = product ? await ctx.db.get(product.categoryId) : null;
        const receiptUrl = await getReceiptUrl(ctx, order.paymentReceiptRef);

        return {
          ...order,
          product,
          sku,
          category,
          receiptUrl,
        };
      }),
    );
  },
});

export const getOrderDetails = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "VIEW_ORDERS");

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return null;
    }

    const product = await ctx.db.get(order.productId);
    const sku = await ctx.db.get(order.skuId);
    const category = product ? await ctx.db.get(product.categoryId) : null;
    const customer = order.userId ? await ctx.db.get(order.userId) : null;
    const receiptUrl = await getReceiptUrl(ctx, order.paymentReceiptRef);
    const viewFinancials = await canViewFinancials(ctx);
    // Cost of goods is per unit on the product, profit margin computed against SKU sale price
    const unitCogs = product?.cogs ?? null;
    const totalCogs = unitCogs === null ? null : unitCogs * order.quantity;
    const netMargin = totalCogs === null ? null : order.total_price - totalCogs;

    return {
      ...order,
      sku,
      product: product
        ? {
          ...product,
          ...(viewFinancials ? {} : { cogs: undefined }),
        }
        : null,
      category,
      customer,
      receiptUrl,
      canViewFinancials: viewFinancials,
      financials: {
        unit_cogs: viewFinancials ? unitCogs : "***",
        total_cogs: viewFinancials ? totalCogs : "***",
        total_revenue: viewFinancials ? order.total_price : "***",
        net_margin: viewFinancials ? netMargin : "***",
      },
    };
  },
});

export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    newState: v.union(
      v.literal("CONFIRMED"),
      v.literal("CANCELLED"),
      v.literal("STALLED_PAYMENT"),
    ),
    manualReceiptId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const requiredPermission =
      args.newState === "CONFIRMED" ? "VERIFY_PAYMENTS" : "VIEW_ORDERS";
    const actor = await requirePermission(ctx, requiredPermission);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
    }

    if (order.state !== "AWAITING_VERIFICATION") {
      throw new ConvexError({ code: "INVALID_TRANSITION", message: `Invalid transition from ${order.state}` });
    }

    const patch: {
      state: "CONFIRMED" | "CANCELLED" | "STALLED_PAYMENT";
      paymentReceiptRef?: Id<"_storage">;
    } = {
      state: args.newState,
    };
    if (args.manualReceiptId) {
      patch.paymentReceiptRef = args.manualReceiptId;
    }

    if (args.newState === "CONFIRMED") {
      // C2 FIX: Deduct real_stock from the specific SKU, not the product root.
      // Uses the internal decrementSkuRealStock which enforces the Zero Floor guard.
      await ctx.runMutation(internal.skus.decrementSkuRealStock, {
        skuId: order.skuId,
        quantity: order.quantity,
      });
    }

    await ctx.db.patch(args.orderId, patch);

    if (order.customerPhone && order.shortCode) {
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppWebhook, {
        orderId: args.orderId,
        shortCode: order.shortCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName || "Customer",
        newState: args.newState,
        totalPrice: order.total_price,
      });
    }

    await scheduleAuditLog(ctx, {
      userId: actor._id,
      entityId: args.orderId,
      actionType: "ORDER_STATUS_UPDATED",
      changes: {
        from: order.state,
        to: args.newState,
        skuId: order.skuId,
        manualReceiptId: args.manualReceiptId,
      },
    });

    return { success: true };
  },
});

export const createOrder = mutation({
  args: {
    productId: v.id("products"),
    skuId: v.id("skus"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Unauthenticated. Please log in first." });
    }
    const email = identity.email;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      throw new ConvexError({ code: "PROFILE_NOT_FOUND", message: "User profile not found. Please complete profile setup." });
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
    }

    // Validate stock at SKU level (Unified SKU Architecture)
    const sku = await ctx.db.get(args.skuId);
    if (!sku) {
      throw new ConvexError({ code: "SKU_NOT_FOUND", message: "Selected variant not found." });
    }
    if (sku.productId !== args.productId) {
      throw new ConvexError({ code: "SKU_PRODUCT_MISMATCH", message: "Variant does not belong to this product." });
    }
    if (sku.display_stock < args.quantity) {
      throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: "Insufficient display stock available for this order." });
    }

    // Deduct display_stock at SKU level (does not touch real_stock — deferred to CONFIRMED state)
    await ctx.db.patch(args.skuId, {
      display_stock: sku.display_stock - args.quantity,
    });

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      productId: args.productId,
      skuId: args.skuId,
      quantity: args.quantity,
      total_price: sku.price * args.quantity,
      state: "PENDING_PAYMENT_INPUT",
      unit_cogs: product.cogs,
    });

    await scheduleAuditLog(ctx, {
      userId: user._id,
      entityId: orderId,
      actionType: "ORDER_CREATED_PENDING",
      changes: {
        productId: args.productId,
        skuId: args.skuId,
        variantName: sku.variantName,
        quantity: args.quantity,
        state: "PENDING_PAYMENT_INPUT",
      },
    });

    return orderId;
  },
});

export const payOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
    if (order.state !== "PENDING_PAYMENT_INPUT" && order.state !== "STALLED_PAYMENT") {
      throw new ConvexError({ code: "INVALID_TRANSITION", message: `Invalid transition from ${order.state}` });
    }

    await ctx.db.patch(args.orderId, { state: "AWAITING_VERIFICATION" });

    if (order.customerPhone && order.shortCode) {
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppWebhook, {
        orderId: args.orderId,
        shortCode: order.shortCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName || "Customer",
        newState: "AWAITING_VERIFICATION",
        totalPrice: order.total_price,
      });
    }

    await scheduleAuditLog(ctx, {
      userId: await getActorUserId(ctx),
      entityId: args.orderId,
      actionType: "ORDER_PAYMENT_SUBMITTED",
      changes: { from: order.state, to: "AWAITING_VERIFICATION" },
    });
  },
});

export const getOrdersByShortCode = query({
  args: { shortCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", args.shortCode))
      .collect();
  },
});

export const updateRto = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_SHIPPING_STATUS");

    const order = await getOrderOrThrow(ctx, args.orderId);


    if (order.state !== "SHIPPED") {
      throw new ConvexError({ 
        code: "INVALID_TRANSITION", 
        message: `Only SHIPPED orders can be marked as RTO (currently: ${order.state})` 
      });
    }

    // Atomic Restocking: US4 Requirement
    // FR-015: "Return to Origin (RTO) or customer returns ... accurately restock the real_stock at the strict SKU level."
    await ctx.runMutation(internal.skus.incrementSkuRealStock, {
      skuId: order.skuId,
      quantity: order.quantity,
    });

    await ctx.db.patch(args.orderId, { state: "RTO" });

    if (order.customerPhone && order.shortCode) {
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppWebhook, {
        orderId: args.orderId,
        shortCode: order.shortCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName || "Customer",
        newState: "RTO",
        totalPrice: order.total_price,
      });
    }

    await scheduleAuditLog(ctx, {
      userId: actor._id,
      entityId: args.orderId,
      actionType: "ORDER_RTO_TRIGGERED",
      changes: { from: order.state, to: "RTO", skuId: order.skuId, quantity: order.quantity },
    });

    return { success: true };
  },
});

export const updateGenericStatus = mutation({
  args: {
    orderId: v.id("orders"),
    newState: orderStateValidator,
    manualReceiptId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Manual override only requires VIEW_ORDERS — any admin who can see orders can override status.
    // Stock and audit safety is enforced by the handler itself.
    const actor = await requirePermission(ctx, "VIEW_ORDERS");

    const order = await getOrderOrThrow(ctx, args.orderId);
    if (!order) {
      throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
    }

    const statesThatDeductStock = ["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED", "DELIVERED"];
    const wasDeducted = statesThatDeductStock.includes(order.state);
    const willBeDeducted = statesThatDeductStock.includes(args.newState);

    if (wasDeducted && !willBeDeducted) {
      // Returning to a non-deducting state: restore stock
      await ctx.runMutation(internal.skus.incrementSkuRealStock, {
        skuId: order.skuId,
        quantity: order.quantity,
      });
    } else if (!wasDeducted && willBeDeducted) {
      // Moving to a deducting state: deduct stock, but don't block admin if stock is 0
      const sku = await ctx.db.get(order.skuId);
      if (sku) {
        const deductQty = Math.min(order.quantity, sku.real_stock);
        if (deductQty > 0) {
          await ctx.runMutation(internal.skus.decrementSkuRealStock, {
            skuId: order.skuId,
            quantity: deductQty,
          });
        }
        // If real_stock was already 0, we skip silently and let the admin proceed
      }
    }

    const patch: any = { state: args.newState };
    if (args.manualReceiptId !== undefined) {
      patch.paymentReceiptRef = args.manualReceiptId;
    }

    await ctx.db.patch(args.orderId, patch);

    if (order.customerPhone && order.shortCode) {
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppWebhook, {
        orderId: args.orderId,
        shortCode: order.shortCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName || "Customer",
        newState: args.newState,
        totalPrice: order.total_price,
      });
    }

    await scheduleAuditLog(ctx, {
      userId: actor._id,
      entityId: args.orderId,
      actionType: "ORDER_STATUS_CHANGED",
      changes: { 
        from: order.state, 
        to: args.newState,
        manualReceiptId: args.manualReceiptId,
      },
    });

    return { success: true };
  },
});

export const getOrderStats = query({
  args: {
    fromTimestamp: v.optional(v.number()),
    toTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "VIEW_ORDERS");

    const orders = await ctx.db.query("orders").collect();

    let filteredOrders = orders;
    if (args.fromTimestamp !== undefined) {
      filteredOrders = filteredOrders.filter(o => o._creationTime >= (args.fromTimestamp as number));
    }
    if (args.toTimestamp !== undefined) {
      filteredOrders = filteredOrders.filter(o => o._creationTime <= (args.toTimestamp as number));
    }

    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total_price + (o.appliedShippingFee || 0), 0);
    const totalProductsSold = filteredOrders.reduce((acc, o) => acc + o.quantity, 0);
    const deliveredOrders = filteredOrders.filter(o => o.state === "DELIVERED").length;
    const deliveryRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      totalRevenue,
      totalProductsSold,
      deliveryRate,
    };
  },
});

