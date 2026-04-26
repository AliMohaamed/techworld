import { ConvexError, v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requirePermission } from "./lib/rbac";
import { hasPermission } from "./lib/permissions";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { writeAuditLog } from "./lib/audit";

type CatalogProduct = {
  _id: Id<"products">;
  _creationTime: number;
  categoryId: Id<"categories">;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  images: Array<string | Id<"_storage">>;
  selling_price: number;
  // display_stock and real_stock are no longer on the product root.
  // They live exclusively on the skus table (Unified SKU Architecture).
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

async function generateUniqueProductSlug(
  ctx: Pick<QueryCtx, "db">,
  baseSlug: string,
  excludeId?: Id<"products">,
): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;
  
  while (true) {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!existing || existing._id === excludeId) {
      return slug;
    }
    
    attempt++;
    slug = `${baseSlug}-${attempt}`;
    
    if (attempt > 100) {
      slug = `${baseSlug}-${Date.now()}`;
    }
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

async function getProductSkus(ctx: Pick<QueryCtx, "db">, productId: Id<"products">) {
  return await ctx.db
    .query("skus")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();
}

export function isResolvedAssetUrl(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

export async function resolveStorageRef(
  ctx: Pick<QueryCtx, "storage">,
  fileRef: string | Id<"_storage"> | undefined,
) {
  if (!fileRef) {
    return undefined;
  }
 
  if (typeof fileRef === "string" && isResolvedAssetUrl(fileRef)) {
    return fileRef;
  }
 
  try {
    return (await ctx.storage.getUrl(fileRef as Id<"_storage">)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function resolveProductImages(
  ctx: Pick<QueryCtx, "storage">,
  images: Array<string | Id<"_storage">>,
) {
  const resolvedImages = await Promise.all(images.map((image) => resolveStorageRef(ctx, image)));
  return resolvedImages.filter((image): image is string => Boolean(image));
}

export const getSitemapData = query({
  args: {},
  handler: async (ctx) => {
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    
    const activeCategoryIds = new Set(activeCategories.map(c => c._id));

    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .collect();

    return {
      categories: activeCategories.map(c => ({ 
        slug: c.slug, 
        lastModified: new Date(c._creationTime).toISOString() 
      })),
      products: products
        .filter(p => activeCategoryIds.has(p.categoryId))
        .map(p => ({ 
          slug: p.slug, 
          lastModified: new Date(p._creationTime).toISOString() 
        })),
    };
  },
});

async function resolveSkuMedia(
  ctx: Pick<QueryCtx, "db" | "storage">,
  productId: Id<"products">,
) {
  const skus = await getProductSkus(ctx, productId);

  return await Promise.all(
    skus.map(async (sku) => ({
      ...sku,
      linkedImageId: await resolveStorageRef(ctx, sku.linkedImageId),
    })),
  );
}

export const getProduct = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const category = await ctx.db.get(product.categoryId);
    const skus = await resolveSkuMedia(ctx, product._id);
    const result = {
      ...product,
      thumbnail: await resolveStorageRef(ctx, product.thumbnail),
      images: await resolveProductImages(ctx, product.images),
      categoryName_en: category?.name_en ?? "Unknown",
      categoryName_ar: category?.name_ar ?? "Unknown",
      categorySlug: category?.slug,
      isCategoryActive: category?.isActive ?? false,
      skus,
      related_products: product.related_product_ids 
        ? (await Promise.all(product.related_product_ids.map(async (id) => {
            const p = await ctx.db.get(id);
            if (!p || p.status !== "PUBLISHED") return null;
            return {
              ...p,
              thumbnail: await resolveStorageRef(ctx, p.thumbnail),
              images: await resolveProductImages(ctx, p.images),
              skus: await resolveSkuMedia(ctx, p._id),
            };
          }))).filter((p): p is NonNullable<typeof p> => p !== null)
        : [],
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
    const skus = await resolveSkuMedia(ctx, product._id);
    const result = {
      ...product,
      thumbnail: await resolveStorageRef(ctx, product.thumbnail),
      images: await resolveProductImages(ctx, product.images),
      categoryName_en: category?.name_en ?? "Unknown",
      categoryName_ar: category?.name_ar ?? "Unknown",
      categorySlug: category?.slug,
      isCategoryActive: category?.isActive ?? false,
      skus,
      related_products: product.related_product_ids 
        ? (await Promise.all(product.related_product_ids.map(async (id) => {
            const p = await ctx.db.get(id);
            if (!p || p.status !== "PUBLISHED") return null;
            return {
              ...p,
              thumbnail: await resolveStorageRef(ctx, p.thumbnail),
              images: await resolveProductImages(ctx, p.images),
              skus: await resolveSkuMedia(ctx, p._id),
            };
          }))).filter((p): p is NonNullable<typeof p> => p !== null)
        : [],
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
    return await Promise.all(
      products.map(async (p) => {
        const result = {
          ...p,
          thumbnail: await resolveStorageRef(ctx, p.thumbnail),
          images: await resolveProductImages(ctx, p.images),
          skus: await resolveSkuMedia(ctx, p._id),
        };
        if (!hasFinancials) {
          delete result.cogs;
        }
        return result;
      }),
    );
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

      const sorted = await Promise.all(
        sortCatalogProducts(filtered, args.sortOrder).map(async (p) => {
          const mapped = mapCatalogProduct(p);
          const category = activeCategories.find((c) => c._id === p.categoryId);
          return {
            ...mapped,
            images: await resolveProductImages(ctx, mapped.images),
            categoryName: category?.name_en || "UNKNOWN",
            skus: await resolveSkuMedia(ctx, p._id),
          };
        }),
      );
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

    const finalItems = await Promise.all(
      paginated.page
        .filter((p: any) => activeCategoryIds.has(p.categoryId))
        .map(async (p: any) => {
          const mapped = mapCatalogProduct(p as CatalogProduct);
          const category = activeCategories.find((c) => c._id === p.categoryId);
          return {
            ...mapped,
            images: await resolveProductImages(ctx, mapped.images),
            categoryName: category?.name_en || "UNKNOWN",
            skus: await resolveSkuMedia(ctx, p._id),
          };
        }),
    );

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
      products: await Promise.all(
        products
          .filter((product) => activeCategoryIds.has(product.categoryId))
          .sort((a, b) => b._creationTime - a._creationTime)
          .slice(0, 4)
          .map(async (product) => {
            const mapped = mapCatalogProduct(product as CatalogProduct);
            const category = activeCategories.find((c) => c._id === product.categoryId);
            return {
              ...mapped,
              images: await resolveProductImages(ctx, mapped.images),
              categoryName: category?.name_en || "UNKNOWN",
              skus: await resolveSkuMedia(ctx, product._id),
            };
          }),
      ),
    };
  },
});
export const listAdminProducts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

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
          skus: await getProductSkus(ctx, product._id),
        };
      }),
    );
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

    return await Promise.all(
      publishedProducts
        .filter((p) => activeCategoryIds.has(p.categoryId))
        .map(async (p) => {
          const category = activeCategories.find((c) => c._id === p.categoryId);
          return {
            _id: p._id,
            name_ar: p.name_ar,
            name_en: p.name_en,
            description_ar: p.description_ar,
            description_en: p.description_en,
            selling_price: p.selling_price,
            compareAtPrice: p.compareAtPrice,
            thumbnail: await resolveStorageRef(ctx, p.thumbnail),
            images: await resolveProductImages(ctx, p.images),
            categoryId: p.categoryId,
            slug: p.slug,
            isFeatured: p.isFeatured,
            categoryName: category?.name_en || "UNKNOWN",
            skus: await resolveSkuMedia(ctx, p._id),
          };
        }),
    );
  },
});








