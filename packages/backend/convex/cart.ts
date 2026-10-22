import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { resolveProductImages, resolveStorageRef } from "./products";
import { writeAuditLog } from "./lib/audit";
import { META_CURRENCY, purchaseEventId, purchaseTotals, queueMetaPurchase } from "./lib/metaConversions";
import { metaAttributionValidator } from "./schema";
import { toPublicSku } from "./lib/publicSku";

function normalizePromoCode(code: string) {
  return code.trim().toUpperCase();
}

type MetaAttribution = typeof metaAttributionValidator.type;

/** The values come from the shopper's browser, so keep only well-formed, bounded ones. */
function sanitizeMetaAttribution(input: MetaAttribution | undefined): MetaAttribution | undefined {
  if (!input) return undefined;
  const fbCookie = (value?: string) =>
    value && value.length <= 500 && /^fb\.\d\.\d+\.\S+$/.test(value) ? value : undefined;
  const attribution: MetaAttribution = {
    fbp: fbCookie(input.fbp),
    fbc: fbCookie(input.fbc),
    clientUserAgent: input.clientUserAgent?.slice(0, 512) || undefined,
    // IPv4 or IPv6 characters only; Meta validates the address itself.
    clientIpAddress:
      input.clientIpAddress && /^[0-9a-fA-F.:]{3,45}$/.test(input.clientIpAddress)
        ? input.clientIpAddress
        : undefined,
    eventSourceUrl:
      input.eventSourceUrl && /^https?:\/\//.test(input.eventSourceUrl)
        ? input.eventSourceUrl.slice(0, 2048)
        : undefined,
  };
  return Object.values(attribution).some(Boolean) ? attribution : undefined;
}

type PromoDoc = {
  type: "fixed" | "percentage" | "free_shipping";
  value: number;
  max_discount_amount?: number;
};

/**
 * Single source of truth for promo maths, shared by the cart preview and
 * order placement. Never returns more than the item subtotal.
 */
function calculatePromoDiscount(promo: PromoDoc, subtotal: number) {
  if (promo.type === "free_shipping") {
    // Waived at order level via appliedShippingFee; items are untouched.
    return 0;
  }

  let discount =
    promo.type === "fixed" ? promo.value : (subtotal * promo.value) / 100;

  if (promo.type === "percentage" && promo.max_discount_amount) {
    discount = Math.min(discount, promo.max_discount_amount);
  }

  return Math.floor(Math.min(discount, Math.max(0, subtotal)));
}

async function getSkuOrThrow(
  ctx: { db: { get: (id: Id<"skus">) => Promise<{ _id: Id<"skus">; productId: Id<"products">; price: number; real_stock: number; variantName: string; variantAttributes: { color?: string; size?: string; type?: string }; compareAtPrice?: number; linkedImageId?: string; isDefault?: boolean; isActive?: boolean } | null> } },
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
    if (sku.real_stock < args.quantity) {
      throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: "Insufficient stock for the selected variant." });
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

