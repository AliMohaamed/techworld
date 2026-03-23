import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    code: v.string(),
    type: v.union(v.literal("fixed"), v.literal("percentage"), v.literal("free_shipping")),
    value: v.number(),
    max_discount_amount: v.optional(v.number()),
    max_uses: v.number(),
    expiry_date: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check for unique code
    const existing = await ctx.db
      .query("promo_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (existing) {
      throw new Error("Promo code already exists");
    }

    const promoCodeId = await ctx.db.insert("promo_codes", {
      ...args,
      current_uses: 0,
    });
    return promoCodeId;
  },
});

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("promo_codes").order("desc").collect();
  },
});

export const remove = mutation({
  args: { id: v.id("promo_codes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("promo_codes"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});

/**
 * Validates a promo code and returns the discount amount.
 * Internal-ish query used by checkout/cart flows.
 */
export const validatePromoCode = query({
  args: {
    code: v.string(),
    itemIds: v.array(v.id("products")),
    subtotal: v.number(),
  },
  handler: async (ctx, args) => {
    const promo = await ctx.db
      .query("promo_codes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!promo) {
      return { valid: false, error: "Invalid promo code" };
    }

    if (!promo.isActive) {
      return { valid: false, error: "Promo code is inactive" };
    }

    if (promo.current_uses >= promo.max_uses) {
      return { valid: false, error: "Promo code usage limit reached" };
    }

    if (promo.expiry_date && Date.now() > promo.expiry_date) {
      return { valid: false, error: "Promo code has expired" };
    }

    // Mutual Exclusivity Check (Phase 10 Requirement)
    // In this unified SKU architecture, we check if any product is a bundle.
    // Assuming for now we check a flag or type on the product if available.
    // For now, if we don't have a direct 'isBundle' flag, we'd need to fetch products.
    // BUT the spec says: "If any item in the cart_items is a bundle, promo_code_id cannot be applied."
    
    // Quick check on products for bundle status (placeholder logic depending on actual bundle implementation)
    // Assuming bundles might be a specific type or have a related BOM.
    // For this implementation, we will fetch the products.
    const products = await Promise.all(
      args.itemIds.map((id) => ctx.db.get(id))
    );

    const hasBundle = products.some((p) => (p as any)?.isBundle === true);
    if (hasBundle) {
      return { valid: false, error: "Promo codes cannot be used with bundles" };
    }

    let discountAmount = 0;
    if (promo.type === "fixed") {
      discountAmount = promo.value;
    } else if (promo.type === "percentage") {
      discountAmount = (args.subtotal * promo.value) / 100;
      if (promo.max_discount_amount) {
        discountAmount = Math.min(discountAmount, promo.max_discount_amount);
      }
    } else if (promo.type === "free_shipping") {
      // Logic for free shipping handled at order level by zeroing out shipping fee
      return { valid: true, promoId: promo._id, type: "free_shipping", discountAmount: 0 };
    }

    return { 
      valid: true, 
      promoId: promo._id, 
      type: promo.type, 
      discountAmount: Math.floor(discountAmount) 
    };
  },
});