const advancedVariantInputValidator = v.object({
  id: v.optional(v.id("skus")),
  variantName: v.string(),
  variantAttributes: v.object({
    color: v.optional(v.string()),
    size: v.optional(v.string()),
    type: v.optional(v.string()),
  }),
  real_stock: v.number(),
  display_stock: v.number(),
  price: v.number(),
  compareAtPrice: v.optional(v.number()),
  linkedImageId: v.optional(v.union(v.string(), v.id("_storage"))),
  isDefault: v.optional(v.boolean()),
});

function sanitizeOptionalNumber(value: number | undefined, fieldLabel: string) {
  if (value === undefined) {
    return undefined;
  }

  return sanitizeNumber(value, fieldLabel);
}

function buildNormalizedAdvancedVariants(args: {
  variants: Array<{
    id?: Id<"skus">;
    variantName: string;
    variantAttributes: { color?: string; size?: string; type?: string };
    real_stock: number;
    display_stock: number;
    price: number;
    compareAtPrice?: number;
    linkedImageId?: string | Id<"_storage">;
    isDefault?: boolean;
  }>;
  name_en: string;
  selling_price: number;
  compareAtPrice?: number;
  images: Array<string | Id<"_storage">>;
}) {
  const fallbackVariant = {
    variantName: `${args.name_en} Default`,
    variantAttributes: {},
    real_stock: 0,
    display_stock: 0,
    price: args.selling_price,
    compareAtPrice: args.compareAtPrice,
    linkedImageId: args.images[0],
    isDefault: true,
  };

  return (args.variants.length > 0 ? args.variants : [fallbackVariant]).map(normalizeAdvancedVariant);
}

