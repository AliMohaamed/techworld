import { internalAction, internalQuery } from "./_generated/server";
import * as r2 from "./lib/r2";
import { internal } from "./_generated/api";

/**
 * Internal query to collect all referenced storage reference strings from the
 * transactional database. All storage now lives in Cloudflare R2 (the legacy
 * Convex _storage migration is complete), so only R2 refs are collected.
 */
export const getSweepMetadata = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ referencedRefs: string[] }> => {
    const referencedRefs = new Set<string>();

    // 1. Gather product refs (thumbnail & gallery images)
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      if (product.thumbnail) {
        referencedRefs.add(product.thumbnail);
      }
      product.images?.forEach((img) => {
        if (img) referencedRefs.add(img);
      });
    }

    // 2. Gather SKU refs (linkedImageId)
    const skus = await ctx.db.query("skus").collect();
    for (const sku of skus) {
      if (sku.linkedImageId) {
        referencedRefs.add(sku.linkedImageId);
      }
    }

    // 3. Gather category refs (thumbnailImageId)
    const categories = await ctx.db.query("categories").collect();
    for (const category of categories) {
      if (category.thumbnailImageId) {
        referencedRefs.add(category.thumbnailImageId);
      }
    }

    // 4. Gather order payment receipts (paymentReceiptRef)
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      if (order.paymentReceiptRef) {
        referencedRefs.add(order.paymentReceiptRef);
      }
    }

    return {
      referencedRefs: Array.from(referencedRefs),
    };
  },
});

/**
 * Sweep orphaned catalog files from Cloudflare R2.
 * Runs as an action because it performs HTTP calls to the Cloudflare R2 API.
 */
export const sweepOrphanedCatalogFiles = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    deletedR2Count: number;
    referencedCount: number;
  }> => {
    // 1. Fetch DB metadata
    const { referencedRefs } = await ctx.runQuery(
      internal.sweepJobs.getSweepMetadata
    );

    const referencedSet = new Set(referencedRefs);

    // 2. List all objects currently stored in Cloudflare R2 bucket under public/ and receipts/
    const r2Keys: string[] = [];

    // Paginate through public/
    let continuationToken: string | undefined = undefined;
    do {
      const result = await r2.listObjects("public/", continuationToken);
      r2Keys.push(...result.keys);
      continuationToken = result.nextToken;
    } while (continuationToken);

    // Paginate through receipts/
    continuationToken = undefined;
    do {
      const result = await r2.listObjects("receipts/", continuationToken);
      r2Keys.push(...result.keys);
      continuationToken = result.nextToken;
    } while (continuationToken);

    // 3. Delete unreferenced objects in Cloudflare R2
    let deletedR2Count = 0;
    for (const key of r2Keys) {
      const ref = `r2:${key}`;
      if (!referencedSet.has(ref)) {
        try {
          await r2.deleteObject(key);
          deletedR2Count++;
        } catch (error) {
          console.error(`Failed to delete orphaned R2 object ${key}:`, error);
        }
      }
    }

    return {
      deletedR2Count,
      referencedCount: referencedSet.size,
    };
  },
});
