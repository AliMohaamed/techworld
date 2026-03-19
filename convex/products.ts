import { mutation, query, QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
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
};

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

/**
 * Helper to determine if the caller has VIEW_FINANCIALS permission.
 */
async function canViewFinancials(ctx: Pick<QueryCtx, "auth" | "db">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return false;
  const email = identity.email;
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
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
    
    // BRANCH 1: Text Search (In-Memory Pagination)
    // Convex's search indices do not support native .paginate() currently.
    if (normalizedSearch) {
      candidates = await ctx.db
        .query("products")
        .withSearchIndex("search_name", (q) => q.search("name", normalizedSearch))
        .take(250) as CatalogProduct[]; // Cap memory payload for scalability

      if (candidates.length === 0) {
        // Support older seeded products that may not have the legacy `name` field populated yet.
        candidates = await ctx.db
          .query("products")
          .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
          .take(250) as CatalogProduct[];
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

      const sorted = sortCatalogProducts(filtered, args.sortOrder).map(mapCatalogProduct);
      return paginateResults(sorted, args.paginationOpts);
    }

    // BRANCH 2: Facet Navigation Only (Native Database Pagination)
    // Over 95% of traffic flows through this highly scalable pathway.
    let baseQuery;

    if (args.categoryId) {
      if (args.sortOrder === "price_asc" || args.sortOrder === "price_desc") {
        baseQuery = ctx.db
          .query("products")
          .withIndex("by_category_status_price", (q) => 
            q.eq("categoryId", args.categoryId as Id<"categories">).eq("status", "PUBLISHED")
          );
      } else {
        baseQuery = ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId as Id<"categories">))
          .filter((q) => q.eq(q.field("status"), "PUBLISHED"));
      }
    } else {
      if (args.sortOrder === "price_asc" || args.sortOrder === "price_desc") {
        baseQuery = ctx.db
          .query("products")
          .withIndex("by_status_price", (q) => q.eq("status", "PUBLISHED"));
      } else {
        baseQuery = ctx.db
          .query("products")
          .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"));
      }
    }

    if (args.sortOrder === "price_desc") {
      baseQuery = baseQuery.order("desc");
    } else if (args.sortOrder === "newest") {
      baseQuery = baseQuery.order("desc"); // Newest relies on ID creation time natively
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nativeFiltered = baseQuery as any;
    if (args.minPrice !== undefined || args.maxPrice !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nativeFiltered = baseQuery.filter((q: any) => {
        const filters = [];
        if (args.minPrice !== undefined) filters.push(q.gte(q.field("selling_price"), args.minPrice!));
        if (args.maxPrice !== undefined) filters.push(q.lte(q.field("selling_price"), args.maxPrice!));
        return filters.length > 1 ? q.and(...filters) : filters[0];
      });
    }

    const paginated = await nativeFiltered.paginate(args.paginationOpts);
    
    // Safety check: Filter out edge-case orphaned products belonging to soft-deleted categories
    const finalItems = paginated.page
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => activeCategoryIds.has(p.categoryId))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => mapCatalogProduct(p as CatalogProduct));

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
        .map((product) => mapCatalogProduct(product as CatalogProduct)),
    };
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
      name: args.name_en,
      price: args.selling_price,
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

/**
 * Optimized query for the storefront homepage.
 * Returns only PUBLISHED products belonging to ACTIVE categories.
 */
export const getForStorefront = query({
  args: {},
  handler: async (ctx) => {
    // 1. Get all active categories first to filter products efficiently
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    const activeCategoryIds = new Set(activeCategories.map(c => c._id));

    // 2. Fetch all published products
    const publishedProducts = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    // 3. Filter products whose category is active and map to ProductDisplay shape
    return publishedProducts
      .filter(p => activeCategoryIds.has(p.categoryId))
      .map(p => ({
        _id: p._id,
        name_ar: p.name_ar,
        name_en: p.name_en,
        selling_price: p.selling_price,
        display_stock: p.display_stock,
        images: p.images,
        categoryId: p.categoryId,
      }));
  },
});
