import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, QueryCtx } from "./_generated/server";
import { requirePermission } from "./lib/rbac";
import { hasPermission } from "./lib/permissions";
import { scheduleAuditLog, writeAuditLog } from "./lib/audit";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { orderStateValidator } from "./schema";
import { resolveRef } from "./lib/storageRef";

async function getOrderOrThrow(ctx: { db: { get: (id: Id<"orders">) => Promise<Doc<"orders"> | null> } }, orderId: Id<"orders">) {
  const order = await ctx.db.get(orderId);
  if (!order) {
    throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
  }
  return order;
}

/**
 * A checkout writes one row per SKU line, all sharing the short code; together
 * they are a single customer order. Returned oldest first.
 */
async function getOrderLines(ctx: Pick<QueryCtx, "db">, order: Doc<"orders">) {
  if (!order.shortCode) {
    return [order];
  }
  const shortCode = order.shortCode;
  return await ctx.db
    .query("orders")
    .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
    .collect();
}

async function resolveOrderLine(ctx: Pick<QueryCtx, "db">, line: Doc<"orders">) {
  const product = await ctx.db.get(line.productId);
  const sku = await ctx.db.get(line.skuId);
  const category = product ? await ctx.db.get(product.categoryId) : null;
  return {
    _id: line._id,
    productId: line.productId,
    quantity: line.quantity,
    total_price: line.total_price,
    state: line.state,
    product,
    sku,
    category,
  };
}

