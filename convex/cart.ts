import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Guest-first mutation to add or update an item in the persistent shopping cart.
 * Validates requested quantity against live `display_stock` strictly before adding.
 */
export const addToCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // PRD Constraint: Validation quantity <= display_stock at time of addition
    if (product.display_stock < args.quantity) {
      throw new Error("Insufficient display stock for this quantity.");
    }

    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const now = Date.now();
    const newItem = {
      productId: args.productId,
      quantity: Math.max(1, args.quantity),
      addedAt: now,
    };

    if (session) {
      // Find existing item to update quantity, or push new
      const existingItemIndex = session.items.findIndex((item) => item.productId === args.productId);
      const newItems = [...session.items];
      
      if (existingItemIndex > -1) {
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: args.quantity,
          addedAt: now // Refresh addedAt for last-touch analytics
        };
      } else {
        newItems.push(newItem);
      }
      
      await ctx.db.patch(session._id, { 
        items: newItems, 
        lastUpdated: now 
      });
    } else {
      // Create new backend session for this guest
      await ctx.db.insert("cart_sessions", {
        sessionId: args.sessionId,
        items: [newItem],
        lastUpdated: now,
      });
    }
  },
});

/**
 * Removes a specific product from the guest's persistent cart.
 */
export const removeFromCart = mutation({
  args: {
    sessionId: v.string(),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("cart_sessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (session) {
      const newItems = session.items.filter((item) => item.productId !== args.productId);
      await ctx.db.patch(session._id, { 
        items: newItems, 
        lastUpdated: Date.now() 
      });
    }
  },
});

/**
 * Retrieves the current cart session populated with product data.
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
        // We strip cogs here as it is a public-facing guest query
        if (product) {
          const { cogs, ...publicProduct } = product;
          return { ...item, product: publicProduct };
        }
        return { ...item, product: null };
      })
    );

    const total = items.reduce((sum, item) => {
      if (item.product?.selling_price) {
        return sum + item.product.selling_price * item.quantity;
      }
      return sum;
    }, 0);

    return { items, total };
  },
});

/**
 * Strict server-side validation of the entire cart against live data.
 * Checks for product existence, publication status, category activity, and live display_stock.
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
      
      // 1. Existence check
      if (!product) {
        failedItems.push({ productId: item.productId, reason: "NOT_FOUND" });
        continue;
      }

      // 2. Category activity check
      const category = await ctx.db.get(product.categoryId);
      if (!category || !category.isActive) {
        failedItems.push({ 
          productId: item.productId, 
          reason: "UNAVAILABLE", 
          details: "Category is inactive" 
        });
        continue;
      }

      // 3. Publication state check
      if (product.status !== "PUBLISHED") {
        failedItems.push({ 
          productId: item.productId, 
          reason: "UNAVAILABLE", 
          details: "Product is no longer public" 
        });
        continue;
      }

      // 4. Live display_stock check
      if (product.display_stock < item.quantity) {
        failedItems.push({ 
          productId: item.productId, 
          reason: "INSUFFICIENT_STOCK", 
          available: product.display_stock 
        });
        continue;
      }
    }

    return {
      valid: failedItems.length === 0,
      failedItems,
    };
  },
});

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