function normalizeAdvancedVariant(variant: {
  id?: Id<"skus">;
  variantName: string;
  variantAttributes: { color?: string; size?: string; type?: string };
  real_stock: number;
  display_stock: number;
  price: number;
  compareAtPrice?: number;
  linkedImageId?: string | Id<"_storage">;
  isDefault?: boolean;
}) {
  const variantName = variant.variantName.trim();
  if (!variantName) {
    throw new ConvexError({
      code: "INVALID_VARIANT",
      message: "Each variant requires a name.",
    });
  }

  return {
    id: variant.id,
    variantName,
    variantAttributes: {
      color: normalizeOptionalString(variant.variantAttributes.color),
      size: normalizeOptionalString(variant.variantAttributes.size),
      type: normalizeOptionalString(variant.variantAttributes.type),
    },
    real_stock: sanitizeNumber(variant.real_stock, "Variant real stock"),
    display_stock: sanitizeNumber(variant.display_stock, "Variant display stock"),
    price: sanitizeNumber(variant.price, "Variant price"),
    compareAtPrice: sanitizeOptionalNumber(variant.compareAtPrice, "Variant compare-at price"),
    linkedImageId: variant.linkedImageId,
    isDefault: variant.isDefault ?? false,
  };
}

async function replaceAdvancedProductSkus(
  ctx: Pick<MutationCtx, "db">,
  productId: Id<"products">,
  variants: Array<ReturnType<typeof normalizeAdvancedVariant>>,
  actorId?: Id<"users">,
) {
  const existingSkus = await ctx.db
    .query("skus")
    .withIndex("by_product", (q) => q.eq("productId", productId))
    .collect();

  const retainedIds = new Set<string>();

  for (const variant of variants) {
    const payload = {
      productId,
      variantName: variant.variantName,
      variantAttributes: variant.variantAttributes,
      real_stock: variant.real_stock,
      display_stock: variant.display_stock,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      linkedImageId: variant.linkedImageId,
      isDefault: variant.isDefault,
      isActive: true,
    };

    if (variant.id) {
      retainedIds.add(String(variant.id));
      await ctx.db.patch(variant.id, payload);
    } else {
      const insertedId = await ctx.db.insert("skus", payload);
      retainedIds.add(String(insertedId));
    }
  }

  // M2 FIX: Audit log every deleted SKU for full immutable trail.
  for (const existingSku of existingSkus) {
    if (!retainedIds.has(String(existingSku._id))) {
      await writeAuditLog(ctx, {
        userId: actorId,
        entityId: existingSku._id,
        actionType: "SKU_DELETED",
        changes: {
          productId,
          variantName: existingSku.variantName,
          variantAttributes: existingSku.variantAttributes,
          real_stock: existingSku.real_stock,
        },
      });
      await ctx.db.delete(existingSku._id);
    }
  }
}

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
    isFeatured: v.optional(v.boolean()),
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
    let slug = slugify(args.slug?.trim() || name_en);

    if (!name_en || !name_ar || !slug) {
      throw new ConvexError({
        code: "INVALID_PRODUCT",
        message: "Product names and slug are required.",
      });
    }

    slug = await generateUniqueProductSlug(ctx, slug);
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
      isFeatured: args.isFeatured,
    };

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
    isFeatured: v.optional(v.boolean()),
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
    let nextSlug = existing.slug || slugify(nextNameEn);
    
    if (args.slug !== undefined && args.slug.trim() !== "") {
      nextSlug = slugify(args.slug);
    } else if (args.name_en !== undefined) {
      // If the name was explicitly provided in the update, regenerate the slug
      nextSlug = slugify(nextNameEn);
    }
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

    nextSlug = await generateUniqueProductSlug(ctx, nextSlug, args.id);

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
      ...(args.isFeatured !== undefined ? { isFeatured: args.isFeatured } : {}),
      slug: nextSlug,
    };

    // Collect all existing storage IDs before update
    const oldStorageIds = new Set<string>();
    if (existing.thumbnail) oldStorageIds.add(existing.thumbnail as string);
    existing.images?.forEach((id) => oldStorageIds.add(id as string));
    const skus = await ctx.db
      .query("skus")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();
    skus.forEach((sku) => {
      if (sku.linkedImageId) oldStorageIds.add(sku.linkedImageId as string);
    });

    await ctx.db.patch(args.id, patch);

    // Collect all new storage IDs after update
    const newStorageIds = new Set<string>();
    const currentProduct = await ctx.db.get(args.id); // Refresh after patch
    if (currentProduct?.thumbnail) newStorageIds.add(currentProduct.thumbnail as string);
    currentProduct?.images?.forEach((id: string) => newStorageIds.add(id));
    // Re-check SKUs (they haven't changed in this mutation but we must ensure we don't delete their images)
    skus.forEach((sku) => {
      if (sku.linkedImageId) newStorageIds.add(sku.linkedImageId as string);
    });

    // Delete orphaned storage IDs
    for (const id of oldStorageIds) {
      if (!newStorageIds.has(id)) {
        try {
          await ctx.storage.delete(id as Id<"_storage">);
        } catch (error) {
          console.error(`Failed to delete orphaned product image ${id}:`, error);
        }
      }
    }

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "UPDATE_PRODUCT",
      changes: { previous: existing, updated: patch },
    });

    return { success: true };
  },
});

