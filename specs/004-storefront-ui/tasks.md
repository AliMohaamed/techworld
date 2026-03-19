# Tasks: Customer Storefront UI

**Input**: Design documents from `/specs/004-storefront-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create storefront route group structure in `src/app/(store)`
- [X] T002 Install `uuid` package for session management
- [X] T003 [P] Configure Space Grotesk font and ensure tailwind dark mode configuration in `src/app/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement Convex client provider in `src/providers/convex-client-provider.tsx`
- [X] T005 Implement `SessionProvider` in `src/providers/session-provider.tsx` handling localStorage UUID and context
- [X] T006 Wrap the storefront layout `src/app/(store)/layout.tsx` with the `SessionProvider` and Convex provider
- [X] T007 Create base Storefront Header component `src/components/storefront/header.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Flash Sale Mobile Browsing (Priority: P1) 🎯 MVP

**Goal**: High-performance mobile-first storefront featuring dark mode aesthetics and products fetched from Convex.

**Independent Test**: Can be fully tested by loading the Home and Product Detail Pages on a mobile device to verify the layout, typography, and dark mode theming strictly match the prescribed Design System.

### Implementation for User Story 1

- [X] T008 [US1] Create Convex query `api.products.getForStorefront` returning `ProductDisplay[]` (if not already existing in backend logic)
- [X] T009 [P] [US1] Implement `ProductCard` component in `src/components/storefront/product-card.tsx` with #ffc105 styling
- [X] T010 [US1] Implement Home Page in `src/app/(store)/page.tsx` mapping Convex products to a mobile-responsive grid
- [X] T011 [US1] Implement Product Detail Page in `src/app/(store)/products/[id]/page.tsx` displaying real-time `display_stock`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Authoritative Cart & Drawer (Priority: P1)

**Goal**: Seamless inclusion of products to a persistent side Drawer/Cart derived purely via the backend.

**Independent Test**: Can be fully tested by adding multiple items to the cart and observing that totals are derived entirely from backend query responses without client-side math.

### Implementation for User Story 2

- [X] T012 [US2] Ensure Convex cart queries (`api.cart.getSessionCart`) and mutations (`api.cart.addItem`) correctly use `sessionId` 
- [X] T013 [P] [US2] Implement Cart Drawer presentation component in `src/components/storefront/cart-drawer.tsx`
- [X] T014 [US2] Bind the `CartDrawer` to `useQuery(api.cart.getSessionCart, { sessionId })` avoiding local price calculations
- [X] T015 [US2] Integrate "Add to Cart" button in `ProductCard` and PDP to trigger `api.cart.addItem` utilizing context `sessionId`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Checkout Success & WhatsApp Handoff (Priority: P1)

**Goal**: Redirect to a clear success screen with the Order ID and a prominent WhatsApp verification CTA.

**Independent Test**: Can be tested by forcing a successful checkout state and verifying the destination URL of the WhatsApp handoff link.

### Implementation for User Story 4

- [X] T016 [US4] Implement Checkout Form component `src/components/storefront/checkout-form.tsx` dispatching `api.orders.placeOrderFromSession`
- [X] T017 [US4] Implement Checkout Success Screen layout in `src/app/(store)/success/page.tsx`
- [X] T018 [US4] Implement the WhatsApp CTA button logic dynamically generating `wa.me` links seeded with order data

**Checkpoint**: The entire core checkout flow can be completed up to the WhatsApp handoff.

---

## Phase 6: User Story 3 - Category Navigation (Priority: P2)

**Goal**: Allow swift navigation and filtering across specific product categories.

**Independent Test**: Can be fully tested by clicking through category filters and ensuring the correct product lists are rendered gracefully.

### Implementation for User Story 3

- [X] T019 [US3] Create Category Navigation filters in `src/components/storefront/header.tsx`
- [X] T020 [US3] Implement dynamic Category route in `src/app/(store)/categories/[slug]/page.tsx` filtering products by category parent 

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T021 Code cleanup and refactoring across the `(store)` router group
- [X] T022 Run Lighthouse mobile performance audit to ensure sub 90+ score and fast TTI
- [X] T023 Manual hydration mismatch audit for the `SessionProvider` implementation
- [X] T024 Validate dark-mode theme cascade and component `shadcn` custom color `#ffc105` precision

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - P1 Stories (US1, US2, US4) should be prioritized and can be executed in parallel after Foundations.
  - US3 is P2, generally executed after the P1 critical path is established.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) 
- **User Story 2 (P1)**: Benefits from US1's `ProductCard` existing, but the drawer can be developed in parallel.
- **User Story 4 (P1)**: Requires US2's cart session logic to be functional for integration testing, but the `success` page can be built concurrently.
- **User Story 3 (P2)**: Requires US1 `ProductCard` to display components.

### Parallel Opportunities

- T009 [P] `ProductCard` UI development can run concurrently with backend Convex Query definitions.
- T013 [P] `CartDrawer` shell logic can be built parallel to Convex mutations logic.
- Success Page UI (T017) can be built independently of the Checkout logic (T016).
