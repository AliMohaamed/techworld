# Phase 1: Data Model Design

## Convex Schema Migrations

To support Phase 7 requirements, the core `catalog` schema strictly enforces the "Unified SKU Architecture". This necessitates isolating `real_stock` and pricing concerns into a dedicated `skus` table and leveraging `Id<"_storage">` extensively.

### 1. `products` Entity

**Purpose:** Grouping entity that stores overarching data (name, category, description) and acts as the presentation container for the storefront.

**Fields:**
- `_id`: `Id<"products">`
- `categoryId`: `Id<"categories">`
- `name`: string (localized)
- `description`: string (localized)
- `thumbnail`: `Id<"_storage">` (The default primary image shown in catalog lists)
- `images`: `Array<Id<"_storage">>` (The shared gallery array for the product)
- `isActive`: boolean (governs Storefront visibility)

**Note on Constraint Enforcement:** `real_stock` and `price` fields from previous versions must be eliminated or migrated downwards to the `skus` relation during data transfer. All products are required to have at least one valid reference in the `skus` table.

### 2. `skus` (Variants) Entity

**Purpose:** The physical truth of the inventory and the driver of checkouts. Stores exactly *what* is being bought, the available amount, and the variant's price.

**Fields:**
- `_id`: `Id<"skus">`
- `productId`: `Id<"products">` (Foreign key linking back to the parent container)
- `variantName`: string (e.g., "iPhone 15 Black L" or "Default" if a simple product)
- `variantAttributes`: object `{ color?: string, size?: string, type?: string }` (For strict selection mapping on Storefront PDPs)
- `real_stock`: number (The exact physical truth, strictly bounded to > 0 during atomic deductions)
- `display_stock`: number (Configurable visual quantity for psychological checkout urgency)
- `price`: number (Current active selling price)
- `compareAtPrice`: number | undefined (The higher original sale price resulting in a strikethrough visual)
- `linkedImageId`: `Id<"_storage">` | undefined (References the specific image from the parent `products.images` array that corresponds to "Black" or "XL")

### State Transitions (Implicit via Checkouts)
- **CONFIRMED Order State**: Triggers a `.patch(skuId, { real_stock: current - quantity })` bound inside an atomic mutex/transaction protecting against "Negative Concurrency Collisions" strictly for that `skuId`.

## Audit Logging Implications
Any `patch` or `insert` involving a `sku` record's `real_stock`, `price`, or `compareAtPrice` explicitly dispatches an event to the `audit_logs` table citing the initiating Administrator session and the `PRE`/`POST` mutation state JSON.
