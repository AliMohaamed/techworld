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
    skipped?: string;
  }> => {
    // The R2 bucket is shared across Convex deployments, so a sweep driven by
    // one deployment's database sees every other deployment's objects as
    // orphans. Deleting is therefore opt-in and only safe once each deployment
    // owns its own bucket (or key namespace).
    if (process.env.R2_SWEEP_ENABLED !== "true") {
      console.warn(
        "R2 orphan sweep skipped: set R2_SWEEP_ENABLED=true on this deployment to enable it."
      );
      return { deletedR2Count: 0, referencedCount: 0, skipped: "disabled" };
    }

    // 1. Fetch DB metadata
    const { referencedRefs } = await ctx.runQuery(
      internal.sweepJobs.getSweepMetadata
    );

    const referencedSet = new Set(referencedRefs);

    // An empty reference set means the query found nothing to protect, which
    // would delete the whole bucket. Treat it as a bug, not as "all orphaned".
    if (referencedSet.size === 0) {
      console.error("R2 orphan sweep aborted: no referenced refs found.");
      return { deletedR2Count: 0, referencedCount: 0, skipped: "no-references" };
    }

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
    const orphanKeys = r2Keys.filter((key) => !referencedSet.has(`r2:${key}`));

    // Refuse to run when the "orphans" are most of the bucket — that is the
    // signature of a misconfiguration (wrong deployment, wrong bucket, partial
    // migration), not of genuine garbage.
    if (r2Keys.length > 0 && orphanKeys.length > r2Keys.length * 0.2) {
      console.error(
        `R2 orphan sweep aborted: ${orphanKeys.length} of ${r2Keys.length} objects looked orphaned.`
      );
      return {
        deletedR2Count: 0,
        referencedCount: referencedSet.size,
        skipped: "too-many-orphans",
      };
    }

    let deletedR2Count = 0;
    for (const key of orphanKeys) {
      try {
        await r2.deleteObject(key);
        deletedR2Count++;
      } catch (error) {
        console.error(`Failed to delete orphaned R2 object ${key}:`, error);
      }
    }

    return {
      deletedR2Count,
      referencedCount: referencedSet.size,
    };
  },
});
