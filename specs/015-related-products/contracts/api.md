# API Contracts: Related Products

## Convex Query: `getRelatedProducts`

This query fetches up to 4 related products for a given product ID.

**Path**: `convex/products:getRelatedProducts`

### Request

```typescript
{
  productId: Id<"products">
}
```

### Response

Returns an array of up to 4 serialized product objects.

```typescript
Array<{
  _id: Id<"products">,
  name_en: string,
  name_ar: string,
  selling_price: number,
  compareAtPrice?: number,
  thumbnailUrl: string | null,
  slug: string
}>
```

### Logic

1. Look up the original product by `productId`.
2. Extract its `related_product_ids` and `categoryId`.
3. First, fetch any products explicitly listed in `related_product_ids` that are `PUBLISHED` and have `real_stock > 0` (or `isActive` depending on how stock is checked). Since stock is in `skus` table, it might just check `status === "PUBLISHED"`. Wait, the spec says "exclude out-of-stock products". So we must query `skus` for each candidate product to verify `real_stock > 0`.
4. If fewer than 4 products are found, query `products` by `categoryId`, excluding the original `productId`, ensuring they are `PUBLISHED` and in-stock, until 4 products are collected.
5. Return the mapped results.