export const createAdvancedProduct = mutation({
  args: {
    categoryId: v.id("categories"),
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    thumbnail: v.optional(v.union(v.string(), v.id("_storage"))),
    images: v.array(v.union(v.string(), v.id("_storage"))),
    selling_price: v.number(),
    compareAtPrice: v.optional(v.number()),
    cogs: v.optional(v.number()),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"))),
    slug: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
    variants: v.array(advancedVariantInputValidator),
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
    let slug = slugify(args.slug?.trim() || name_en);

    if (!name_en || !name_ar || !slug) {
      throw new ConvexError({
        code: "INVALID_PRODUCT",
        message: "Product names and slug are required.",
      });
    }

    const normalizedVariants = buildNormalizedAdvancedVariants({
      variants: args.variants,
      name_en,
      selling_price: args.selling_price,
      compareAtPrice: args.compareAtPrice,
      images: args.images,
    });

    // C1 FIX: Do NOT aggregate stock onto the product root. Stock lives on skus table only.
    slug = await generateUniqueProductSlug(ctx, slug);
    const payload = {
      categoryId: args.categoryId,
      name_ar,
      name_en,
      description_ar: normalizeOptionalString(args.description_ar),
      description_en: normalizeOptionalString(args.description_en),
      thumbnail: args.thumbnail ?? args.images[0],
      images: args.images,
      selling_price: sanitizeNumber(args.selling_price, "Selling price"),
      compareAtPrice: sanitizeOptionalNumber(args.compareAtPrice, "Compare-at price"),
      cogs: sanitizeOptionalNumber(args.cogs, "COGS"),
      status: args.status ?? "DRAFT",
      name: name_en,
      price: args.selling_price,
      slug,
      isFeatured: args.isFeatured,
      isActive: args.status === "PUBLISHED",
    };
    const productId = await ctx.db.insert("products", payload);
    await replaceAdvancedProductSkus(ctx, productId, normalizedVariants, user._id);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: productId,
      actionType: "CREATE_ADVANCED_PRODUCT",
      changes: {
        product: payload,
        variants: normalizedVariants,
      },
    });

    return productId;
  },
});

