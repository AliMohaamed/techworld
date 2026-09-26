import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/rbac";
import { writeAuditLog } from "./lib/audit";

const promoTypeValidator = v.union(
  v.literal("fixed"),
  v.literal("percentage"),
  v.literal("free_shipping"),
);

function normalizeCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 3) {
    throw new ConvexError({
      code: "INVALID_CODE",
      message: "Promo code must be at least 3 characters.",
    });
  }
  return normalized;
}

function assertValueForType(
  type: "fixed" | "percentage" | "free_shipping",
  value: number,
  maxDiscountAmount?: number,
) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError({
      code: "INVALID_VALUE",
      message: "Discount value must be a non-negative number.",
    });
  }

  if (type === "percentage" && value > 100) {
    throw new ConvexError({
      code: "INVALID_VALUE",
      message: "Percentage discount cannot exceed 100.",
    });
  }

  if (type !== "percentage" && maxDiscountAmount !== undefined) {
    throw new ConvexError({
      code: "INVALID_CAP",
      message: "A maximum discount cap only applies to percentage codes.",
    });
  }
}

export const create = mutation({
  args: {
    code: v.string(),
    type: promoTypeValidator,
    value: v.number(),
    max_discount_amount: v.optional(v.number()),
    max_uses: v.number(),
    expiry_date: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");

    const code = normalizeCode(args.code);
    assertValueForType(args.type, args.value, args.max_discount_amount);

    if (!Number.isFinite(args.max_uses) || args.max_uses < 1) {
      throw new ConvexError({
        code: "INVALID_MAX_USES",
        message: "Maximum uses must be at least 1.",
      });
    }

    const existing = await ctx.db
      .query("promo_codes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (existing) {
      throw new ConvexError({
        code: "DUPLICATE_CODE",
        message: "Promo code already exists.",
      });
    }

    const promoCodeId = await ctx.db.insert("promo_codes", {
      ...args,
      code,
      current_uses: 0,
    });

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: String(promoCodeId),
      actionType: "PROMO_CODE_CREATED",
      changes: {
        code,
        type: args.type,
        value: args.value,
        max_discount_amount: args.max_discount_amount,
        max_uses: args.max_uses,
        expiry_date: args.expiry_date,
        isActive: args.isActive,
      },
    });

    return promoCodeId;
  },
});

export const update = mutation({
  args: {
    id: v.id("promo_codes"),
    code: v.string(),
    type: promoTypeValidator,
    value: v.number(),
    max_discount_amount: v.optional(v.number()),
    max_uses: v.number(),
    expiry_date: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");

    const promo = await ctx.db.get(args.id);
    if (!promo) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Promo code was not found." });
    }

    const code = normalizeCode(args.code);
    assertValueForType(args.type, args.value, args.max_discount_amount);

    if (!Number.isFinite(args.max_uses) || args.max_uses < 1) {
      throw new ConvexError({
        code: "INVALID_MAX_USES",
        message: "Maximum uses must be at least 1.",
      });
    }

    // Usage is immutable history: never allow a cap below what is already spent.
    if (args.max_uses < promo.current_uses) {
      throw new ConvexError({
        code: "INVALID_MAX_USES",
        message: `Maximum uses cannot be lower than the ${promo.current_uses} redemptions already recorded.`,
      });
    }

    if (code !== promo.code) {
      const clash = await ctx.db
        .query("promo_codes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();

      if (clash) {
        throw new ConvexError({
          code: "DUPLICATE_CODE",
          message: "Another promo code already uses that code.",
        });
      }
    }

    await ctx.db.patch(args.id, {
      code,
      type: args.type,
      value: args.value,
      max_discount_amount: args.type === "percentage" ? args.max_discount_amount : undefined,
      max_uses: args.max_uses,
      expiry_date: args.expiry_date,
      isActive: args.isActive,
    });

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: String(args.id),
      actionType: "PROMO_CODE_UPDATED",
      changes: {
        before: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          max_discount_amount: promo.max_discount_amount,
          max_uses: promo.max_uses,
          expiry_date: promo.expiry_date,
          isActive: promo.isActive,
        },
        after: {
          code,
          type: args.type,
          value: args.value,
          max_discount_amount: args.max_discount_amount,
          max_uses: args.max_uses,
          expiry_date: args.expiry_date,
          isActive: args.isActive,
        },
      },
    });

    return args.id;
  },
});

export const list = query({
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    return await ctx.db.query("promo_codes").order("desc").collect();
  },
});

export const remove = mutation({
  args: { id: v.id("promo_codes") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");

    const promo = await ctx.db.get(args.id);
    if (!promo) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Promo code was not found." });
    }

    await ctx.db.delete(args.id);

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: String(args.id),
      actionType: "PROMO_CODE_DELETED",
      changes: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        current_uses: promo.current_uses,
      },
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("promo_codes"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");

    const promo = await ctx.db.get(args.id);
    if (!promo) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Promo code was not found." });
    }

    await ctx.db.patch(args.id, { isActive: args.isActive });

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: String(args.id),
      actionType: args.isActive ? "PROMO_CODE_ACTIVATED" : "PROMO_CODE_DEACTIVATED",
      changes: { code: promo.code, previousStatus: promo.isActive, newStatus: args.isActive },
    });
  },
});

/**
 * Public validation used by the storefront cart and checkout preview.
 * Mirrors the discount math applied at order placement.
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
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
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

    // Phase 10 rule: promo codes are mutually exclusive with bundle items.
    const products = await Promise.all(args.itemIds.map((id) => ctx.db.get(id)));
    const hasBundle = products.some((p) => (p as { isBundle?: boolean } | null)?.isBundle === true);
    if (hasBundle) {
      return { valid: false, error: "Promo codes cannot be used with bundles" };
    }

    if (promo.type === "free_shipping") {
      // Shipping is waived at order level; the item subtotal is untouched.
      return { valid: true, promoId: promo._id, type: "free_shipping", discountAmount: 0 };
    }

    let discountAmount = 0;
    if (promo.type === "fixed") {
      discountAmount = promo.value;
    } else {
      discountAmount = (args.subtotal * promo.value) / 100;
      if (promo.max_discount_amount) {
        discountAmount = Math.min(discountAmount, promo.max_discount_amount);
      }
    }

    // A discount can never exceed what is being paid for the items.
    discountAmount = Math.min(discountAmount, Math.max(0, args.subtotal));

    return {
      valid: true,
      promoId: promo._id,
      type: promo.type,
      discountAmount: Math.floor(discountAmount),
    };
  },
});
