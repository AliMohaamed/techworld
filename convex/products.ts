import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";

/**
 * Helper to determine if the caller has VIEW_FINANCIALS permission.
 */
async function canViewFinancials(ctx: { db: any; auth: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .unique();
  return user?.permissions.includes("VIEW_FINANCIALS") ?? false;
}

/**
 * Public query to fetch a signle product with commercial data.
 * Redacts `cogs` server-side if caller lacks VIEW_FINANCIALS.
 * Follows SEO constraints: persists even if category is inactive (renders 'unavailable' state on frontend).
 */
export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const category = await ctx.db.get(product.categoryId);
    const result = { 
      ...product, 
      categoryName_en: category?.name_en ?? "Unknown",
      categoryName_ar: category?.name_ar ?? "غير معروف",
      isCategoryActive: category?.isActive ?? false 
    };

    if (!(await canViewFinancials(ctx))) {
      delete result.cogs;
    }
    return result;
  },
});

/**
 * Public query to list all published products for a specific active category.
 * If category is inactive, returns empty list.
 */
export const listProductsByCategory = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    // If category doesn't exist or is inactive, return nothing for list browsing.
    if (!category || !category.isActive) return [];

    const products = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect();

    const hasFinancials = await canViewFinancials(ctx);
    return products.map((p) => {
      const result = { ...p };
      if (!hasFinancials) {
        delete result.cogs;
      }
      return result;
    });
  },
});

/**
 * Admin mutation to create a new product entry in DRAFT mode.
 * Enforces that products can only be created in active categories.
 */
export const createProduct = mutation({
  args: {
    categoryId: v.id("categories"),
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    images: v.array(v.string()),
    selling_price: v.number(),
    cogs: v.optional(v.number()),
    display_stock: v.number(),
    real_stock: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    const category = await ctx.db.get(args.categoryId);
    if (!category) throw new Error("Target category not found");
    if (!category.isActive) throw new Error("Cannot create products in an inactive category");

    const productId = await ctx.db.insert("products", {
      ...args,
      status: "DRAFT",
    });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: productId,
      actionType: "CREATE_PRODUCT",
      timestamp: Date.now(),
      changes: args,
    });

    return productId;
  },
});

/**
 * Admin mutation to transition a product to PUBLISHED.
 * STRICTRULE: Cannot publish if the parent category is inactive.
 */
export const publishProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    const category = await ctx.db.get(product.categoryId);
    if (!category || !category.isActive) {
      throw new Error("Cannot publish product. Parent category is inactive.");
    }

    await ctx.db.patch(args.id, { status: "PUBLISHED" });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "PUBLISH_PRODUCT",
      timestamp: Date.now(),
      changes: { previousStatus: product.status, newStatus: "PUBLISHED" },
    });
  },
});

/**
 * Admin mutation to revert a product back to DRAFT.
 */
export const unpublishProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found");

    await ctx.db.patch(args.id, { status: "DRAFT" });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "UNPUBLISH_PRODUCT",
      timestamp: Date.now(),
      changes: { previousStatus: product.status, newStatus: "DRAFT" },
    });
  },
});