export const addItemsToCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    items: v.array(
      v.object({
        skuId: v.id("skus"),
        quantity: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });

    const requested = new Map<Id<"skus">, number>();
    for (const item of args.items) {
      const quantity = Math.floor(item.quantity);
      if (quantity <= 0) continue;
      requested.set(item.skuId, (requested.get(item.skuId) ?? 0) + quantity);
    }
    if (requested.size === 0) {
      throw new ConvexError({ code: "EMPTY_SELECTION", message: "No variants were selected." });
    }

    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = Date.now();
    const newItems = session ? [...session.items] : [];

    for (const [skuId, quantity] of requested) {
      const sku = await getSkuOrThrow(ctx, skuId, args.productId);
      const existingItemIndex = newItems.findIndex(
        (item) => item.productId === args.productId && item.skuId === skuId,
      );
      const existingQuantity = existingItemIndex > -1 ? newItems[existingItemIndex].quantity : 0;
      const nextQuantity = existingQuantity + quantity;

      if (sku.real_stock < nextQuantity) {
        throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: "Insufficient stock for the selected variant." });
      }

      if (existingItemIndex > -1) {
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: nextQuantity,
          addedAt: now,
        };
      } else {
        newItems.push({
          productId: args.productId,
          skuId,
          quantity: nextQuantity,
          addedAt: now,
        });
      }
    }

    if (session) {
      await ctx.db.patch(session._id, { items: newItems, lastUpdated: now });
    } else {
      await ctx.db.insert("cart_sessions", {
        sessionId: args.sessionId,
        items: newItems,
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
            sku: sku ? toPublicSku(sku) : null,
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
      // Mirrors promoCodes.validatePromoCode so the cart preview and the
      // discount actually written at placement can never disagree.
      const promo = await ctx.db
        .query("promo_codes")
        .withIndex("by_code", (q) => q.eq("code", normalizePromoCode(args.promoCode as string)))
        .unique();

      if (!promo || !promo.isActive || (promo.expiry_date && Date.now() > promo.expiry_date) || promo.current_uses >= promo.max_uses) {
        promoError = "Invalid or expired promo code";
      } else {
        const products = await Promise.all(session.items.map(item => ctx.db.get(item.productId)));
        const hasBundle = products.some(p => (p as { isBundle?: boolean } | null)?.isBundle === true);

        if (hasBundle) {
          promoError = "Promo code cannot be combined with bundles";
        } else {
          promoId = promo._id;
          promoType = promo.type;
          promoDiscount = calculatePromoDiscount(promo, subtotal);
        }
      }
    }

    return {
      items,
      subtotal,
      promoDiscount,
      promoType,
      promoError,
      promoId,
      total: Math.max(0, subtotal - promoDiscount)
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

      if (sku.real_stock < item.quantity) {
        failedItems.push({
          productId: item.productId,
          skuId: item.skuId,
          reason: "INSUFFICIENT_STOCK",
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
    customerAltPhone: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerAddress: v.string(),
    buildingNumber: v.string(),
    floorNumber: v.string(),
    apartmentNumber: v.string(),
    governorateId: v.id("governorates"),
    promoCode: v.optional(v.string()),
    metaAttribution: v.optional(metaAttributionValidator),
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

    const customerAltPhone = args.customerAltPhone?.trim() || undefined;
    const customerEmail = args.customerEmail?.trim().toLowerCase() || undefined;
    if (customerEmail && (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
      throw new ConvexError({ code: "INVALID_EMAIL", message: "Invalid email address." });
    }
    if (customerAltPhone && !/^01[0125]\d{8}$/.test(customerAltPhone)) {
      throw new ConvexError({ code: "INVALID_PHONE", message: "Invalid additional phone number." });
    }
    const buildingNumber = args.buildingNumber.trim();
    const floorNumber = args.floorNumber.trim();
    const apartmentNumber = args.apartmentNumber.trim();
    for (const part of [buildingNumber, floorNumber, apartmentNumber]) {
      if (!part || part.length > 20) {
        throw new ConvexError({ code: "INVALID_ADDRESS", message: "Building, floor and apartment numbers are required." });
      }
    }

    const shortCode = generateShortCode();
    const metaAttribution = sanitizeMetaAttribution(args.metaAttribution);
    const isBlacklisted = await ctx.db
      .query("blacklist")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.customerPhone))
      .unique();

    let promoDoc = null;
    let promoDiscountAmount = 0;

    if (args.promoCode) {
      const promo = await ctx.db
        .query("promo_codes")
        .withIndex("by_code", (q) => q.eq("code", normalizePromoCode(args.promoCode as string)))
        .unique();

      if (promo && promo.isActive && (!promo.expiry_date || Date.now() <= promo.expiry_date) && promo.current_uses < promo.max_uses) {
        // Bundle exclusivity is re-checked here: the cart may have changed
        // since the storefront previewed the discount.
        const products = await Promise.all(session.items.map(item => ctx.db.get(item.productId)));
        const hasBundle = products.some(p => (p as { isBundle?: boolean } | null)?.isBundle === true);

        if (!hasBundle) {
          promoDoc = promo;
        }
      }
    }

    // Prices are re-read from the DB rather than trusted from the client.
    const sessionItemsWithPrices = await Promise.all(session.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        const sku = await ctx.db.get(item.skuId);
        const effectivePrice = sku?.price || product?.selling_price || 0;
        return { ...item, price: effectivePrice };
    }));
    const totalSubtotal = sessionItemsWithPrices.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    if (promoDoc) {
        // TechWorld orders are one row per SKU line, so the order-level
        // discount is computed once here and then split across the lines below.
        promoDiscountAmount = calculatePromoDiscount(promoDoc, totalSubtotal);
        await ctx.db.patch(promoDoc._id, { current_uses: promoDoc.current_uses + 1 });
    }

    const orderShippingFee = promoDoc?.type === "free_shipping" ? 0 : governorate.shippingFee;

    let totalDiscountAppliedSoFar = 0;
    let aggregatedTotalPrice = 0;
    let firstOrderId: Id<"orders"> | null = null;

    for (let i = 0; i < session.items.length; i++) {
      const item = session.items[i];
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      const sku = await ctx.db.get(item.skuId);
      if (!sku) {
        throw new ConvexError({ code: "SKU_NOT_FOUND", message: `Variant not found for product: ${product.name_en}` });
      }

      // Stock is checked here but only deducted once the order is CONFIRMED.
      if (sku.real_stock < item.quantity) {
        throw new ConvexError({ code: "INSUFFICIENT_STOCK", message: `Insufficient stock for: ${product.name_en} (${sku.variantName})` });
      }

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

      // Shipping is charged once per checkout, so only the first line carries
      // it; repeating it on every line double-counts revenue and courier fees.
      const lineShippingFee: number = firstOrderId ? 0 : orderShippingFee;

      const orderId = await ctx.db.insert("orders", {
        sessionId: args.sessionId,
        customerName: args.customerName,
        customerPhone: args.customerPhone,
        customerAltPhone,
        customerEmail,
        customerAddress: args.customerAddress,
        buildingNumber,
        floorNumber,
        apartmentNumber,
        governorateId: args.governorateId,
        appliedShippingFee: lineShippingFee,
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
        metaAttribution,
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
          appliedShippingFee: lineShippingFee,
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

    // Server half of the Purchase; the success page sends the browser half with
    // the same event id, so Meta deduplicates them.
    const lines = await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
      .collect();
    if (lines.length > 0) {
      await queueMetaPurchase(ctx, { order: lines[0], lines });
    }

    if (!isBlacklisted && args.customerPhone && firstOrderId) {
      ctx.scheduler.runAfter(0, internal.webhooks.dispatchWhatsAppMessage, {
        orderId: firstOrderId,
        shortCode: shortCode,
        customerPhone: args.customerPhone,
        customerName: args.customerName || "Customer",
        newState: "PENDING_PAYMENT_INPUT",
        totalPrice: aggregatedTotalPrice + orderShippingFee,
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

/**
 * What the storefront's success page reports as the browser Purchase. Read from
 * the stored order lines through purchaseTotals(), the same numbers the
 * Conversions API sends, and only for the browser session that placed the order.
 */
export const getPurchaseSummary = query({
  args: { sessionId: v.string(), shortCode: v.string() },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", args.shortCode.trim().toUpperCase()))
      .collect();
    if (lines.length === 0 || lines.some((line) => line.sessionId !== args.sessionId)) {
      return null;
    }
    const { value, contents } = purchaseTotals(lines);
    return { eventId: purchaseEventId(lines[0]), value, currency: META_CURRENCY, contents };
  },
});
