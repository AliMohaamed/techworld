import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { resolveProductImages, resolveStorageRef } from "./products";
import { writeAuditLog } from "./lib/audit";

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

async function getActiveGovernorateOrThrow(
  ctx: { db: { get: (id: Id<"governorates">) => Promise<{ _id: Id<"governorates">; name_en: string; name_ar: string; shippingFee: number; isActive: boolean } | null> } },
  governorateId: Id<"governorates">,
) {
  const governorate = await ctx.db.get(governorateId);
  if (!governorate) {
    throw new ConvexError({ code: "GOVERNORATE_NOT_FOUND", message: "Selected governorate was not found." });
  }
  if (!governorate.isActive) {
    throw new ConvexError({ code: "GOVERNORATE_INACTIVE", message: "Selected governorate is not available for delivery." });
  }
  return governorate;
}

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

export const getCart = query({
  args: { sessionId: v.string(), promoCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId as string))
      .unique();

    if (!session) return { items: [], subtotal: 0, total: 0 };

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

    const subtotal = items.reduce((sum, item) => {
      const unitPrice = item.sku?.price || item.product?.selling_price || 0;
      return sum + unitPrice * item.quantity;
    }, 0);

    let promoDiscount = 0;
    let promoError = null;
    let promoId = undefined;
    let promoType = null;

    if (args.promoCode) {
      // Internal-ish check using the same logic as validatePromoCode query
      // (Avoiding cross-file query call if possible, or using a library function)
      // For simplicity here, we'll re-calculate or assume a bridge. 
      // In Convex, it's best to helper-ize logic used in both queries and mutations.
      // But for the sake of the task, I will implement a bridge fetch.
      const promo = await ctx.db
        .query("promo_codes")
        .withIndex("by_code", (q) => q.eq("code", args.promoCode as string))
        .unique();

      if (!promo || !promo.isActive || (promo.expiry_date && Date.now() > promo.expiry_date) || promo.current_uses >= promo.max_uses) {
        promoError = "Invalid or expired promo code";
      } else {
        const products = await Promise.all(session.items.map(item => ctx.db.get(item.productId)));
        const hasBundle = products.some(p => (p as any)?.isBundle === true);
        
        if (hasBundle) {
          promoError = "Promo code cannot be combined with bundles";
        } else {
          promoId = promo._id;
          promoType = promo.type;
          if (promo.type === "fixed") {
            promoDiscount = promo.value;
          } else if (promo.type === "percentage") {
            promoDiscount = (subtotal * promo.value) / 100;
            if (promo.max_discount_amount) {
              promoDiscount = Math.min(promoDiscount, promo.max_discount_amount);
            }
          }
        }
      }
    }

    return { 
      items, 
      subtotal, 
      promoDiscount: Math.floor(promoDiscount), 
      promoType,
      promoError,
      promoId,
      total: Math.max(0, subtotal - Math.floor(promoDiscount)) 
    };
  },
});

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

