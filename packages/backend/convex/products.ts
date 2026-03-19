import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requirePermission } from "./lib/rbac";
import { hasPermission } from "./lib/permissions";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type CatalogProduct = {
  _id: Id<"products">;
  _creationTime: number;
  categoryId: Id<"categories">;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  images: string[];
  selling_price: number;
  display_stock: number;
  real_stock: number;
  status: "DRAFT" | "PUBLISHED";
  name?: string;
  price?: number;
  slug?: string;
  cogs?: number;
};

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

function sanitizeNumber(value: number, fieldLabel: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError({
      code: "INVALID_NUMBER",
      message: `${fieldLabel} must be a non-negative number.`,
    });
  }

  return value;
}

async function ensureUniqueProductSlug(
  ctx: Pick<QueryCtx, "db">,
  slug: string,
  excludeId?: Id<"products">,
) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== excludeId) {
    throw new ConvexError({
      code: "PRODUCT_SLUG_CONFLICT",
      message: "A product with this slug already exists.",
    });
  }
}

async function ensureCategoryExists(
  ctx: Pick<QueryCtx, "db">,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get(categoryId);
  if (!category) {
    throw new ConvexError({
      code: "CATEGORY_NOT_FOUND",
      message: "Target category was not found.",
    });
  }

  return category;
}

async function ensureActiveCategory(
  ctx: Pick<QueryCtx, "db">,
  categoryId: Id<"categories">,
) {
  const category = await ensureCategoryExists(ctx, categoryId);
  if (!category.isActive) {
    throw new ConvexError({
      code: "CATEGORY_INACTIVE",
      message: "Select an active category before publishing or creating products.",
    });
  }

  return category;
}

const mapCatalogProduct = (product: CatalogProduct) => ({
  _id: product._id,
  _creationTime: product._creationTime,
  categoryId: product.categoryId,
  name_ar: product.name_ar,
  name_en: product.name_en,
  description_ar: product.description_ar,
  description_en: product.description_en,
  images: product.images,
  selling_price: product.selling_price,
  display_stock: product.display_stock,
  real_stock: product.real_stock,
  slug: product.slug,
});

const matchesSearch = (product: CatalogProduct, rawQuery: string) => {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [product.name, product.name_en, product.name_ar]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalizedQuery));
};

const sortCatalogProducts = (
  products: CatalogProduct[],
  sortOrder?: "price_asc" | "price_desc" | "newest",
) => {
  const sorted = [...products];

  if (sortOrder === "price_asc") {
    sorted.sort((a, b) => a.selling_price - b.selling_price);
    return sorted;
  }

  if (sortOrder === "price_desc") {
    sorted.sort((a, b) => b.selling_price - a.selling_price);
    return sorted;
  }

  sorted.sort((a, b) => b._creationTime - a._creationTime);
  return sorted;
};

const paginateResults = <T>(
  items: T[],
  paginationOpts: { cursor: string | null; numItems: number },
) => {
  const parsedCursor = paginationOpts.cursor
    ? Number.parseInt(paginationOpts.cursor, 10)
    : 0;
  const start = Number.isFinite(parsedCursor) && parsedCursor >= 0 ? parsedCursor : 0;
  const end = start + paginationOpts.numItems;

  return {
    page: items.slice(start, end),
    isDone: end >= items.length,
    continueCursor: end >= items.length ? "" : String(end),
  };
};

async function canViewFinancials(ctx: Pick<QueryCtx, "auth" | "db">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return false;
  const email = identity.email;
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  return hasPermission(user, "VIEW_FINANCIALS");
}

async function getPublicationBlocker(
  ctx: Pick<QueryCtx, "db">,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get(categoryId);

  if (!category) {
    return "Missing category";
  }

  if (!category.isActive) {
    return "Category inactive";
  }

  return null;
}

export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const category = await ctx.db.get(product.categoryId);
    const result = {
      ...product,
      categoryName_en: category?.name_en ?? "Unknown",
      categoryName_ar: category?.name_ar ?? "Unknown",
      categorySlug: category?.slug,
      isCategoryActive: category?.isActive ?? false,
    };

    if (!(await canViewFinancials(ctx))) {
      delete result.cogs;
    }
    return result;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!product) return null;

    const category = await ctx.db.get(product.categoryId);
    const result = {
      ...product,
      categoryName_en: category?.name_en ?? "Unknown",
      categoryName_ar: category?.name_ar ?? "Unknown",
      categorySlug: category?.slug,
      isCategoryActive: category?.isActive ?? false,
    };

    if (!(await canViewFinancials(ctx))) {
      delete result.cogs;
    }
    return result;
  },
});

export const listProductsByCategory = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
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

