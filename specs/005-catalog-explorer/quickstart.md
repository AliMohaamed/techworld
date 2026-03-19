# Quickstart: Advanced Catalog & Categories Explorer

## Pre-requisites & Local Testing

1. **Database Schema Setup:**
   Confirm that your `convex/schema.ts` includes the required search indexes on the `products` table before executing queries:
   ```typescript
   export default defineSchema({
     products: defineTable({
       // ... fields
     })
     .index("by_category", ["categoryId"])
     .searchIndex("search_name", { searchField: "name" }),
   });
   ```

2. **Populating Mock Data:**
   Use the admin dashboard (or a Convex mutation script) to seed active Categories and Products. Ensure at least one product maps to each category to effectively verify the filter drawer.

3. **URL State Parsing Flow:**
   When testing the `/products` page UI, manually append `?searchQuery=test&minPrice=100` to the URL. If the page hydrates perfectly respecting the filters without interaction, the URL synchronization logic is operating correctly.
