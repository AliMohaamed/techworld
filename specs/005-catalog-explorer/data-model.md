# Data Model: Advanced Catalog & Categories Explorer

This feature primarily relies on reading existing tables but imposes strict index constraints to power the new querying endpoints.

## Entity: `products` (Existing Table)
The core entity being queried by `searchAndFilter`.

**Required Schema Fields & Types:**
- `categoryId`: `v.id("categories")` -> Required for facet filtering.
- `selling_price` (or `price`): `v.number()` -> Required for min/max price bounds filtering.
- `name`: `v.string()` -> Required for free-text user search queries.
- `isActive`: `v.boolean()` -> Must strictly be validated as `true` during queries to prevent exposing drafts.
- `real_stock`: `v.number()` -> Used for display logic and fallback checks (if out of stock items are rendered differently).

**Required Indices:**
1. **Search Index**: An explicit `searchIndex` named `search_name` targeting the `name` field.
2. **Access Index**: An explicit index mapping `categoryId` for optimal lookup when a user clicks a Category card routing to `/categories/[id]`.

## Entity: `categories` (Existing Table)
The entity consumed by the Overview page and Sidebar filters.

**Required Schema Fields & Types:**
- `isActive`: `v.boolean()` -> The primary constraint for `api.categories.listActiveCategories`.
- `name` / `name_ar` / `name_en`: `v.string()` -> Dual language parsing mapping to Storefront UI labels.
- `thumbnailUrl`: `v.optional(v.string())` -> The visual anchor for the Grid cards on `/categories`.
