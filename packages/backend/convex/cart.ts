import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { resolveProductImages, resolveStorageRef } from "./products";
import { writeAuditLog } from "./lib/audit";

/**
 * Resolves a SKU or throws if it is not found or belongs to a different product.
 */
async function getSkuOrThrow(
  ctx: { db: { get: (id: Id<"skus">) => Promise<{ _id: Id<"skus">; productId: Id<"products">; price: number; display_stock: number; real_stock: number; variantName: string; variantAttributes: { color?: string; size?: string; type?: string }; compareAtPrice?: number; linkedImageId?: string; isDefault?: boolean; isActive?: boolean } | null> } },
  skuId: Id<"skus">,
  productId?: Id<"products">,
) {
  const sku = await ctx.db.get(skuId);
  if (!sku) {
    throw new ConvexError({ code: "SKU_NOT_FOUND", message: "Selected variant was not found." });
  }
  if (productId && sku.productId !== productId) {
    throw new ConvexError({ code: "SKU_PRODUCT_MISMATCH", message: "SKU does not belong to this product." });
  }
  return sku;
}

/**
 * Guest-first mutation to add or update an item in the persistent shopping cart.
 * Validates quantity against the specific SKU display_stock (Unified SKU Architecture).
 */
export const addToCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    skuId: v.id("skus"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });

    // Validate against SKU-level display_stock (Unified SKU Architecture)
    const sku = await getSkuOrThrow(ctx, args.skuId, args.productId);
    if (sku.display_stock < args.quantity) {
      throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: "Insufficient display stock for the selected variant." });
    }

    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = Date.now();
    const newItem = {
      productId: args.productId,
      skuId: args.skuId,
      quantity: Math.max(1, args.quantity),
      addedAt: now,
    };

    if (session) {
      // Match on both productId AND skuId so different color variants are tracked separately
      const existingItemIndex = session.items.findIndex(
        (item) => item.productId === args.productId && item.skuId === args.skuId,
      );
      const newItems = [...session.items];

      if (existingItemIndex > -1) {
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: args.quantity,
          addedAt: now,
        };
      } else {
        newItems.push(newItem);
      }

      await ctx.db.patch(session._id, { items: newItems, lastUpdated: now });
    } else {
      await ctx.db.insert("cart_sessions", {
        sessionId: args.sessionId,
        items: [newItem],
        lastUpdated: now,
      });
    }
  },
});

/**
 * Removes a specific SKU item from the guest's persistent cart.
 */
export const removeFromCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    skuId: v.id("skus"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (session) {
      const newItems = session.items.filter(
        (item) => !(item.productId === args.productId && item.skuId === args.skuId),
      );
      await ctx.db.patch(session._id, { items: newItems, lastUpdated: Date.now() });
    }
  },
});

/**
 * Retrieves the current cart session populated with product and SKU data.
 */
export const getCart = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) return { items: [] };

    const items = await Promise.all(
      session.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const sku = await ctx.db.get(item.skuId);

        if (product) {
          const { cogs, ...publicProduct } = product;
          return {
            ...item,
            sku,
            product: {
              ...publicProduct,
              images: await resolveProductImages(ctx, publicProduct.images),
              thumbnail: await resolveStorageRef(ctx, publicProduct.thumbnail),
            },
          };
        }
        return { ...item, sku: null, product: null };
      }),
    );

    const total = items.reduce((sum, item) => {
      // Use SKU price if available, fall back to product selling_price
      const unitPrice = item.sku?.price ?? item.product?.selling_price ?? 0;
      return sum + unitPrice * item.quantity;
    }, 0);

    return { items, total };
  },
});

/**
 * Strict server-side validation of the entire cart against live SKU-level data.
 */
export const validateCart = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) return { valid: true, failedItems: [] };

    const failedItems = [];
    for (const item of session.items) {
      const product = await ctx.db.get(item.productId);

      if (!product) {
        failedItems.push({ productId: item.productId, skuId: item.skuId, reason: "NOT_FOUND" });
        continue;
      }

      const category = await ctx.db.get(product.categoryId);
      if (!category || !category.isActive) {
        failedItems.push({ productId: item.productId, skuId: item.skuId, reason: "UNAVAILABLE", details: "Category is inactive" });
        continue;
      }

      if (product.status !== "PUBLISHED") {
        failedItems.push({ productId: item.productId, skuId: item.skuId, reason: "UNAVAILABLE", details: "Product is no longer public" });
        continue;
      }

      // Validate against SKU-level display_stock
      const sku = await ctx.db.get(item.skuId);
      if (!sku) {
        failedItems.push({ productId: item.productId, skuId: item.skuId, reason: "SKU_NOT_FOUND" });
        continue;
      }

      if (sku.display_stock < item.quantity) {
        failedItems.push({
          productId: item.productId,
          skuId: item.skuId,
          reason: "INSUFFICIENT_STOCK",
          available: sku.display_stock,
        });
        continue;
      }
    }

    return { valid: failedItems.length === 0, failedItems };
  },
});

/**
 * Places guest orders from the cart session, referencing each item's specific skuId.
 * Deducts display_stock at SKU level atomically per item.
 */
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
      throw new ConvexError({ code: "EMPTY_CART", message: "Cannot place order with an empty cart." });
    }

    const shortCode = generateShortCode();

    for (const item of session.items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      const sku = await ctx.db.get(item.skuId);
      if (!sku) {
        throw new ConvexError({ code: "SKU_NOT_FOUND", message: `Variant not found for product: ${product.name_en}` });
      }

      if (sku.display_stock < item.quantity) {
        throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: `Insufficient stock for: ${product.name_en} (${sku.variantName})` });
      }

      // Deduct display_stock at SKU level
      await ctx.db.patch(item.skuId, {
        display_stock: sku.display_stock - item.quantity,
      });

      const orderId = await ctx.db.insert("orders", {
        sessionId: args.sessionId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerAddress: args.customerAddress,
        productId: item.productId,
        skuId: item.skuId,
        quantity: item.quantity,
        total_price: sku.price * item.quantity,
        state: "PENDING_PAYMENT_INPUT",
        shortCode,
      });

      await writeAuditLog(ctx, {
        entityId: orderId,
        actionType: "GUEST_ORDER_CREATED",
        changes: {
          productId: item.productId,
          skuId: item.skuId,
          variantName: sku.variantName,
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

function generateShortCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TW-${code}`;
}

/**
 * Empties the persistent cart session.
 */
export const clearCart = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }
  },
});