export const placeOrderFromSession = mutation({
  args: {
    sessionId: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
    governorateId: v.id("governorates"),
    promoCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId as string))
      .unique();

    if (!session || session.items.length === 0) {
      throw new ConvexError({ code: "EMPTY_CART", message: "Cannot place order with an empty cart." });
    }

    const governorate = await getActiveGovernorateOrThrow(ctx, args.governorateId);
    const shortCode = generateShortCode();
    const isBlacklisted = await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.customerPhone))
      .unique();

    let promoDoc = null;
    let promoDiscountAmount = 0;

    if (args.promoCode) {
      const promo = await ctx.db
        .query("promo_codes")
        .withIndex("by_code", (q) => q.eq("code", args.promoCode as string))
        .unique();

      if (promo && promo.isActive && (!promo.expiry_date || Date.now() <= promo.expiry_date) && promo.current_uses < promo.max_uses) {
        // Double check bundle exclusivity
        const products = await Promise.all(session.items.map(item => ctx.db.get(item.productId)));
        const hasBundle = products.some(p => (p as any)?.isBundle === true);
        
        if (!hasBundle) {
          promoDoc = promo;
          // Calculate global discount for the whole order to be split or assigned to one line
          // The schema has promo_code_id on 'orders' table (which is per-item here)
          // Since it's per-item, we calculate the subtotal first
          const subtotal = session.items.reduce((sum, item) => sum + (0), 0); // Need prices
          // Better approach: calculate per-line or store at order level if orders was a header.
          // Since TechWorld orders is per-item/SKU, we apply the discount logically.
          // Spec says "Applied mutually exclusive... one code per order".
          // We'll apply the whole discount amount to the first item for calculation record, or split it.
          // Given TW architecture, we'll store the discount applied on the line.
        }
      }
    }

    // Refetching prices for discount calculation
    const sessionItemsWithPrices = await Promise.all(session.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const sku = await ctx.db.get(item.skuId);
        const effectivePrice = sku?.price || product?.selling_price || 0;
        return { ...item, price: effectivePrice };
    }));
    const totalSubtotal = sessionItemsWithPrices.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    if (promoDoc) {
        if (promoDoc.type === "fixed") {
          promoDiscountAmount = promoDoc.value;
        } else if (promoDoc.type === "percentage") {
          promoDiscountAmount = (totalSubtotal * promoDoc.value) / 100;
          if (promoDoc.max_discount_amount) {
            promoDiscountAmount = Math.min(promoDiscountAmount, promoDoc.max_discount_amount);
          }
        }
        
        // Increment usage
        await ctx.db.patch(promoDoc._id, { current_uses: promoDoc.current_uses + 1 });
    }

    let totalDiscountAppliedSoFar = 0;
    let aggregatedTotalPrice = 0;
    let firstOrderId = null;

    for (let i = 0; i < session.items.length; i++) {
      const item = session.items[i];
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      const sku = await ctx.db.get(item.skuId);
      if (!sku) {
        throw new ConvexError({ code: "SKU_NOT_FOUND", message: `Variant not found for product: ${product.name_en}` });
      }

      if (sku.display_stock < item.quantity) {
        throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: `Insufficient stock for: ${product.name_en} (${sku.variantName})` });
      }

      await ctx.db.patch(item.skuId, {
        display_stock: sku.display_stock - item.quantity,
      });

      const effectivePrice = sku.price || product.selling_price || 0;
      const lineSubtotal = effectivePrice * item.quantity;
      
      let discountForLine = 0;
      if (totalSubtotal > 0 && promoDiscountAmount > 0) {
        if (i === session.items.length - 1) {
          discountForLine = Math.floor(promoDiscountAmount) - totalDiscountAppliedSoFar;
        } else {
          discountForLine = Math.floor((lineSubtotal / totalSubtotal) * promoDiscountAmount);
          totalDiscountAppliedSoFar += discountForLine;
        }
        // Ensure we never subtract more than the line subtotal 
        discountForLine = Math.min(discountForLine, lineSubtotal);
      }

      const orderId = await ctx.db.insert("orders", {
        sessionId: args.sessionId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerAddress: args.customerAddress,
        governorateId: args.governorateId,
        appliedShippingFee: promoDoc?.type === "free_shipping" ? 0 : governorate.shippingFee,
        productId: item.productId,
        skuId: item.skuId,
        quantity: item.quantity,
        total_price: lineSubtotal - discountForLine,
        state: isBlacklisted ? "FLAGGED_FRAUD" : "PENDING_PAYMENT_INPUT",
        shortCode,
        unit_cogs: product.cogs,
        promo_code_id: promoDoc?._id,
        promo_code_snapshot: promoDoc?.code,
        discount_applied: discountForLine,
      });

      await writeAuditLog(ctx, {
        entityId: String(orderId),
        actionType: "GUEST_ORDER_CREATED",
        changes: {
          productId: item.productId,
          skuId: item.skuId,
          variantName: sku.variantName,
          quantity: item.quantity,
          shortCode,
          customerName: args.customerName,
          governorateId: args.governorateId,
          appliedShippingFee: promoDoc?.type === "free_shipping" ? 0 : governorate.shippingFee,
          lineSubtotal,
          promoCode: args.promoCode,
          discountApplied: discountForLine,
        },
      });

      if (!firstOrderId) {
        firstOrderId = orderId;
      }
      aggregatedTotalPrice += (lineSubtotal - discountForLine);
    }

    if (!isBlacklisted && args.customerPhone && firstOrderId) {
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppMessage, {
        orderId: firstOrderId,
        shortCode: shortCode,
        customerPhone: args.customerPhone,
        customerName: args.customerName || "Customer",
        newState: "PENDING_PAYMENT_INPUT",
        totalPrice: aggregatedTotalPrice + (promoDoc?.type === "free_shipping" ? 0 : governorate.shippingFee),
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
