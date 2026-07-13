import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

/**
 * Validates that the provided client token matches the backend MIGRATION_TOKEN environment variable.
 */
function checkToken(token: string) {
  const secret = process.env.MIGRATION_TOKEN;
  if (!secret) {
    throw new ConvexError({
      code: "CONFIGURATION_ERROR",
      message: "Backend MIGRATION_TOKEN env var is not set in the Convex dashboard.",
    });
  }
  if (token !== secret) {
    throw new ConvexError({
      code: "UNAUTHORIZED",
      message: "Provided token does not match the server MIGRATION_TOKEN.",
    });
  }
}

/**
 * Paginates through a given table and lists all fields containing legacy storage references
 * (those that do not start with "r2:").
 */
export const listRefsToMigrate = query({
  args: {
    table: v.string(),
    cursor: v.union(v.string(), v.null()),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);

    const table = args.table;
    if (!["products", "categories", "skus", "orders"].includes(table)) {
      throw new Error(`Unsupported table name: ${table}`);
    }

    // Paginate through the target table. Return 100 documents per batch.
    const paginated = await ctx.db
      .query(table as any)
      .paginate({
        numItems: 100,
        cursor: args.cursor,
      });

    const refs: Array<{ docId: string; field: string; ref: string }> = [];

    for (const doc of paginated.page) {
      const docId = doc._id;

      if (table === "products") {
        if (doc.thumbnail) {
          const refStr = String(doc.thumbnail);
          if (!refStr.startsWith("r2:")) {
            refs.push({ docId, field: "thumbnail", ref: refStr });
          }
        }
        if (doc.images && Array.isArray(doc.images)) {
          doc.images.forEach((img: any, i: number) => {
            if (img) {
              const refStr = String(img);
              if (!refStr.startsWith("r2:")) {
                refs.push({ docId, field: `images[${i}]`, ref: refStr });
              }
            }
          });
        }
      } else if (table === "skus") {
        if (doc.linkedImageId) {
          const refStr = String(doc.linkedImageId);
          if (!refStr.startsWith("r2:")) {
            refs.push({ docId, field: "linkedImageId", ref: refStr });
          }
        }
      } else if (table === "categories") {
        if (doc.thumbnailImageId) {
          const refStr = String(doc.thumbnailImageId);
          if (!refStr.startsWith("r2:")) {
            refs.push({ docId, field: "thumbnailImageId", ref: refStr });
          }
        }
      } else if (table === "orders") {
        if (doc.paymentReceiptRef) {
          const refStr = String(doc.paymentReceiptRef);
          if (!refStr.startsWith("r2:")) {
            refs.push({ docId, field: "paymentReceiptRef", ref: refStr });
          }
        }
      }
    }

    return {
      refs,
      nextCursor: paginated.continueCursor,
      isDone: paginated.isDone,
    };
  },
});

/**
 * Patches a product document with its new R2 storage reference.
 * Supports updating both "thumbnail" and "images[index]" fields.
 */
export const patchProductRef = mutation({
  args: {
    docId: v.id("products"),
    field: v.string(),
    newRef: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);

    const product = await ctx.db.get(args.docId);
    if (!product) {
      throw new Error(`Product ${args.docId} not found`);
    }

    if (args.field === "thumbnail") {
      await ctx.db.patch(args.docId, { thumbnail: args.newRef });
    } else if (args.field.startsWith("images[")) {
      const match = args.field.match(/images\[(\d+)\]/);
      if (!match) {
        throw new Error(`Invalid images field format: ${args.field}`);
      }
      const index = parseInt(match[1], 10);
      const images = [...(product.images || [])];
      if (index < 0 || index >= images.length) {
        throw new Error(`Images index ${index} out of bounds for product ${args.docId}`);
      }
      images[index] = args.newRef;
      await ctx.db.patch(args.docId, { images });
    } else {
      throw new Error(`Unknown field name ${args.field} for products`);
    }
  },
});

/**
 * Patches a SKU document's linked image reference.
 */
export const patchSkuRef = mutation({
  args: {
    docId: v.id("skus"),
    newRef: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);

    const sku = await ctx.db.get(args.docId);
    if (!sku) {
      throw new Error(`SKU ${args.docId} not found`);
    }

    await ctx.db.patch(args.docId, { linkedImageId: args.newRef });
  },
});

/**
 * Patches a category document's thumbnail reference.
 */
export const patchCategoryRef = mutation({
  args: {
    docId: v.id("categories"),
    newRef: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);

    const category = await ctx.db.get(args.docId);
    if (!category) {
      throw new Error(`Category ${args.docId} not found`);
    }

    await ctx.db.patch(args.docId, { thumbnailImageId: args.newRef });
  },
});

/**
 * Patches an order document's payment receipt reference.
 */
export const patchOrderReceiptRef = mutation({
  args: {
    docId: v.id("orders"),
    newRef: v.string(),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);

    const order = await ctx.db.get(args.docId);
    if (!order) {
      throw new Error(`Order ${args.docId} not found`);
    }

    await ctx.db.patch(args.docId, { paymentReceiptRef: args.newRef });
  },
});

/**
 * Clears an order's payment receipt reference (removes the field entirely).
 * Used to reconcile orders whose legacy Convex receipt blob was unrecoverable
 * before the R2 migration (the underlying file no longer resolved).
 */
export const clearOrderReceiptRef = mutation({
  args: {
    docId: v.id("orders"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);

    const order = await ctx.db.get(args.docId);
    if (!order) {
      throw new Error(`Order ${args.docId} not found`);
    }

    await ctx.db.patch(args.docId, { paymentReceiptRef: undefined });
    return { docId: args.docId, cleared: true, previousRef: order.paymentReceiptRef ?? null };
  },
});

/**
 * Deletes a file from legacy Convex storage.
 * Used exclusively by the migration script --reap-convex cleanup step.
 */
export const deleteLegacyConvexFile = mutation({
  args: {
    storageId: v.id("_storage"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    checkToken(args.token);
    try {
      await ctx.storage.delete(args.storageId);
    } catch (error) {
      console.error(`Failed to delete legacy storage ID ${args.storageId}:`, error);
      throw error;
    }
  },
});
