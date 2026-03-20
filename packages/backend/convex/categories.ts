import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureUniqueCategorySlug(
  ctx: Pick<QueryCtx, "db">,
  slug: string,
  excludeId?: Id<"categories">,
) {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== excludeId) {
    throw new ConvexError({
      code: "CATEGORY_SLUG_CONFLICT",
      message: "A category with this slug already exists.",
    });
  }
}

export const getCategoryById = query({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

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

export const listCategoriesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    await requirePermission(ctx, "MANAGE_CATEGORIES");

    const categories = await ctx.db.query("categories").order("desc").collect();

    const rows = await Promise.all(
      categories.map(async (category) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categoryId", category._id))
          .collect();

        return {
          ...category,
          productCount: products.length,
        };
      }),
    );

    return rows;
  },
});

export const createCategory = mutation({
  args: {
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    thumbnailImageId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_CATEGORIES");

    const name_en = args.name_en.trim();
    const name_ar = args.name_ar.trim();
    const slug = slugify(args.slug?.trim() || name_en);

    if (!name_en || !name_ar || !slug) {
      throw new ConvexError({
        code: "INVALID_CATEGORY",
        message: "Category names and slug are required.",
      });
    }

    await ensureUniqueCategorySlug(ctx, slug);

    const payload = {
      name_ar,
      name_en,
      description_ar: normalizeOptionalString(args.description_ar),
      description_en: normalizeOptionalString(args.description_en),
      thumbnailImageId: normalizeOptionalString(args.thumbnailImageId),
      isActive: args.isActive ?? true,
      slug,
    };

    const categoryId = await ctx.db.insert("categories", payload);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: categoryId,
      actionType: "CREATE_CATEGORY",
      changes: payload,
    });

    return categoryId;
  },
});

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
    if (!previous) {
      throw new ConvexError({ code: "CATEGORY_NOT_FOUND", message: "Category not found." });
    }

    const nextNameEn = changes.name_en?.trim() || previous.name_en;
    const nextSlug =
      changes.slug !== undefined ? slugify(changes.slug) : previous.slug || slugify(nextNameEn);

    if (!nextNameEn || !nextSlug) {
      throw new ConvexError({
        code: "INVALID_CATEGORY",
        message: "Category must keep a valid English name and slug.",
      });
    }

    await ensureUniqueCategorySlug(ctx, nextSlug, id);

    const patch = {
      ...(changes.name_ar !== undefined ? { name_ar: changes.name_ar.trim() } : {}),
      ...(changes.name_en !== undefined ? { name_en: nextNameEn } : {}),
      ...(changes.description_ar !== undefined
        ? { description_ar: normalizeOptionalString(changes.description_ar) }
        : {}),
      ...(changes.description_en !== undefined
        ? { description_en: normalizeOptionalString(changes.description_en) }
        : {}),
      ...(changes.thumbnailImageId !== undefined
        ? { thumbnailImageId: normalizeOptionalString(changes.thumbnailImageId) }
        : {}),
      slug: nextSlug,
    };

    await ctx.db.patch(id, patch);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: id,
      actionType: "UPDATE_CATEGORY",
      changes: { previous, updated: patch },
    });
  },
});

export const toggleCategoryStatus = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_CATEGORIES");

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new ConvexError({ code: "CATEGORY_NOT_FOUND", message: "Category not found." });
    }

    const nextIsActive = !category.isActive;
    await ctx.db.patch(args.id, { isActive: nextIsActive });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "TOGGLE_CATEGORY_STATUS",
      changes: { previousActive: category.isActive, newActive: nextIsActive },
    });

    return { isActive: nextIsActive };
  },
});

export const toggleCategoryActive = mutation({
  args: { id: v.id("categories"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_CATEGORIES");

    const previous = await ctx.db.get(args.id);
    if (!previous) {
      throw new ConvexError({ code: "CATEGORY_NOT_FOUND", message: "Category not found." });
    }

    await ctx.db.patch(args.id, { isActive: args.isActive });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "TOGGLE_CATEGORY_ACTIVE",
      changes: { previousActive: previous.isActive, newActive: args.isActive },
    });
  },
});

export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

