import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveProductImages, resolveStorageRef } from "./products";
import { ratingSummaryOf } from "./lib/ratings";

const MAX_FAVORITES = 200;

/** Product ids favourited by this anonymous session (used for heart state). */
export const listProductIds = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    if (!args.sessionId) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(MAX_FAVORITES);
    return rows.map((row) => row.productId);
  },
});

/** Full card data for the favourites page; hides unpublished products. */
export const listProducts = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    if (!args.sessionId) return [];
    const rows = await ctx.db
      .query("favorites")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(MAX_FAVORITES);

    const products = await Promise.all(
      rows.map(async (row) => {
        const product = await ctx.db.get(row.productId);
        if (!product || product.status !== "PUBLISHED") return null;
        const category = await ctx.db.get(product.categoryId);
        if (!category?.isActive) return null;
        const skus = await ctx.db
          .query("skus")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();
        return {
          _id: product._id,
          name_ar: product.name_ar,
          name_en: product.name_en,
          description_ar: product.description_ar,
          description_en: product.description_en,
          selling_price: product.selling_price,
          compareAtPrice: product.compareAtPrice,
          slug: product.slug,
          isFeatured: product.isFeatured,
          categoryName: category.name_en,
          thumbnail: await resolveStorageRef(ctx, product.thumbnail),
          images: await resolveProductImages(ctx, product.images),
          skus: await Promise.all(
            skus
              .filter((sku) => sku.isActive !== false)
              .map(async (sku) => ({
                ...sku,
                linkedImageId: await resolveStorageRef(ctx, sku.linkedImageId),
              })),
          ),
          ...ratingSummaryOf(product),
        };
      }),
    );
    return products.filter((product): product is NonNullable<typeof product> => product !== null);
  },
});

export const toggle = mutation({
  args: { sessionId: v.string(), productId: v.id("products") },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      throw new ConvexError({ code: "INVALID_SESSION", message: "Missing session." });
    }
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_session_product", (q) =>
        q.eq("sessionId", args.sessionId).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { isFavorite: false };
    }

    const product = await ctx.db.get(args.productId);
    if (!product || product.status !== "PUBLISHED") {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
    }
    const count = (
      await ctx.db
        .query("favorites")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .take(MAX_FAVORITES)
    ).length;
    if (count >= MAX_FAVORITES) {
      throw new ConvexError({ code: "FAVORITES_LIMIT", message: "Favourites list is full." });
    }

    await ctx.db.insert("favorites", { sessionId: args.sessionId, productId: args.productId });
    return { isFavorite: true };
  },
});