export const searchAndFilter = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    sortOrder: v.optional(
      v.union(
        v.literal("price_asc"),
        v.literal("price_desc"),
        v.literal("newest"),
      ),
    ),
    searchQuery: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const activeCategoryIds = new Set(activeCategories.map((category) => category._id));
    const normalizedSearch = args.searchQuery?.trim() ?? "";

    let candidates: CatalogProduct[];

    if (normalizedSearch) {
      candidates = (await ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", normalizedSearch))
        .take(250)) as CatalogProduct[];

      if (candidates.length === 0) {
        candidates = (await ctx.db
          .query("products")
          .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
          .take(250)) as CatalogProduct[];
      }

      const filtered = candidates.filter((product) => {
        if (product.status !== "PUBLISHED") return false;
        if (!activeCategoryIds.has(product.categoryId)) return false;
        if (args.categoryId && product.categoryId !== args.categoryId) return false;
        if (args.minPrice !== undefined && product.selling_price < args.minPrice) return false;
        if (args.maxPrice !== undefined && product.selling_price > args.maxPrice) return false;
        if (!matchesSearch(product, normalizedSearch)) return false;
        return true;
      });

      const sorted = sortCatalogProducts(filtered, args.sortOrder).map((p) => {
        const mapped = mapCatalogProduct(p);
        const category = activeCategories.find((c) => c._id === p.categoryId);
        return { ...mapped, categoryName: category?.name_en || "UNKNOWN" };
      });
      return paginateResults(sorted, args.paginationOpts);
    }

    let baseQuery;

    if (args.categoryId) {
      if (args.sortOrder === "price_asc" || args.sortOrder === "price_desc") {
        baseQuery = ctx.db
          .query("products")
          .withIndex("by_category_status_price", (q) =>
            q.eq("categoryId", args.categoryId as Id<"categories">).eq("status", "PUBLISHED"),
          );
      } else {
        baseQuery = ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId as Id<"categories">))
          .filter((q) => q.eq(q.field("status"), "PUBLISHED"));
      }
    } else if (args.sortOrder === "price_asc" || args.sortOrder === "price_desc") {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_status_price", (q) => q.eq("status", "PUBLISHED"));
    } else {
      baseQuery = ctx.db
        .query("products")
        .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"));
    }

    if (args.sortOrder === "price_desc") {
      baseQuery = baseQuery.order("desc");
    } else if (args.sortOrder === "newest") {
      baseQuery = baseQuery.order("desc");
    }

    let nativeFiltered = baseQuery as any;
    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      nativeFiltered = baseQuery.filter((q: any) => {
        const filters = [];
        if (args.minPrice !== undefined) filters.push(q.gte(q.field("selling_price"), args.minPrice));
        if (args.maxPrice !== undefined) filters.push(q.lte(q.field("selling_price"), args.maxPrice));
        return filters.length > 1 ? q.and(...filters) : filters[0];
      });
    }

    const paginated = await nativeFiltered.paginate(args.paginationOpts);

    const finalItems = paginated.page
      .filter((p: any) => activeCategoryIds.has(p.categoryId))
      .map((p: any) => {
        const mapped = mapCatalogProduct(p as CatalogProduct);
        const category = activeCategories.find((c) => c._id === p.categoryId);
        return { ...mapped, categoryName: category?.name_en || "UNKNOWN" };
      });

    return {
      ...paginated,
      page: finalItems,
    };
  },
});

export const getRecommendedProducts = query({
  args: {},
  handler: async (ctx) => {
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const activeCategoryIds = new Set(activeCategories.map((category) => category._id));

    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    return {
      products: products
        .filter((product) => activeCategoryIds.has(product.categoryId))
        .sort((a, b) => {
          if (b.display_stock !== a.display_stock) {
            return b.display_stock - a.display_stock;
          }
          return b._creationTime - a._creationTime;
        })
        .slice(0, 4)
        .map((product) => {
          const mapped = mapCatalogProduct(product as CatalogProduct);
          const category = activeCategories.find((c) => c._id === product.categoryId);
          return { ...mapped, categoryName: category?.name_en || "UNKNOWN" };
        }),
    };
  },
});

