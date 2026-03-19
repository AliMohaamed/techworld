# Feature Specification: Phase 7 - Advanced Catalog, Variants, Media Gallery & Sale Pricing

**Feature Branch**: `007-advanced-catalog`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Phase 7 - Advanced Catalog, Variants, Media Gallery & Sale Pricing"

## Clarifications

### Session 2026-03-19
- Q: Schema Normalization for Simple Products → A: Unified SKU Architecture (All products have at least one implicitly created Default Variant)
- Q: Convex File Storage Orphan Cleanup → A: Backend CRON Sweep (A scheduled Convex CRON job periodically scans for and deletes unreferenced File IDs)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create/Edit Product with Variants, Images & Pricing (Priority: P1)

As an authorized Catalog Manager, I want to manage a product with variants (e.g., Color, Size), upload images to a media gallery, link specific images to variants, and define sale pricing, all within a modern in-page modal or sliding panel, so that I can easily create complex product offerings without losing context of the current dashboard view.

**Why this priority**: Managing products with variants and proper images is the core driver for catalog richness.

**Independent Test**: Can be fully tested by opening the modal in the dashboard, filling out product info, uploading multiple images, assigning them to different color variants, setting an original sale price, and saving successfully.

**Acceptance Scenarios**:

1. **Given** I am in the Admin Dashboard with the `MANAGE_PRODUCTS` permission, **When** I initiate adding a new product, **Then** an in-page modal/panel opens to collect the product details.
2. **Given** I am creating a product, **When** I define a Color variant (e.g., "Black"), **Then** I am able to input variant-specific physical stock, display stock, and assign uploaded images to this variant.
3. **Given** I am editing a product's pricing in the modal, **When** I enter a `compareAtPrice` greater than the regular `price`, **Then** the value is successfully saved.

---

### User Story 2 - Storefront Dynamic Product Presentation (Priority: P1)

As a Customer, I want to view a product on the storefront, select a variant color, see the main product image instantly update to match my selection, and see the original higher price crossed out, so that I am confident in my selection and motivated by the sale.

**Why this priority**: Displaying correct variant imagery and sale pricing directly influences conversion rates and buyer confidence.

**Independent Test**: Can be fully tested by loading the Product Details Page for a variant-enabled product, tapping a color block, and observing the gallery image swap and the pricing display.

**Acceptance Scenarios**:

1. **Given** I am on a Product Details Page with multiple color variants, **When** I tap the "Red" color swatch, **Then** the main product gallery image instantly syncs to display the image linked to the "Red" variant.
2. **Given** a product has a `compareAtPrice` higher than its `price`, **When** I view the product on the catalog or details page, **Then** the `compareAtPrice` is visually struck through next to the current selling price.

---

### Edge Cases

- **File Abandonment**: What happens if an administrator uploads images to backend storage but abandons the modal without saving the product?
  - A scheduled backend CRON job must periodically sweep and delete File IDs that are not referenced by any Product, Variant, or Category to prevent storage bloat.
- **Negative Concurrency Collisions**: How does the system handle "Negative Concurrency Collisions" (e.g., multiple concurrent verifications when physical stock is 1) for this flow?
  - Stock validation logic must be explicitly moved to the variant level, ensuring that stock deductions explicitly lock and deduct from the specific SKU (variant) selected, not just the parent Product.
- **Orphaned Images**: What happens when a variant color is deleted, but images are still linked to it?
  - The variant deletion must cascade safely, unlinking the images instead of leaving broken references, while retaining the images in the parent product gallery.
- **Images Missing**: How does the system handle an active variant that has no linked images?
  - The storefront safely defaults to the main product thumbnail image.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support secure file uploads directly to backend file storage for assigning a main thumbnail and a comprehensive gallery of images per product.
- **FR-002**: System MUST permit products to define dynamic variants mapping (e.g., Color -> Red, Size -> L).
- **FR-003**: System MUST track true physical stock and marketing display stock discretely at the variant (SKU) level rather than the parent Product level.
- **FR-004**: System MUST allow authorized admins to link specific uploaded gallery images to specific Color variants.
- **FR-005**: System MUST support an optional `compareAtPrice` field to represent the higher original price before the current sale `price`.
- **FR-006**: System MUST ensure Category and Product CRUD interfaces operate entirely within responsive in-page panels without full-page navigation.

### Key Entities

- **Product**: The primary catalog container. Must act as the umbrella grouping variants, containing a main `thumbnail` file reference, an `images` array of file references, a base `price`, and an optional `compareAtPrice`. Every Product must explicitly possess at least one Variant (even an invisible "Default" Variant) to unify all inventory deduction and display paths.
- **Variant (SKU)**: The specific instantiation of a product (e.g., Color="Black", Size="XL", or "Default"). Must track explicit physical stock and display stock. Must optionally reference specific image file resources to support visual changing upon selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created catalog entries originate from the overlapping modal or panel interfaces rather than full-page navigations.
- **SC-002**: Administrators successfully upload, preview, and assign image resources to product variants without navigation disruptions.
- **SC-003**: Customer interactions on a product page update the main image instantly when a valid color variant is selected, without triggering full page reloads.
- **SC-004**: Products with a valid `compareAtPrice` higher than `price` seamlessly render the strikethrough styling across all relevant storefront views.
