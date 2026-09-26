import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requirePermission } from "./lib/rbac";
import { writeAuditLog } from "./lib/audit";
import { Id } from "./_generated/dataModel";
import { ratingSummaryOf } from "./lib/ratings";
import { resolveProductImages, resolveStorageRef } from "./products";

/**
 * Offers = product-level sale pricing.
 *
 * `compareAtPrice` holds the original (struck-through) price while the live
 * `selling_price` / sku `price` holds the discounted one. A product is "on
 * offer" when compareAtPrice exceeds the effective price, either at the product
 * root or on any of its SKUs.
 */

type PricePair = { price: number; compareAtPrice?: number };

export function discountPercentOf({ price, compareAtPrice }: PricePair) {
  if (compareAtPrice === undefined || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

async function getProductSkus(ctx: Pick<QueryCtx, "db">, productId: Id<"products">) {
  return await ctx.db
    .query("skus")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();
}

/** Resolves the deepest discount across a product root and its sellable SKUs. */
function summarizeOffer(
  product: { selling_price: number; compareAtPrice?: number },
  skus: Array<{ price: number; compareAtPrice?: number; isActive?: boolean }>,
) {
  const candidates: PricePair[] = [
    { price: product.selling_price, compareAtPrice: product.compareAtPrice },
    ...skus
      .filter((sku) => sku.isActive !== false)
      .map((sku) => ({ price: sku.price, compareAtPrice: sku.compareAtPrice })),
  ];

  let best = {
    discountPercent: 0,
    savings: 0,
    price: product.selling_price,
    compareAtPrice: undefined as number | undefined,
  };

  for (const candidate of candidates) {
    const discountPercent = discountPercentOf(candidate);
    if (discountPercent > best.discountPercent) {
      best = {
        discountPercent,
        savings: (candidate.compareAtPrice ?? candidate.price) - candidate.price,
        price: candidate.price,
        compareAtPrice: candidate.compareAtPrice,
      };
    }
  }

  return best;
}

/**
 * Public storefront query powering /deals. Returns published products in active
 * categories that currently carry a discount.
 */
export const listDeals = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    sort: v.optional(
      v.union(
        v.literal("discount_desc"),
        v.literal("price_asc"),
        v.literal("price_desc"),
        v.literal("newest"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const categoryById = new Map(activeCategories.map((c) => [c._id, c]));

    const publishedProducts = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    const scoped = publishedProducts.filter(
      (p) =>
        categoryById.has(p.categoryId) &&
        (args.categoryId === undefined || p.categoryId === args.categoryId),
    );

    const discounted = [];
    for (const product of scoped) {
      const skus = await getProductSkus(ctx, product._id);
      const offer = summarizeOffer(product, skus);
      if (offer.discountPercent <= 0) continue;
      discounted.push({ product, skus, offer });
    }

    const withOffers = await Promise.all(
      discounted.map(async ({ product, skus, offer }) => {
        const category = categoryById.get(product.categoryId);
        const inStock = skus.some((sku) => sku.isActive !== false && sku.display_stock > 0);

        return {
          _id: product._id,
          _creationTime: product._creationTime,
          name_ar: product.name_ar,
          name_en: product.name_en,
          description_ar: product.description_ar,
          description_en: product.description_en,
          selling_price: product.selling_price,
          compareAtPrice: product.compareAtPrice,
          slug: product.slug,
          categoryId: product.categoryId,
          categoryName: category?.name_en ?? "UNKNOWN",
          categoryName_ar: category?.name_ar ?? "",
          categorySlug: category?.slug,
          thumbnail: await resolveStorageRef(ctx, product.thumbnail),
          images: await resolveProductImages(ctx, product.images),
          skus: await Promise.all(
            skus.map(async (sku) => ({
              ...sku,
              linkedImageId: await resolveStorageRef(ctx, sku.linkedImageId),
            })),
          ),
          discountPercent: offer.discountPercent,
          savings: offer.savings,
          effectivePrice: offer.price,
          inStock,
          isFeatured: product.isFeatured,
          ...ratingSummaryOf(product),
        };
      }),
    );

    const sort = args.sort ?? "discount_desc";
    withOffers.sort((a, b) => {
      // Sold-out deals always sink to the bottom regardless of the chosen sort.
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      switch (sort) {
        case "price_asc":
          return a.effectivePrice - b.effectivePrice;
        case "price_desc":
          return b.effectivePrice - a.effectivePrice;
        case "newest":
          return b._creationTime - a._creationTime;
        default:
          return b.discountPercent - a.discountPercent;
      }
    });

    const items = args.limit ? withOffers.slice(0, args.limit) : withOffers;

    return {
      items,
      total: withOffers.length,
      categories: activeCategories
        .filter((c) => withOffers.some((p) => p.categoryId === c._id))
        .map((c) => ({ _id: c._id, name_en: c.name_en, name_ar: c.name_ar, slug: c.slug })),
      maxDiscountPercent: withOffers.reduce((max, p) => Math.max(max, p.discountPercent), 0),
    };
  },
});

/** Admin offers board: every product with its current offer state plus rollups. */
export const listOffersAdmin = query({
  args: { onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "MANAGE_PRODUCTS");

    const products = await ctx.db.query("products").collect();
    const categories = await ctx.db.query("categories").collect();
    const categoryById = new Map(categories.map((c) => [c._id, c]));

    const scoped = [];
    for (const product of products) {
      const skus = await getProductSkus(ctx, product._id);
      const offer = summarizeOffer(product, skus);
      if (args.onlyActive && offer.discountPercent <= 0) continue;
      scoped.push({ product, skus, offer });
    }

    const rows = await Promise.all(
      scoped.map(async ({ product, skus, offer }) => {
        const category = categoryById.get(product.categoryId);

        return {
          _id: product._id,
          name_en: product.name_en,
          name_ar: product.name_ar,
          slug: product.slug,
          status: product.status,
          selling_price: product.selling_price,
          compareAtPrice: product.compareAtPrice,
          thumbnail: await resolveStorageRef(ctx, product.thumbnail),
          categoryId: product.categoryId,
          categoryName_en: category?.name_en ?? "UNKNOWN",
          categoryName_ar: category?.name_ar ?? "",
          categoryActive: category?.isActive ?? false,
          discountPercent: offer.discountPercent,
          savings: offer.savings,
          variantCount: skus.length,
          discountedVariantCount: skus.filter((sku) => discountPercentOf(sku) > 0).length,
          totalDisplayStock: skus.reduce((sum, sku) => sum + sku.display_stock, 0),
          isOnOffer: offer.discountPercent > 0,
        };
      }),
    );

    rows.sort(
      (a, b) => b.discountPercent - a.discountPercent || a.name_en.localeCompare(b.name_en),
    );

    const active = rows.filter((r) => r.isOnOffer);
    const live = active.filter((r) => r.status === "PUBLISHED" && r.categoryActive);

    return {
      rows,
      stats: {
        totalProducts: rows.length,
        activeOffers: active.length,
        liveOffers: live.length,
        deepestDiscount: active.reduce((max, r) => Math.max(max, r.discountPercent), 0),
        averageDiscount: active.length
          ? Math.round(active.reduce((sum, r) => sum + r.discountPercent, 0) / active.length)
          : 0,
      },
    };
  },
});

function roundPrice(value: number) {
  return Math.max(0, Math.round(value));
}

function assertDiscountPercent(discountPercent: number) {
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
    throw new ConvexError({
      code: "INVALID_DISCOUNT",
      message: "Discount must be greater than 0 and less than 100 percent.",
    });
  }
}

