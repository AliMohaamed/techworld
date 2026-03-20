import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/rbac";
import { writeAuditLog } from "./lib/audit";

function sanitizeStock(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError({
      code: "INVALID_STOCK",
      message: `${label} must be a non-negative number.`,
    });
  }

  return value;
}

async function getSkuOrThrow(
  ctx: { db: { get: (id: Id<"skus">) => Promise<Doc<"skus"> | null> } },
  skuId: Id<"skus">,
) {
  const sku = await ctx.db.get(skuId);
  if (!sku) {
    throw new ConvexError({ code: "SKU_NOT_FOUND", message: "SKU not found." });
  }

  return sku;
}

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skus")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

export const updateSkuRealStock = mutation({
  args: {
    skuId: v.id("skus"),
    real_stock: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "ADJUST_REAL_STOCK");
    const sku = await getSkuOrThrow(ctx, args.skuId);
    const nextRealStock = sanitizeStock(args.real_stock, "Real stock");

    await ctx.db.patch(args.skuId, { real_stock: nextRealStock });
    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: args.skuId,
      actionType: "SKU_REAL_STOCK_UPDATED",
      changes: { previousRealStock: sku.real_stock, nextRealStock },
    });

    return { success: true, real_stock: nextRealStock };
  },
});

export const decrementSkuRealStock = internalMutation({
  args: {
    skuId: v.id("skus"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const sku = await getSkuOrThrow(ctx, args.skuId);
    const quantity = sanitizeStock(args.quantity, "Quantity");

    if (quantity === 0) {
      return { success: true, real_stock: sku.real_stock };
    }

    if (sku.real_stock < quantity) {
      throw new ConvexError({
        code: "OUT_OF_STOCK",
        message: "SKU does not have enough real stock for this deduction.",
      });
    }

    const nextRealStock = sku.real_stock - quantity;
    await ctx.db.patch(args.skuId, { real_stock: nextRealStock });

    await writeAuditLog(ctx, {
      entityId: args.skuId,
      actionType: "SKU_REAL_STOCK_DECREMENTED",
      changes: { previousRealStock: sku.real_stock, quantity, nextRealStock },
    });

    return { success: true, real_stock: nextRealStock };
  },
});

export const incrementSkuRealStock = internalMutation({
  args: {
    skuId: v.id("skus"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const sku = await getSkuOrThrow(ctx, args.skuId);
    const quantity = sanitizeStock(args.quantity, "Quantity");

    if (quantity === 0) {
      return { success: true, real_stock: sku.real_stock };
    }

    const nextRealStock = sku.real_stock + quantity;
    await ctx.db.patch(args.skuId, { real_stock: nextRealStock });

    await writeAuditLog(ctx, {
      entityId: args.skuId,
      actionType: "SKU_REAL_STOCK_INCREMENTED",
      changes: { previousRealStock: sku.real_stock, quantity, nextRealStock },
    });

    return { success: true, real_stock: nextRealStock };
  },
});

export const restockItem = mutation({
  args: {
    skuId: v.id("skus"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "PROCESS_RETURNS");
    const sku = await getSkuOrThrow(ctx, args.skuId);
    const quantity = sanitizeStock(args.quantity, "Restock quantity");

    if (quantity === 0) {
      return { success: true, real_stock: sku.real_stock };
    }

    const nextRealStock = sku.real_stock + quantity;
    await ctx.db.patch(args.skuId, { real_stock: nextRealStock });

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: args.skuId,
      actionType: "SKU_AD_HOC_RESTOCK",
      changes: { previousRealStock: sku.real_stock, quantity, nextRealStock },
    });

    return { success: true, real_stock: nextRealStock };
  },
});


