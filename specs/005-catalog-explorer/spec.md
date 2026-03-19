# Feature Specification: Advanced Catalog & Categories Explorer

**Feature Branch**: `005-catalog-explorer`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Advanced Catalog & Categories Explorer"

## Clarifications

### Session 2026-03-19
- Q: In the Advanced Catalog Page (`/products`), how should the UI handle loading a large number of products (e.g., results of a broad filter)? → A: "Load More" Button (explicit user action)
- Q: Does the feature require a free-text search input alongside structured filters? → A: Option A - Yes, include a free-text search bar (keyword search) alongside filters
- Q: How should the system handle empty states when a search/filter combination returns 0 results? → A: Option B - "No products found" text alongside a "Recommended products/Categories" fallback
- Q: Should the filtering include dynamic SKU-level attributes (Color, Size)? → A: Option B - No, limit structured filtering strictly to top-level Product parameters (Category, Price, Sort)
- Q: How should the system handle filter state persistence on navigation/refresh? → A: Option A - Store filter state in URL Query Parameters (persists on back/refresh, shareable via link)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Advanced Catalog Search and Filtering (Priority: P1)

As a Mobile Customer, I want to access a comprehensive product listing page (`/products`) with a mobile-first bottom-sheet drawer for filtering by Category and optionally Price range/sort, so that I can easily discover specific items without a cluttered interface.

**Why this priority**: Discoverability is deeply tied to conversion in a large e-commerce catalog. Mobile traffic drives the most volume, and bottom-drawer UI patterns are highly effective in maximizing limited screen real estate.

**Independent Test**: Can be fully tested by opening the `/products` page on a mobile device/simulator, triggering the filter drawer, applying multiple filters, and verifying the correct filtered results are displayed immediately.

**Acceptance Scenarios**:

1. **Given** a user is on `/products`, **When** they tap the filter button, **Then** a bottom-sheet (mobile) or sidebar (desktop) filter interface should open seamlessly.
2. **Given** the filter UI is open, **When** the user selects a Category, adjusts Price range, and taps 'Apply', **Then** the product list dynamically updates based on a new backend query without a full page reload.

---

### User Story 2 - Categories Overview Exploration (Priority: P2)

As a Customer, I want to navigate to a visual Category Overview page (`/categories`) showcasing all active categories as grid/list cards, clicking any of which navigates to its related products, so I can intuitively browse and explore broad themes rather than individual SKUs.

**Why this priority**: Reduces cognitive friction for top-of-funnel users who may not know exactly what product they want but know the specific area of interest. 

**Independent Test**: Can be fully tested by loading the `/categories` page and clicking any active category card to ensure correct routing.

**Acceptance Scenarios**:

1. **Given** a user lands on `/categories`, **When** the page loads, **Then** it displays an organized, visually appealing grid or list of all active categories.
2. **Given** a visible category card, **When** clicked, **Then** the user is redirected cleanly to the category detail page at (`/categories/[id]`).

### Edge Cases

- What happens if the backend query returns no results after applying very specific filters? 
  - **Resolution**: The system displays a "No products found" message with a "Clear Filters" CTA, and additionally renders a fallback "Recommended Products" section to prevent users from dropping off.
- How does the system handle an inactive category being accessed directly via URL if bookmarked? (Assumption: direct access routes back to `/categories` gracefully).
- Does the mobile filter drawer correctly persist applied filters when closed and reopened?
  - **Resolution**: Yes, because filter state is implicitly bound directly to the URL Query string, opening/closing the drawer or navigating away and back preserves all active selections natively.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement an Advanced Catalog Page (`/products`) adhering to Dark Mode and the Space Grotesk font with #ffc105 accents, mapping to the visual tokens of the Stitch MCP specs. It MUST include a free-text search bar for keyword-based product discovery.
- **FR-002**: The storefront MUST provide a mobile-friendly bottom-sheet (and desktop sidebar) for filtering the catalog strictly by top-level product parameters (Category, Price range, and Sort methods). Dynamic SKU-level filtering (Color, Size, etc.) is out-of-scope for this iteration.
- **FR-003**: The backend MUST expose a new Convex query endpoint (e.g., `api.products.searchAndFilter`) designed to efficiently resolve variables like active filters and searches. It MUST support paginated fetching to power the "Load More" functionality.
- **FR-004**: The system MUST implement a Categories Overview Page (`/categories`) displaying active categories leveraging the existing `api.categories.listActiveCategories` query.
- **FR-005**: Navigating from a category card MUST route the user correctly to the filtered detail view at `/categories/[id]`.
- **FR-006**: The `/products` catalog page MUST implement a "Load More" button for fetching additional products, rather than infinite scrolling, to preserve user access to the global footer.
- **FR-007**: The storefront MUST synchronize all applied filter and search states directly with the URL Query parameters to ensure shareability and seamless browser history navigation.

### Key Entities

- **Category**: High-level grouping entity. The overview page and filter dependencies rely directly on active Category entities.
- **Product Filter Endpoint**: A backend structure ensuring atomic, rapid querying of Products that map correctly to their physical parameters without exposing internal metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of filtered catalog queries respond on the frontend in under 300 milliseconds.
- **SC-002**: Users can successfully launch the filter drawer and apply multiple parameters without causing layout shifts or sluggish UI performance.
- **SC-003**: Product discoverability improves, leading to a measurable increase in the click-to-view ratio from broad categories to individual product pages.