/**
 * Puts a product on offer: the original price becomes `compareAtPrice` and the
 * discounted price becomes the live price. Cascades to variants by default so
 * the PDP, cards and cart all agree on the sale price.
 */
export const setProductOffer = mutation({
  args: {
    productId: v.id("products"),
    discountPercent: v.number(),
    applyToVariants: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");
    assertDiscountPercent(args.discountPercent);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product was not found." });
    }

    const applyToVariants = args.applyToVariants ?? true;
    const factor = 1 - args.discountPercent / 100;

    // Anchor on the original price so re-pricing a live offer never compounds
    // the discount off an already-reduced price.
    const anchor =
      product.compareAtPrice && product.compareAtPrice > product.selling_price
        ? product.compareAtPrice
        : product.selling_price;
    const nextPrice = roundPrice(anchor * factor);

    if (nextPrice >= anchor) {
      throw new ConvexError({
        code: "INVALID_DISCOUNT",
        message: "Discount is too small to change the price at this price point.",
      });
    }

    await ctx.db.patch(args.productId, { selling_price: nextPrice, compareAtPrice: anchor });

    const variantChanges: Array<{
      skuId: Id<"skus">;
      from: number;
      to: number;
      compareAt: number;
    }> = [];

    if (applyToVariants) {
      const skus = await getProductSkus(ctx, args.productId);
      for (const sku of skus) {
        const skuAnchor =
          sku.compareAtPrice && sku.compareAtPrice > sku.price ? sku.compareAtPrice : sku.price;
        const skuNext = roundPrice(skuAnchor * factor);
        if (skuNext >= skuAnchor) continue;
        await ctx.db.patch(sku._id, { price: skuNext, compareAtPrice: skuAnchor });
        variantChanges.push({ skuId: sku._id, from: sku.price, to: skuNext, compareAt: skuAnchor });
      }
    }

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: String(args.productId),
      actionType: "OFFER_APPLIED",
      changes: {
        discountPercent: args.discountPercent,
        previousPrice: product.selling_price,
        previousCompareAtPrice: product.compareAtPrice,
        newPrice: nextPrice,
        newCompareAtPrice: anchor,
        applyToVariants,
        variantChanges,
      },
    });

    return {
      productId: args.productId,
      price: nextPrice,
      compareAtPrice: anchor,
      variantsUpdated: variantChanges.length,
    };
  },
});

