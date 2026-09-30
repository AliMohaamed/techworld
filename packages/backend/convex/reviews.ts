import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ratingSummaryOf } from "./lib/ratings";
import { resolveStorageRef } from "./products";

const MAX_NAME_LENGTH = 60;
const MAX_COMMENT_LENGTH = 1000;
const MAX_LISTED_REVIEWS = 100;

/**
 * Public reviews for a product, newest first, plus the star distribution.
 * `sessionId` is never returned so shoppers cannot be correlated.
 */
export const listForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.status !== "PUBLISHED") return null;

    const reviews = await ctx.db
      .query("product_reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    const visible = reviews.filter((review) => !review.isHidden);

    const distribution = [0, 0, 0, 0, 0];
    for (const review of visible) {
      distribution[review.rating - 1] += 1;
    }

    return {
      ...ratingSummaryOf(product),
      // Index 0 = 1 star … index 4 = 5 stars.
      distribution,
      reviews: visible
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_LISTED_REVIEWS)
        .map((review) => ({
          _id: review._id,
          authorName: review.authorName,
          rating: review.rating,
          comment: review.comment,
          updatedAt: review.updatedAt,
        })),
    };
  },
});

export const getMyReview = query({
  args: { productId: v.id("products"), sessionId: v.string() },
  handler: async (ctx, args) => {
    if (!args.sessionId) return null;
    const review = await ctx.db
      .query("product_reviews")
      .withIndex("by_product_session", (q) =>
        q.eq("productId", args.productId).eq("sessionId", args.sessionId),
      )
      .unique();
    if (!review) return null;
    return {
      _id: review._id,
      authorName: review.authorName,
      rating: review.rating,
      comment: review.comment,
    };
  },
});

/**
 * One review per session per product: submitting again edits the existing
 * review and re-balances the product's rating aggregates.
 */
export const submitReview = mutation({
  args: {
    productId: v.id("products"),
    sessionId: v.string(),
    authorName: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      throw new ConvexError({ code: "INVALID_SESSION", message: "Missing session." });
    }
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError({ code: "INVALID_RATING", message: "Rating must be between 1 and 5." });
    }
    const authorName = args.authorName.trim();
    if (!authorName || authorName.length > MAX_NAME_LENGTH) {
      throw new ConvexError({ code: "INVALID_NAME", message: "Please enter a valid name." });
    }
    const comment = args.comment?.trim() || undefined;
    if (comment && comment.length > MAX_COMMENT_LENGTH) {
      throw new ConvexError({ code: "COMMENT_TOO_LONG", message: "Review is too long." });
    }

    const product = await ctx.db.get(args.productId);
    if (!product || product.status !== "PUBLISHED") {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
    }

    const existing = await ctx.db
      .query("product_reviews")
      .withIndex("by_product_session", (q) =>
        q.eq("productId", args.productId).eq("sessionId", args.sessionId),
      )
      .unique();

    let ratingSum = product.rating_sum ?? 0;
    let reviewCount = product.review_count ?? 0;
    const now = Date.now();

    if (existing) {
      if (!existing.isHidden) {
        ratingSum += args.rating - existing.rating;
      }
      await ctx.db.patch(existing._id, { authorName, rating: args.rating, comment, updatedAt: now });
    } else {
      await ctx.db.insert("product_reviews", {
        productId: args.productId,
        sessionId: args.sessionId,
        authorName,
        rating: args.rating,
        comment,
        updatedAt: now,
      });
      ratingSum += args.rating;
      reviewCount += 1;
    }

    await ctx.db.patch(args.productId, { rating_sum: ratingSum, review_count: reviewCount });
    return { success: true };
  },
});

const MAX_HIGHLIGHTS = 24;
const HIGHLIGHT_SCAN_LIMIT = 300;
const HIGHLIGHT_MIN_RATING = 4;
const HIGHLIGHT_MIN_COMMENT_LENGTH = 12;

/**
 * Landing-page testimonials: recent, visible, well-rated reviews with a real
 * comment, on products that are still for sale. Also returns the store-wide
 * rating so the section can show an honest overall score.
 */
export const listHighlights = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(1, Math.floor(args.limit ?? 12)), MAX_HIGHLIGHTS);

    const publishedProducts = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();
    const activeCategoryIds = new Set(
      (
        await ctx.db
          .query("categories")
          .withIndex("by_active", (q) => q.eq("isActive", true))
          .collect()
      ).map((c) => c._id),
    );
    const sellable = new Map(
      publishedProducts.filter((p) => activeCategoryIds.has(p.categoryId)).map((p) => [p._id, p]),
    );

    let ratingSum = 0;
    let reviewCount = 0;
    for (const product of sellable.values()) {
      ratingSum += product.rating_sum ?? 0;
      reviewCount += product.review_count ?? 0;
    }

    const recent = await ctx.db.query("product_reviews").order("desc").take(HIGHLIGHT_SCAN_LIMIT);
    const picked = recent
      .filter(
        (review) =>
          !review.isHidden &&
          review.rating >= HIGHLIGHT_MIN_RATING &&
          (review.comment?.length ?? 0) >= HIGHLIGHT_MIN_COMMENT_LENGTH &&
          sellable.has(review.productId),
      )
      .slice(0, limit);

    const reviews = await Promise.all(
      picked.map(async (review) => {
        const product = sellable.get(review.productId)!;
        return {
          _id: review._id,
          authorName: review.authorName,
          rating: review.rating,
          comment: review.comment!,
          updatedAt: review.updatedAt,
          product: {
            _id: product._id,
            slug: product.slug,
            name_en: product.name_en,
            name_ar: product.name_ar,
            image:
              (await resolveStorageRef(ctx, product.thumbnail ?? product.images[0])) ?? null,
          },
        };
      }),
    );

    return {
      reviews,
      reviewCount,
      ratingAverage: reviewCount > 0 ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0,
    };
  },
});