export const updateAdvancedProduct = mutation({
  args: {
    id: v.id("products"),
    categoryId: v.id("categories"),
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    thumbnail: v.optional(v.union(v.string(), v.id("_storage"))),
    images: v.array(v.union(v.string(), v.id("_storage"))),
    selling_price: v.number(),
    compareAtPrice: v.optional(v.number()),
    cogs: v.optional(v.number()),
    status: v.optional(v.union(v.literal("DRAFT"), v.literal("PUBLISHED"))),
    slug: v.optional(v.string()),
    isFeatured: v.optional(v.boolean()),
    variants: v.array(advancedVariantInputValidator),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "MANAGE_PRODUCTS");
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError({ code: "PRODUCT_NOT_FOUND", message: "Product not found." });
    }

    if (args.status === "PUBLISHED") {
      await ensureActiveCategory(ctx, args.categoryId);
    } else {
      await ensureCategoryExists(ctx, args.categoryId);
    }

    const name_en = args.name_en.trim();
    const name_ar = args.name_ar.trim();
    let slug = slugify(args.slug?.trim() || name_en);

    if (!name_en || !name_ar || !slug) {
      throw new ConvexError({
        code: "INVALID_PRODUCT",
        message: "Product names and slug are required.",
      });
    }

    slug = await generateUniqueProductSlug(ctx, slug, args.id);

    const normalizedVariants = buildNormalizedAdvancedVariants({
      variants: args.variants,
      name_en,
      selling_price: args.selling_price,
      compareAtPrice: args.compareAtPrice,
      images: args.images,
    });

    // C1 FIX: Do NOT aggregate stock onto the product root. Stock lives on skus table only.
    const patch = {
      categoryId: args.categoryId,
      name_ar,
      name_en,
      description_ar: normalizeOptionalString(args.description_ar),
      description_en: normalizeOptionalString(args.description_en),
      thumbnail: args.thumbnail ?? args.images[0],
      images: args.images,
      selling_price: sanitizeNumber(args.selling_price, "Selling price"),
      compareAtPrice: sanitizeOptionalNumber(args.compareAtPrice, "Compare-at price"),
      cogs: sanitizeOptionalNumber(args.cogs, "COGS"),
      status: args.status ?? "DRAFT",
      name: name_en,
      price: args.selling_price,
      slug,
      isFeatured: args.isFeatured,
      isActive: args.status === "PUBLISHED",
    };

    // Collect all existing storage IDs before update
    const oldStorageIds = new Set<string>();
    if (existing.thumbnail) oldStorageIds.add(existing.thumbnail as string);
    existing.images.forEach((id) => oldStorageIds.add(id as string));
    const existingSkus = await ctx.db
      .query("skus")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();
    existingSkus.forEach((sku) => {
      if (sku.linkedImageId) oldStorageIds.add(sku.linkedImageId as string);
    });

    await ctx.db.patch(args.id, patch);
    await replaceAdvancedProductSkus(ctx, args.id, normalizedVariants, user._id);

    // Collect all current storage IDs after update
    const newStorageIds = new Set<string>();
    if (patch.thumbnail) newStorageIds.add(patch.thumbnail as string);
    patch.images.forEach((id) => newStorageIds.add(id as string));
    normalizedVariants.forEach((v) => {
      if (v.linkedImageId) newStorageIds.add(v.linkedImageId as string);
    });

    // Delete orphaned storage IDs
    for (const id of oldStorageIds) {
      if (!newStorageIds.has(id)) {
        try {
          await ctx.storage.delete(id as Id<"_storage">);
        } catch (error) {
          console.error(`Failed to delete orphaned product image ${id}:`, error);
        }
      }
    }

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.id,
      actionType: "UPDATE_ADVANCED_PRODUCT",
      changes: {
        previous: existing,
        updated: patch,
        variants: normalizedVariants,
      },
    });
  },
});