export const listAdminProducts = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "MANAGE_PRODUCTS");

    const products = await ctx.db.query("products").order("desc").collect();

    return Promise.all(
      products.map(async (product) => {
        const category = await ctx.db.get(product.categoryId);
        return {
          ...product,
          categoryName: category?.name_en ?? "Missing category",
          isCategoryActive: category?.isActive ?? false,
          publicationBlockedReason: await getPublicationBlocker(ctx, product.categoryId),
        };
      }),
    );
  },
});

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
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"))),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    if (args.status === "PUBLISHED") {
      await ensureActiveCategory(ctx, args.categoryId);
    } else {
      await ensureCategoryExists(ctx, args.categoryId);
    }

    const name_en = args.name_en.trim();
    const name_ar = args.name_ar.trim();
    const slug = slugify(args.slug?.trim() || name_en);

    if (!name_en || !name_ar || !slug) {
      throw new ConvexError({
        code: "INVALID_PRODUCT",
        message: "Product names and slug are required.",
      });
    }

    const payload = {
      categoryId: args.categoryId,
      name_ar,
      name_en,
      description_ar: normalizeOptionalString(args.description_ar),
      description_en: normalizeOptionalString(args.description_en),
      images: args.images,
      selling_price: sanitizeNumber(args.selling_price, "Selling price"),
      cogs:
        args.cogs !== undefined ? sanitizeNumber(args.cogs, "COGS") : undefined,
      display_stock: sanitizeNumber(args.display_stock, "Display stock"),
      real_stock: sanitizeNumber(args.real_stock, "Real stock"),
      status: args.status ?? "DRAFT",
      name: name_en,
      price: args.selling_price,
      slug,
    };

    await ensureUniqueProductSlug(ctx, slug);

    const productId = await ctx.db.insert("products", payload);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: productId,
      actionType: "CREATE_PRODUCT",
      changes: payload,
    });

    return productId;
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    categoryId: v.optional(v.id("categories")),
    name_ar: v.optional(v.string()),
    name_en: v.optional(v.string()),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    selling_price: v.optional(v.number()),
    cogs: v.optional(v.number()),
    display_stock: v.optional(v.number()),
    real_stock: v.optional(v.number()),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"))),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    if (args.real_stock !== undefined) {
      await requirePermission(ctx, "ADJUST_REAL_STOCK");
      sanitizeNumber(args.real_stock, "Real stock");
    }

    if (args.display_stock !== undefined) {
      await requirePermission(ctx, "MANAGE_DISPLAY_STOCK");
      sanitizeNumber(args.display_stock, "Display stock");
    }

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
    }

    const nextCategoryId = args.categoryId ?? existing.categoryId;
    const nextNameEn = args.name_en?.trim() || existing.name_en;
    const nextSlug = args.slug !== undefined ? slugify(args.slug) : existing.slug || slugify(nextNameEn);
    const nextStatus = args.status ?? existing.status;

    if (!nextNameEn || !nextSlug) {
      throw new ConvexError({
        code: "INVALID_PRODUCT",
        message: "Product must keep a valid English name and slug.",
      });
    }

    if (nextStatus === "PUBLISHED") {
      await ensureActiveCategory(ctx, nextCategoryId);
    } else {
      await ensureCategoryExists(ctx, nextCategoryId);
    }

    await ensureUniqueProductSlug(ctx, nextSlug, args.id);

    const patch = {
      ...(args.categoryId !== undefined ? { categoryId: nextCategoryId } : {}),
      ...(args.name_ar !== undefined ? { name_ar: args.name_ar.trim() } : {}),
      ...(args.name_en !== undefined ? { name_en: nextNameEn, name: nextNameEn } : {}),
      ...(args.description_ar !== undefined
        ? { description_ar: normalizeOptionalString(args.description_ar) }
        : {}),
      ...(args.description_en !== undefined
        ? { description_en: normalizeOptionalString(args.description_en) }
        : {}),
      ...(args.images !== undefined ? { images: args.images } : {}),
      ...(args.selling_price !== undefined
        ? {
            selling_price: sanitizeNumber(args.selling_price, "Selling price"),
            price: sanitizeNumber(args.selling_price, "Selling price"),
          }
        : {}),
      ...(args.cogs !== undefined ? { cogs: sanitizeNumber(args.cogs, "COGS") } : {}),
      ...(args.display_stock !== undefined ? { display_stock: args.display_stock } : {}),
      ...(args.real_stock !== undefined ? { real_stock: args.real_stock } : {}),
      ...(args.status !== undefined ? { status: nextStatus } : {}),
      slug: nextSlug,
    };

    await ctx.db.patch(args.id, patch);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "UPDATE_PRODUCT",
      changes: { previous: existing, updated: patch },
    });

    return { success: true };
  },
});

export const publishProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
    }

    await ensureActiveCategory(ctx, product.categoryId);

    await ctx.db.patch(args.id, { status: "PUBLISHED" });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "PUBLISH_PRODUCT",
      changes: { previousStatus: product.status, newStatus: "PUBLISHED" },
    });
  },
});

export const unpublishProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");

    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
    }

    await ctx.db.patch(args.id, { status: "DRAFT" });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "UNPUBLISH_PRODUCT",
      changes: { previousStatus: product.status, newStatus: "DRAFT" },
    });
  },
});

export const getForStorefront = query({
  args: {},
  handler: async (ctx) => {
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const activeCategoryIds = new Set(activeCategories.map((c) => c._id));

    const publishedProducts = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    return publishedProducts
      .filter((p) => activeCategoryIds.has(p.categoryId))
      .map((p) => {
        const category = activeCategories.find((c) => c._id === p.categoryId);
        return {
          _id: p._id,
          name_ar: p.name_ar,
          name_en: p.name_en,
          description_en: p.description_en,
          selling_price: p.selling_price,
          display_stock: p.display_stock,
          images: p.images,
          categoryId: p.categoryId,
          slug: p.slug,
          categoryName: category?.name_en || "UNKNOWN",
        };
      });
  },
});



