import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission } from "./lib/rbac";
import { hasPermission } from "./lib/permissions";
import { Id } from "./_generated/dataModel";

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
    await requirePermission(ctx, "VIEW_ORDERS");

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_state", (q) => q.eq("state", "AWAITING_VERIFICATION"))
      .order("desc")
      .collect();

    return Promise.all(
      orders.map(async (order) => {
        const product = await ctx.db.get(order.productId);
        const category = product ? await ctx.db.get(product.categoryId) : null;
        const receiptUrl = await getReceiptUrl(ctx, order.paymentReceiptRef);

        return {
          ...order,
          product,
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
    const category = product ? await ctx.db.get(product.categoryId) : null;
    const customer = order.userId ? await ctx.db.get(order.userId) : null;
    const receiptUrl = await getReceiptUrl(ctx, order.paymentReceiptRef);
    const viewFinancials = await canViewFinancials(ctx);
    const unitCogs = product?.cogs ?? null;
    const totalCogs = unitCogs === null ? null : unitCogs * order.quantity;
    const netMargin = totalCogs === null ? null : order.total_price - totalCogs;

    return {
      ...order,
      total_price: viewFinancials ? order.total_price : null,
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
      const product = await ctx.db.get(order.productId);
      if (!product) {
        throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
      }

      if (product.real_stock < order.quantity) {
        throw new ConvexError({ code: "OUT_OF_STOCK", message: "Product is out of stock." });
      }

      await ctx.db.patch(order.productId, {
        real_stock: product.real_stock - order.quantity,
      });
    }

    await ctx.db.patch(args.orderId, patch);

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: actor._id,
      entityId: args.orderId,
      actionType: "ORDER_STATUS_UPDATED",
      changes: {
        from: order.state,
        to: args.newState,
        manualReceiptId: args.manualReceiptId,
      },
    });

    return { success: true };
  },
});

export const createOrder = mutation({
  args: {
    productId: v.id("products"),
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

    if (product.display_stock < args.quantity) {
      throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: "Insufficient display stock available for this order." });
    }

    const newDisplayStock = product.display_stock - args.quantity;
    await ctx.db.patch(args.productId, {
      display_stock: newDisplayStock,
    });

    const orderId = await ctx.db.insert("orders", {
      userId: user._id,
      productId: args.productId,
      quantity: args.quantity,
      total_price: product.selling_price * args.quantity,
      state: "PENDING_PAYMENT_INPUT",
    });

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: user._id,
      entityId: orderId,
      actionType: "ORDER_CREATED_PENDING",
      changes: {
        productId: args.productId,
        quantity: args.quantity,
        newDisplayStock,
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

    await ctx.scheduler.runAfter(0, internal.audit.logAudit, {
      userId: await getActorUserId(ctx),
      entityId: args.orderId,
      actionType: "ORDER_PAYMENT_SUBMITTED",
      changes: { from: order.state, to: "AWAITING_VERIFICATION" },
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

export const placeOrderFromSession = mutation({
  args: {
    sessionId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session || session.items.length === 0) {
      throw new Error("Cannot place order with an empty cart");
    }

    const shortCode = generateShortCode();

    for (const item of session.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      if (product.display_stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name_en}`);
      }

      await ctx.db.patch(item.productId, {
        display_stock: product.display_stock - item.quantity,
      });

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

      await ctx.runMutation(internal.audit.logAudit, {
        entityId: args.sessionId,
        actionType: "GUEST_ORDER_CREATED",
        changes: {
          productId: item.productId,
          quantity: item.quantity,
          shortCode,
          customerName: args.customerName,
        },
      });
    }

    await ctx.db.delete(session._id);

    return shortCode;
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



