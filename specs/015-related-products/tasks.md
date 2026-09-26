# Tasks: Related Products

**Input**: Design documents from `/specs/015-related-products/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are omitted as they were not explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify Convex schema and Next.js project structure for related products feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Review `products` and `skus` table schema in `packages/backend/convex/schema.ts` to ensure necessary indices exist for querying related items.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Related Products (Priority: P1) 🎯 MVP

**Goal**: Shoppers can see related products when scrolling down on the product details page.

**Independent Test**: Navigate to a product details page, scroll down, and see related items (title, image, price) displayed correctly.

### Implementation for User Story 1

- [X] T003 [US1] Implement `getRelatedProducts` query in `packages/backend/convex/products.ts` to fetch products using `related_product_ids` and `categoryId` as fallbacks, ensuring they are published and in-stock.
- [X] T004 [P] [US1] Create the `<RelatedProducts />` component skeleton and basic layout in `apps/storefront/src/components/storefront/related-products.tsx`.
- [X] T005 [US1] Integrate `useQuery(api.products.getRelatedProducts)` into `<RelatedProducts />` and render the product information.
- [X] T006 [US1] Add the `<RelatedProducts />` component at the bottom of the page in `apps/storefront/src/app/[locale]/(store)/products/[slug]/page.tsx`.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Navigate to Related Product (Priority: P2)

**Goal**: Shoppers can click on a related product to view its details.

**Independent Test**: Click a related product card and verify redirection to its product details page.

### Implementation for User Story 2

- [X] T007 [US2] Update product cards in `apps/storefront/src/components/storefront/related-products.tsx` to include Next.js `<Link>` wrappers pointing to `/products/[slug]`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Responsive Layout of Related Products (Priority: P3)

**Goal**: Ensure the layout is a swipeable carousel on mobile and a 4-column grid on desktop.

**Independent Test**: Verify horizontal scrolling on mobile viewports and a static grid on desktop viewports.

### Implementation for User Story 3

- [X] T008 [P] [US3] Apply CSS flexbox with `overflow-x-auto snap-x snap-mandatory` for mobile and CSS Grid `md:grid-cols-4` for desktop in `apps/storefront/src/components/storefront/related-products.tsx`.
- [X] T009 [US3] Add a skeleton loader state (matching the responsive layout) while the Convex query is loading in `apps/storefront/src/components/storefront/related-products.tsx`.
- [X] T010 [US3] Implement the failure handling (retry once, then return `null` to hide the section silently) in `apps/storefront/src/components/storefront/related-products.tsx`.

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T011 [P] Ensure UI component styling matches the overall storefront aesthetics.
- [ ] T012 Run performance profiling to ensure related products load in < 300ms. *(Not yet measured; query read set is now bounded — see contracts/api.md.)*
- [X] T013 Update translations for any new text (e.g., "Related Products" heading).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential priority order (P1 → P2 → P3) is recommended for MVP delivery.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Depends on User Story 1 (needs the `<RelatedProducts />` component).
- **User Story 3 (P3)**: Depends on User Story 1 (needs the `<RelatedProducts />` component structure).

### Parallel Opportunities

- T003 (Backend query) and T004 (Frontend skeleton component) can be worked on in parallel.
- Polish tasks can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3: User Story 1.
3. **STOP and VALIDATE**: Test that related products display.
4. Deliver MVP.

### Incremental Delivery

1. Complete Setup + Foundational.
2. Add User Story 1 → Test independently → Deliver (MVP).
3. Add User Story 2 → Test navigation → Deliver.
4. Add User Story 3 → Test responsive layout and loading states → Deliver.
5. Apply Polish.
