# Phase 1: Design

## Data Model

This feature leverages the existing Convex `products` table. No schema changes are required.

### Entities

**Product**
- `_id`: Id<"products"> (The product's unique ID)
- `categoryId`: Id<"categories"> (Used for fallback matching)
- `related_product_ids`: optional array of Id<"products"> (Primary relationship indicator)
- `selling_price`: number (Needed for display)
- `name_en` / `name_ar` (Needed for title display)
- `thumbnail` / `images` (Needed for image display)
- `status`: "PUBLISHED" (Must be filtered to published products only)

### State Transitions

None. The feature is read-only.
