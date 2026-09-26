# Quickstart: Related Products

This document provides a quick overview of how the Related Products feature is structured and how to begin development.

## Overview

The feature adds a "Related Products" section at the bottom of the Product Details page. It fetches up to 4 related products using a new Convex query. The section is implemented as a responsive layout: a swipeable carousel on mobile devices and a static 4-column grid on desktop devices.

## Key Files to Edit

1. `packages/backend/convex/products.ts`
   - Implement the `getRelatedProducts` query.
   - It should prioritize explicit `related_product_ids`, then fallback to `categoryId`.
   - It must filter out unpublished products and products that have no `real_stock` > 0 in the `skus` table.

2. `apps/storefront/src/components/storefront/related-products.tsx`
   - Create this new React component.
   - It will use the `useQuery` hook to call `api.products.getRelatedProducts`.
   - It will render a skeleton loader while loading.
   - If the query fails after a retry, or returns 0 products, the component returns `null`.
   - Use CSS Grid and Flexbox with `overflow-x-auto snap-x` for the responsive layout.

3. `apps/storefront/src/app/[locale]/(store)/products/[slug]/page.tsx`
   - Import and render `<RelatedProducts productId={product._id} />` at the bottom of the page, above the footer.

## Testing Setup

- Verify that querying related products successfully handles empty `related_product_ids`.
- Verify the mobile carousel works via touch emulation in Chrome DevTools.
- Verify desktop grid layout.
- Ensure out-of-stock products are truly excluded by adjusting stock in the admin panel or DB and reloading the page.
