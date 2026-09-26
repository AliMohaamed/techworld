import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ratingSummaryOf } from "./lib/ratings";

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
