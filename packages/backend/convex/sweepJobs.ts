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



/**
 * H3 FIX: Orphan sweep using metadata collection to avoid multiple paginated calls.
 *
 * Strategy:
 * 1. Collects all product/sku/category records for reference analysis.
 * 2. Scans `_storage` and deletes files that match no referenced IDs.
 * 
 * This is safe at current scale and complies with Convex's single-pagination constraint.
 */
export const sweepOrphanedCatalogFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const referencedIds = new Set<string>();

    // Build the referenced set by paging through each entity table separately.
    // Each table is scanned in PAGE_SIZE chunks to stay within memory limits.
    // Build the referenced set by collecting all entity rows.
    // NOTE: This assumes table sizes are within memory limits for metadata extraction.
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      collectReferencedStorageIds([product.thumbnail], referencedIds);
      collectReferencedStorageIds(product.images, referencedIds);
    }

    const skus = await ctx.db.query("skus").collect();
    for (const sku of skus) {
      collectReferencedStorageIds([sku.linkedImageId], referencedIds);
    }

    const categories = await ctx.db.query("categories").collect();
    for (const category of categories) {
      collectReferencedStorageIds([category.thumbnailImageId], referencedIds);
    }

    // Now scan _storage and delete unreferenced files.
    let deletedCount = 0;
    const storageFiles = await ctx.db.system.query("_storage").collect();

    for (const file of storageFiles) {
      if (!referencedIds.has(String(file._id))) {
        await ctx.storage.delete(file._id);
        deletedCount += 1;
      }
    }

    return {
      deletedCount,
      referencedCount: referencedIds.size,
    };
  },
});
