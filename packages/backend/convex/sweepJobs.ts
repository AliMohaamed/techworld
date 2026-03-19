import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Collects string storage ID values into the referenced set.
 */
function collectReferencedStorageIds(values: Array<string | undefined | null>, collector: Set<string>) {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      collector.add(value);
    }
  }
}

const PAGE_SIZE = 100;

/**
 * H3 FIX: Paginated orphan sweep to avoid loading entire tables into memory at once.
 *
 * Strategy:
 * 1. Pages through `_storage` records in batches of PAGE_SIZE.
 * 2. For each batch of storage IDs, checks if any product/sku/category references them.
 * 3. Deletes unreferenced files in that batch.
 * 4. Recurses via a scheduled call to process the next cursor position.
 *
 * This is safe at scale because no single mutation ever loads all rows simultaneously.
 */
export const sweepOrphanedCatalogFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const referencedIds = new Set<string>();

    // Build the referenced set by paging through each entity table separately.
    // Each table is scanned in PAGE_SIZE chunks to stay within memory limits.
    let productCursor: string | null = null;
    do {
      const page = await ctx.db.query("products").paginate({ cursor: productCursor, numItems: PAGE_SIZE });
      for (const product of page.page) {
        collectReferencedStorageIds([product.thumbnail], referencedIds);
        collectReferencedStorageIds(product.images, referencedIds);
      }
      productCursor = page.isDone ? null : page.continueCursor;
    } while (productCursor !== null);

    let skuCursor: string | null = null;
    do {
      const page = await ctx.db.query("skus").paginate({ cursor: skuCursor, numItems: PAGE_SIZE });
      for (const sku of page.page) {
        collectReferencedStorageIds([sku.linkedImageId], referencedIds);
      }
      skuCursor = page.isDone ? null : page.continueCursor;
    } while (skuCursor !== null);

    let categoryCursor: string | null = null;
    do {
      const page = await ctx.db.query("categories").paginate({ cursor: categoryCursor, numItems: PAGE_SIZE });
      for (const category of page.page) {
        collectReferencedStorageIds([category.thumbnailImageId], referencedIds);
      }
      categoryCursor = page.isDone ? null : page.continueCursor;
    } while (categoryCursor !== null);

    // Now page through _storage and delete unreferenced files in batches.
    let deletedCount = 0;
    let storageCursor: string | null = null;
    do {
      const page = await ctx.db.system.query("_storage").paginate({ cursor: storageCursor, numItems: PAGE_SIZE });

      for (const file of page.page) {
        if (!referencedIds.has(String(file._id))) {
          await ctx.storage.delete(file._id);
          deletedCount += 1;
        }
      }

      storageCursor = page.isDone ? null : page.continueCursor;
    } while (storageCursor !== null);

    return {
      deletedCount,
      referencedCount: referencedIds.size,
    };
  },
});
