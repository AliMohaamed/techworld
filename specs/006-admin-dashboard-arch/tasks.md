---
description: "Task list for Standalone Admin Dashboard Architecture"
---

# Tasks: Standalone Admin Dashboard Architecture

**Input**: Design documents from `/specs/006-admin-dashboard-arch/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL (none explicitly requested).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths in descriptions

## Path Conventions

- **Monorepo**: `apps/admin/`, `apps/storefront/`, `packages/backend/`, `packages/ui/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic monorepo structure

- [ ] T001 Create project structure per implementation plan by adding `turbo.json` and workspaces to `package.json`
- [ ] T002 Move existing Next.js frontend codebase into `apps/storefront/`
- [ ] T003 Initialize completely isolated Next.js 16 app at `apps/admin/`
- [ ] T004 [P] Relocate existing `convex/` logic into `packages/backend/` and verify workspace access

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Setup Tailwind CSS v4 and shadcn/ui centrally in `packages/ui/`
- [ ] T006 Initialize Convex Auth securely inside `packages/backend/convex/auth.ts`
- [ ] T007 Configure `ConvexProvider` and authentication shells in `apps/admin/src/app/layout.tsx`
- [ ] T008 [P] Abstract `permissions` arrays onto the User entity schema inside `packages/backend/convex/schema.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Order Management & Verification Workflow (Priority: P1) 🎯 MVP

**Goal**: Desktop-first interface to view the queue of orders and manually verify receipts, transitioning to CONFIRMED.

**Independent Test**: Can be independently tested by logging in as an Operations Agent, viewing the pending queue, opening a `AWAITING_VERIFICATION` order, uploading a manual receipt screenshot, and successfully transitioning it to `CONFIRMED`.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Create order list query returning AWAITING_VERIFICATION orders in `packages/backend/convex/orders.ts`
- [ ] T010 [P] [US1] Implement `updateOrderStatus` mutation in `packages/backend/convex/orders.ts` handling `CONFIRMED` transition and stock deductions
- [ ] T011 [US1] Build upload file mutation for manual fallback receipts interacting with Convex File Storage in `packages/backend/convex/files.ts`
- [ ] T012 [P] [US1] Implement Next.js presentation data-table component for orders queue in `apps/admin/src/app/orders/page.tsx`
- [ ] T013 [US1] Implement Upload Receipt UI modal bound to the order details page in `apps/admin/src/app/orders/[id]/page.tsx`
- [ ] T014 [US1] Implement Negative Concurrency Collision catching logic (real_stock <= 0) strictly via try/catch in `apps/admin/src/app/orders/[id]/page.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Catalog & Category Management (Priority: P2)

**Goal**: Comprehensive UI to perform CRUD operations on Categories and Products without direct backend access.

**Independent Test**: Can be fully tested by creating a new category, toggling its active state, creating a product associated with that category, and updating its display and real stock independently.

### Implementation for User Story 2

- [ ] T015 [P] [US2] Implement `createCategory` & `toggleCategoryStatus` mutations in `packages/backend/convex/categories.ts`
- [ ] T016 [US2] Create Product mutations allowing independent `real_stock` and `display_stock` edits in `packages/backend/convex/products.ts`
- [ ] T017 [P] [US2] Layout Categories CRUD views utilizing desktop-first data tables in `apps/admin/src/app/catalog/categories/page.tsx`
- [ ] T018 [US2] Layout Products listing and variant creation modal in `apps/admin/src/app/catalog/products/page.tsx`
- [ ] T019 [US2] Hook product unpublish validation logic if category is missing/inactive into `packages/backend/convex/products.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Role-Based Access Control & Security Enforcement (Priority: P3)

**Goal**: Hide or expose sections/actions (e.g., Financial Data) strictly based on permission flags instead of roles.

**Independent Test**: Can be fully tested by logging in as an agent without `VIEW_FINANCIALS` and verifying that all COGS, net margins, and total revenue metrics are redacted or completely hidden.

### Implementation for User Story 3

- [ ] T020 [P] [US3] Extract `hasPermission` utility function for mutation authorization checks in `packages/backend/convex/utils/permissions.ts`
- [ ] T021 [US3] Mask and redact financial fields dynamically inside the `getOrderDetails` query for users without `VIEW_FINANCIALS` in `packages/backend/convex/orders.ts`
- [ ] T022 [P] [US3] Implement dynamic client-side Sidebar navigation filtering based on permissions in `apps/admin/src/components/Sidebar.tsx`
- [ ] T023 [US3] Create unprivileged view logic to mask/hide COGS and margins inside `apps/admin/src/app/orders/[id]/page.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T024 [P] Configure pure Dark Mode natively via `next-themes` exclusively for `apps/admin/`
- [ ] T025 Ensure localized strings (AR/EN) display properly via RTL layout adjustments in `apps/admin/src/app/layout.tsx`
- [ ] T026 Wire general state transitions (like Confirm Order) to write to an immutable `audit_logs` table via Convex helper
- [ ] T027 Validate Quickstart process and Turborepo caching

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Independent
- **User Story 3 (P3)**: Can start after Foundational - Augments US1/US2 views independently

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- Admin UI tasks (`apps/admin`) and backend mutations (`packages/backend`) for stories are isolated and safely parallelizable [P].
- Different team members can claim US1, US2, and US3 concurrently once Phase 2 establishes `packages/backend/convex/auth.ts`.

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`apps/admin`, `packages/backend`)
2. Complete Phase 2: Foundational (Convex Auth)
3. Complete Phase 3: User Story 1 (Order Validations)
4. **STOP and VALIDATE**: Test Order verification flow independently

### Incremental Delivery

1. Foundation ready
2. Add User Story 1 → Confirm operational queue functions (MVP)
3. Add User Story 2 → Release catalog management UI incrementally
4. Add User Story 3 → Toggle RBAC logic on existing mutations
