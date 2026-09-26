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

Returns up to 4 products shaped for the storefront `ProductCard`. Only public fields are returned (no `cogs`, no `real_stock`).

```typescript
Array<{
  _id: Id<"products">,
  name_en: string,
  name_ar: string,
  description_en?: string,
  description_ar?: string,
  slug: string,                 // products without a slug are excluded
  thumbnail: string | null,     // thumbnail, falling back to images[0]
  images: string[],             // always [] — the card uses `thumbnail`
  selling_price: number,
  compareAtPrice?: number,
  isFeatured?: boolean,
  categoryName_en?: string,
  categoryName_ar?: string,
  ratingAverage: number,
  reviewCount: number,
  skus: [{                      // exactly one: the purchasable SKU the card prices and adds to cart
    _id: Id<"skus">,
    price: number,
    compareAtPrice?: number,
    display_stock: number,
    isDefault: true,
    variantName: string,
  }],
}>
```

### Logic

A candidate is eligible when it is not the current product, is `PUBLISHED`, not deactivated, has a slug, belongs to an active category, and has at least one active SKU with `display_stock > 0` (the same availability signal the product page uses).

1. Look up the current product; return `[]` if it is missing or not `PUBLISHED`.
2. Take eligible products from `related_product_ids`, in curated order.
3. If fewer than 4, read at most 24 same-category `PUBLISHED` products via `by_category_status_sort_order`, drop ineligible ones, and rank by: price proximity to the current product (60%), rating weighted by review count (25%), featured (15%).
4. Price each card from its purchasable SKU (default SKU if in stock, else the first in-stock active SKU).
