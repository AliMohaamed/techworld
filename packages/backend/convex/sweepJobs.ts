import { internalMutation } from "./_generated/server";

function collectReferencedStorageIds(values: Array<string | undefined | null>, collector: Set<string>) {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      collector.add(value);
    }
  }
}

export const sweepOrphanedCatalogFiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const referencedIds = new Set<string>();

    const [categories, products, skus, storedFiles] = await Promise.all([
      ctx.db.query("categories").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("skus").collect(),
      ctx.db.system.query("_storage").collect(),
    ]);

    for (const category of categories) {
      collectReferencedStorageIds([category.thumbnailImageId], referencedIds);
    }

    for (const product of products) {
      collectReferencedStorageIds([product.thumbnail], referencedIds);
      collectReferencedStorageIds(product.images, referencedIds);
    }

    for (const sku of skus) {
      collectReferencedStorageIds([sku.linkedImageId], referencedIds);
    }

    let deletedCount = 0;
    for (const file of storedFiles) {
      if (referencedIds.has(file._id)) {
        continue;
      }

      await ctx.storage.delete(file._id);
      deletedCount += 1;
    }

    return {
      deletedCount,
      referencedCount: referencedIds.size,
      scannedCount: storedFiles.length,
    };
  },
});