/** Ends an offer, restoring the original price and clearing the strike-through. */
export const clearProductOffer = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product was not found." });
    }

    const restoredPrice =
      product.compareAtPrice && product.compareAtPrice > product.selling_price
        ? product.compareAtPrice
        : product.selling_price;

    await ctx.db.patch(args.productId, {
      selling_price: restoredPrice,
      compareAtPrice: undefined,
    });

    const skus = await getProductSkus(ctx, args.productId);
    let variantsRestored = 0;
    for (const sku of skus) {
      if (!sku.compareAtPrice || sku.compareAtPrice <= sku.price) {
        // Stale marker that never produced a visible discount.
        if (sku.compareAtPrice !== undefined) {
          await ctx.db.patch(sku._id, { compareAtPrice: undefined });
        }
        continue;
      }
      await ctx.db.patch(sku._id, { price: sku.compareAtPrice, compareAtPrice: undefined });
      variantsRestored += 1;
    }

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: String(args.productId),
      actionType: "OFFER_CLEARED",
      changes: {
        previousPrice: product.selling_price,
        previousCompareAtPrice: product.compareAtPrice,
        restoredPrice,
        variantsRestored,
      },
    });

    return { productId: args.productId, price: restoredPrice, variantsRestored };
  },
});

/** Applies one discount across many products in a single campaign action. */
export const bulkSetOffers = mutation({
  args: {
    productIds: v.array(v.id("products")),
    discountPercent: v.number(),
    applyToVariants: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");
    assertDiscountPercent(args.discountPercent);

    if (args.productIds.length === 0) {
      throw new ConvexError({ code: "EMPTY_SELECTION", message: "Select at least one product." });
    }

    const applyToVariants = args.applyToVariants ?? true;
    const factor = 1 - args.discountPercent / 100;
    const applied: Id<"products">[] = [];
    const skipped: Array<{ productId: Id<"products">; reason: string }> = [];

    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product) {
        skipped.push({ productId, reason: "NOT_FOUND" });
        continue;
      }

      const anchor =
        product.compareAtPrice && product.compareAtPrice > product.selling_price
          ? product.compareAtPrice
          : product.selling_price;
      const nextPrice = roundPrice(anchor * factor);

      if (nextPrice >= anchor) {
        skipped.push({ productId, reason: "DISCOUNT_TOO_SMALL" });
        continue;
      }

      await ctx.db.patch(productId, { selling_price: nextPrice, compareAtPrice: anchor });

      if (applyToVariants) {
        const skus = await getProductSkus(ctx, productId);
        for (const sku of skus) {
          const skuAnchor =
            sku.compareAtPrice && sku.compareAtPrice > sku.price ? sku.compareAtPrice : sku.price;
          const skuNext = roundPrice(skuAnchor * factor);
          if (skuNext >= skuAnchor) continue;
          await ctx.db.patch(sku._id, { price: skuNext, compareAtPrice: skuAnchor });
        }
      }

      applied.push(productId);
    }

    await writeAuditLog(ctx, {
      userId: user._id,
      entityId: "BULK_OFFER",
      actionType: "OFFER_BULK_APPLIED",
      changes: {
        discountPercent: args.discountPercent,
        applyToVariants,
        appliedCount: applied.length,
        appliedProductIds: applied,
        skipped,
      },
    });

    return { appliedCount: applied.length, skipped };
  },
});
