import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";

/**
 * Public query to fetch a category by its ID.
 */
export const getCategoryById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Public query to list all active categories for the storefront.
 */
export const listActiveCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return {
      categories: categories.sort((a, b) => a.name_en.localeCompare(b.name_en)),
    };
  },
});

/**
 * Admin mutation to define a new product category.
 */
export const createCategory = mutation({
  args: {
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    thumbnailImageId: v.optional(v.string()),
    isActive: v.boolean(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_CATEGORIES");

    const categoryId = await ctx.db.insert("categories", args);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: categoryId,
      actionType: "CREATE_CATEGORY",
      timestamp: Date.now(),
      changes: args,
    });

    return categoryId;
  },
});

/**
 * Admin mutation to update metadata for an existing category.
 */
export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name_ar: v.optional(v.string()),
    name_en: v.optional(v.string()),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    thumbnailImageId: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...changes }) => {
    const user = await requirePermission(ctx, "MANAGE_CATEGORIES");

    const previous = await ctx.db.get(id);
    await ctx.db.patch(id, changes);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: id,
      actionType: "UPDATE_CATEGORY",
      timestamp: Date.now(),
      changes: { previous, updated: changes },
    });
  },
});

/**
 * Admin-gated toggle for soft-deleting/hiding a category.
 */
export const toggleCategoryActive = mutation({
  args: { id: v.id("categories"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_CATEGORIES");

    const previous = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, { isActive: args.isActive });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "TOGGLE_CATEGORY_ACTIVE",
      timestamp: Date.now(),
      changes: { previousActive: previous?.isActive, newActive: args.isActive },
    });
  },
});

/**
 * Public query to fetch a category by its slug.
 */
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});