function sumOrderLines(lines: Doc<"orders">[]) {
  return {
    quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    total_price: lines.reduce((sum, line) => sum + line.total_price, 0),
    appliedShippingFee: lines.reduce((sum, line) => sum + (line.appliedShippingFee ?? 0), 0),
    discount_applied: lines.reduce((sum, line) => sum + (line.discount_applied ?? 0), 0),
  };
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
    return await resolveRef(ctx, receiptRef);
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

    // One entry per customer order: lines sharing a short code are merged,
    // keeping the position of the newest line.
    const groups = new Map<string, Doc<"orders">[]>();
    for (const order of orders) {
      const key = order.shortCode ?? order._id;
      const group = groups.get(key);
      if (group) {
        group.unshift(order);
      } else {
        groups.set(key, [order]);
      }
    }

    return Promise.all(
      Array.from(groups.values()).map(async (group) => {
        const order = group[0];
        const lines = await Promise.all(group.map((line) => resolveOrderLine(ctx, line)));
        const governorate = order.governorateId ? await ctx.db.get(order.governorateId) : null;
        const receiptRef = group.find((line) => line.paymentReceiptRef)?.paymentReceiptRef;
        const receiptUrl = await getReceiptUrl(ctx, receiptRef);

        return {
          ...order,
          ...sumOrderLines(group),
          lines,
          governorate,
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

    // Any line's id opens the whole customer order.
    const orderLines = await getOrderLines(ctx, order);
    const totals = sumOrderLines(orderLines);
    const resolvedLines = await Promise.all(orderLines.map((line) => resolveOrderLine(ctx, line)));
    const customer = order.userId ? await ctx.db.get(order.userId) : null;
    const governorate = order.governorateId ? await ctx.db.get(order.governorateId) : null;
    const receiptRef =
      order.paymentReceiptRef ?? orderLines.find((line) => line.paymentReceiptRef)?.paymentReceiptRef;
    const receiptUrl = await getReceiptUrl(ctx, receiptRef);
    const viewFinancials = await canViewFinancials(ctx);
    // Cost of goods is per unit on the product, profit margin computed against SKU sale price
    const unitCogs = resolvedLines.length === 1 ? (resolvedLines[0].product?.cogs ?? null) : null;
    const totalCogs = resolvedLines.some((line) => !line.product)
      ? null
      : resolvedLines.reduce((sum, line) => sum + (line.product?.cogs ?? 0) * line.quantity, 0);
    const netMargin = totalCogs === null ? null : totals.total_price - totalCogs;

    return {
      ...order,
      ...totals,
      lines: resolvedLines.map((line) => ({
        ...line,
        product: line.product
          ? {
            ...line.product,
            ...(viewFinancials ? {} : { cogs: undefined }),
          }
          : null,
      })),
      customer,
      governorate,
      receiptUrl,
      canViewFinancials: viewFinancials,
      financials: {
        unit_cogs: viewFinancials ? unitCogs : "***",
        total_cogs: viewFinancials ? totalCogs : "***",
        total_revenue: viewFinancials ? totals.total_price : "***",
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
    manualReceiptId: v.optional(v.string()),
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
      paymentReceiptRef?: string;
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
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppMessage, {
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
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppMessage, {
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

/**
 * Appends a product line to an order that was already placed, for customers
 * whose cart was split across browsers. Run from the CLI/dashboard only.
 * Limited to pre-confirmation orders, where only display_stock is reserved.
 */
export const addLineToOrder = internalMutation({
  args: {
    shortCode: v.string(),
    productId: v.id("products"),
    skuId: v.id("skus"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const shortCode = args.shortCode.trim().toUpperCase();
    const quantity = Math.floor(args.quantity);
    if (quantity <= 0) {
      throw new ConvexError({ code: "INVALID_QUANTITY", message: "Quantity must be at least 1." });
    }

    const existing = await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .first();
    if (!existing) {
      throw new ConvexError({ code: "ORDER_NOT_FOUND", message: "Order not found" });
    }
    if (existing.state !== "PENDING_PAYMENT_INPUT" && existing.state !== "AWAITING_VERIFICATION") {
      throw new ConvexError({ code: "INVALID_TRANSITION", message: `Cannot add a line to an order in state ${existing.state}` });
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found" });
    }
    const sku = await ctx.db.get(args.skuId);
    if (!sku) {
      throw new ConvexError({ code: "SKU_NOT_FOUND", message: "Selected variant not found." });
    }
    if (sku.productId !== args.productId) {
      throw new ConvexError({ code: "SKU_PRODUCT_MISMATCH", message: "Variant does not belong to this product." });
    }
    if (sku.display_stock < quantity) {
      throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: "Insufficient display stock available for this order." });
    }

    await ctx.db.patch(args.skuId, {
      display_stock: sku.display_stock - quantity,
    });

    const lineSubtotal = (sku.price || product.selling_price || 0) * quantity;

    const orderId = await ctx.db.insert("orders", {
      sessionId: existing.sessionId,
      customerName: existing.customerName,
      customerPhone: existing.customerPhone,
      customerAltPhone: existing.customerAltPhone,
      customerEmail: existing.customerEmail,
      customerAddress: existing.customerAddress,
      governorateId: existing.governorateId,
      // Shipping was already charged on the original line.
      appliedShippingFee: 0,
      productId: args.productId,
      skuId: args.skuId,
      quantity,
      total_price: lineSubtotal,
      state: existing.state,
      shortCode,
      unit_cogs: product.cogs,
      discount_applied: 0,
    });

    await writeAuditLog(ctx, {
      entityId: String(orderId),
      actionType: "ORDER_LINE_ADDED",
      changes: {
        productId: args.productId,
        skuId: args.skuId,
        variantName: sku.variantName,
        quantity,
        shortCode,
        lineSubtotal,
        state: existing.state,
      },
    });

    return orderId;
  },
});

/**
 * One-off repair for orders placed while every line of a checkout repeated the
 * full shipping fee: keeps it on the first line of each short code only.
 */
export const dedupeShippingFees = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").order("asc").collect();
    const seen = new Set<string>();
    let patched = 0;

    for (const order of orders) {
      if (!order.shortCode) continue;
      if (!seen.has(order.shortCode)) {
        seen.add(order.shortCode);
        continue;
      }
      if (!order.appliedShippingFee) continue;

      await ctx.db.patch(order._id, { appliedShippingFee: 0 });
      await writeAuditLog(ctx, {
        entityId: String(order._id),
        actionType: "ORDER_SHIPPING_FEE_DEDUPED",
        changes: { shortCode: order.shortCode, from: order.appliedShippingFee, to: 0 },
      });
      patched++;
    }

    return { patched };
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

    // The whole parcel comes back, so every shipped line of the order returns.
    const lines = (await getOrderLines(ctx, order)).filter((line) => line.state === "SHIPPED");

    for (const line of lines) {
      // Atomic Restocking: US4 Requirement
      // FR-015: "Return to Origin (RTO) or customer returns ... accurately restock the real_stock at the strict SKU level."
      await ctx.runMutation(internal.skus.incrementSkuRealStock, {
        skuId: line.skuId,
        quantity: line.quantity,
      });

      await ctx.db.patch(line._id, { state: "RTO" });

      await scheduleAuditLog(ctx, {
        userId: actor._id,
        entityId: line._id,
        actionType: "ORDER_RTO_TRIGGERED",
        changes: { from: line.state, to: "RTO", skuId: line.skuId, quantity: line.quantity },
      });
    }

    if (order.customerPhone && order.shortCode) {
      const totals = sumOrderLines(lines);
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppMessage, {
        orderId: args.orderId,
        shortCode: order.shortCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName || "Customer",
        newState: "RTO",
        totalPrice: totals.total_price + totals.appliedShippingFee,
      });
    }

    return { success: true };
  },
});

export const updateGenericStatus = mutation({
  args: {
    orderId: v.id("orders"),
    newState: orderStateValidator,
    manualReceiptId: v.optional(v.string()),
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
    const willBeDeducted = statesThatDeductStock.includes(args.newState);

    // The status belongs to the customer order, so every line moves together.
    const lines = await getOrderLines(ctx, order);

    for (const line of lines) {
      const wasDeducted = statesThatDeductStock.includes(line.state);

      if (wasDeducted && !willBeDeducted) {
        // Returning to a non-deducting state: restore stock
        await ctx.runMutation(internal.skus.incrementSkuRealStock, {
          skuId: line.skuId,
          quantity: line.quantity,
        });
      } else if (!wasDeducted && willBeDeducted) {
        // Moving to a deducting state: deduct stock, but don't block admin if stock is 0
        const sku = await ctx.db.get(line.skuId);
        if (sku) {
          const deductQty = Math.min(line.quantity, sku.real_stock);
          if (deductQty > 0) {
            await ctx.runMutation(internal.skus.decrementSkuRealStock, {
              skuId: line.skuId,
              quantity: deductQty,
            });
          }
          // If real_stock was already 0, we skip silently and let the admin proceed
        }
      }

      const patch: any = { state: args.newState };
      if (line._id === args.orderId && args.manualReceiptId !== undefined) {
        patch.paymentReceiptRef = args.manualReceiptId;
      }

      await ctx.db.patch(line._id, patch);

      await scheduleAuditLog(ctx, {
        userId: actor._id,
        entityId: line._id,
        actionType: "ORDER_STATUS_CHANGED",
        changes: {
          from: line.state,
          to: args.newState,
          manualReceiptId: line._id === args.orderId ? args.manualReceiptId : undefined,
        },
      });
    }

    if (order.customerPhone && order.shortCode) {
      const totals = sumOrderLines(lines);
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppMessage, {
        orderId: args.orderId,
        shortCode: order.shortCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName || "Customer",
        newState: args.newState,
        totalPrice: totals.total_price + totals.appliedShippingFee,
      });
    }

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


/* -------------------------------------------------------------------------- */
/*                         Public order tracking (storefront)                   */
/* -------------------------------------------------------------------------- */

function digitsOnly(value: string | undefined | null) {
  return (value ?? "").replace(/\D/g, "");
}

/** Audit action types that represent a customer-visible milestone. */
const TRACKING_ACTION_TYPES = new Set([
  "ORDER_CREATED_PENDING",
  "GUEST_ORDER_CREATED",
  "ORDER_PAYMENT_SUBMITTED",
  "ORDER_STATUS_UPDATED",
  "ORDER_STATUS_CHANGED",
  "ORDER_RTO_TRIGGERED",
  "ORDER_STALLED_BY_CRON",
]);

/**
 * Public, unauthenticated order lookup for the storefront tracking page.
 *
 * The storefront has no customer auth, so the order code alone is not a
 * sufficient credential: it is short and guessable. We require the last four
 * digits of the phone number used at checkout as a second factor and return a
 * strictly sanitised projection — never the full phone, address or COGS.
 */
export const trackOrderByCode = query({
  args: {
    shortCode: v.string(),
    phoneLast4: v.string(),
  },
  handler: async (ctx, args) => {
    const shortCode = args.shortCode.trim().toUpperCase();
    const last4 = digitsOnly(args.phoneLast4);

    if (shortCode.length < 4 || last4.length !== 4) {
      return { status: "INVALID_INPUT" as const, order: null };
    }

    const candidates = await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .collect();

    // A checkout writes one row per SKU line, all sharing the short code.
    const lines = candidates.filter((candidate) =>
      digitsOnly(candidate.customerPhone).endsWith(last4)
    );
    const order = lines[0];

    // Same response for "no such code" and "code exists, wrong phone" so the
    // endpoint cannot be used to enumerate valid order codes.
    if (!order) {
      return { status: "NOT_FOUND" as const, order: null };
    }

    const governorate = order.governorateId
      ? await ctx.db.get(order.governorateId)
      : null;

    const items = await Promise.all(
      lines.map(async (line) => {
        const product = await ctx.db.get(line.productId);
        const sku = await ctx.db.get(line.skuId);

        const thumbnailRef =
          sku?.linkedImageId ?? product?.thumbnail ?? product?.images?.[0];
        let thumbnail: string | null = null;
        if (thumbnailRef) {
          try {
            thumbnail = await resolveRef(ctx, thumbnailRef);
          } catch {
            thumbnail = null;
          }
        }

        return {
          quantity: line.quantity,
          variantName: sku?.variantName ?? null,
          product: product
            ? {
                name_en: product.name_en,
                name_ar: product.name_ar,
                slug: product.slug ?? null,
                thumbnail,
              }
            : null,
        };
      }),
    );

    const hasShippingFee = lines.some((line) => line.appliedShippingFee !== undefined);
    const discountApplied = lines.reduce((sum, line) => sum + (line.discount_applied ?? 0), 0);

    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_entityId_timestamp", (q) => q.eq("entityId", order._id))
      .order("asc")
      .collect();

    const timeline = logs
      .filter((log) => TRACKING_ACTION_TYPES.has(log.actionType))
      .map((log) => {
        const changes = (log.changes ?? {}) as { to?: string; from?: string };
        return {
          state: changes.to ?? null,
          actionType: log.actionType,
          timestamp: log.timestamp,
        };
      })
      .filter((event) => event.state !== null);

    const firstName = (order.customerName ?? "").trim().split(/\s+/)[0] ?? "";

    return {
      status: "FOUND" as const,
      order: {
        shortCode,
        state: order.state,
        placedAt: order._creationTime,
        customerFirstName: firstName,
        phoneMasked: `•••• ${last4}`,
        items,
        totalPrice: lines.reduce((sum, line) => sum + line.total_price, 0),
        shippingFee: hasShippingFee
          ? lines.reduce((sum, line) => sum + (line.appliedShippingFee ?? 0), 0)
          : null,
        discountApplied: discountApplied || null,
        promoCode: order.promo_code_snapshot ?? null,
        hasReceipt: lines.some((line) => Boolean(line.paymentReceiptRef)),
        governorate: governorate
          ? { name_en: governorate.name_en, name_ar: governorate.name_ar }
          : null,
        timeline,
      },
    };
  },
});
