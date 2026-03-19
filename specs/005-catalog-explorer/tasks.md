# Tasks: Advanced Catalog & Categories Explorer

**Input**: Design documents from `/specs/005-catalog-explorer/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/api.ts

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Review `specs/005-catalog-explorer/contracts/api.ts` to ensure understanding of the required Convex queries.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Update `convex/schema.ts` to add `searchIndex("search_name", { searchField: "name" })` to the `products` table.
- [ ] T003 Update `convex/schema.ts` to add `index("by_category", ["categoryId"])` to the `products` table.
- [ ] T004 Update `convex/schema.ts` to ensure `categories` table has necessary active indices (`by_active`).

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Advanced Catalog Search and Filtering (Priority: P1) 🎯 MVP

**Goal**: As a Mobile Customer, I want to access a comprehensive product listing page (`/products`) with a mobile-first bottom-sheet drawer for filtering by Category and optionally Price range/sort.

**Independent Test**: Route to `/products`, open the filter drawer, toggle ranges, verify that URL parameters update seamlessly, and hit "Load More" to append products.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Implement Convex query `searchAndFilter` in `convex/products.ts` supporting `paginationOpts` and branching logic for `searchQuery`.
- [ ] T006 [P] [US1] Create Convex query `getRecommendedProducts` in `convex/products.ts` to power the empty state fallback.
- [ ] T007 [P] [US1] Create UI component `FilterDrawer` in `src/components/storefront/filter-drawer.tsx` syncing state to the URL via `useRouter` or `nuqs`.
- [ ] T008 [P] [US1] Create UI component `LoadMoreButton` in `src/components/storefront/load-more-button.tsx`.
- [ ] T009 [US1] Implement presentation page `src/app/(store)/products/page.tsx` utilizing `usePaginatedQuery("api.products.searchAndFilter")`.
- [ ] T010 [US1] Implement empty state fallback rendering in `src/app/(store)/products/page.tsx` using `getRecommendedProducts` if search yields zero results.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Categories Overview Exploration (Priority: P2)

**Goal**: As a Customer, I want to navigate to a visual Category Overview page (`/categories`) showcasing all active categories as grid/list cards, clicking any of which navigates to its related products.

**Independent Test**: Route to `/categories`, verify the grid loads mapped categories, then click a category to ensure successful routing to `/categories/[id]`.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Implement Convex query `listActiveCategories` in `convex/categories.ts`.
- [ ] T012 [P] [US2] Create UI component `CategoryGridCard` in `src/components/storefront/category-grid-card.tsx` to display category visuals and route to the specific category page.
- [ ] T013 [US2] Implement presentation layout in `src/app/(store)/categories/page.tsx` rendering the `CategoryGridCard` elements.
- [ ] T014 [US2] Implement filtered routing view in `src/app/(store)/categories/[id]/page.tsx` acting as a wrapper that invokes the US1 catalog list but strictly locked to the URL parameter `id`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T015 [P] Verify Dark Mode and Space Grotesk styling across both `/products` and `/categories` layouts.
- [ ] T016 [P] Verify that the `FilterDrawer` transforms correctly between mobile bottom-sheet and desktop sidebar layout.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion. User Story 1 (MVP) should be prioritized and tested before Story 2.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of other stories. Establishes core list logic.
- **User Story 2 (P2)**: Dependent structurally on US1 filtering design. Specifically, `/categories/[id]/page.tsx` relies on the product list presentation built in US1.

### Parallel Opportunities

- Foundation updates (`convex/schema.ts`) can happen sequentially.
- Convex Queries (T005, T006, T011) can be developed strictly in parallel since they don't touch the same schema definitions.
- UI components (`FilterDrawer`, `LoadMoreButton`, `CategoryGridCard`) can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3: User Story 1 (Advanced Catalog & Search).
3. **STOP and VALIDATE**: Test `/products` filtering and URL state.
4. If robust, proceed to User Story 2.
