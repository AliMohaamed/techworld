---
description: "Task list for Phase 8 – Operations, Returns & Logistics feature implementation"
---

# Tasks: 008-ops-returns-logistics

**Input**: Design documents from `/specs/008-ops-returns-logistics/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Testing for this phase relies heavily on the documented manual verification checklist and strict TypeScript/Convex schema validations.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure. 

- [X] T001 [P] Create directory structure for Admin Dashboard governorates settings (`apps/admin/src/app/(dashboard)/settings/governorates/`)
- [X] T002 [P] Create directory structure for Admin Dashboard team management (`apps/admin/src/app/(dashboard)/team/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Update backend schema in `packages/backend/convex/schema.ts` to include the `governorates` table, new `orders` fields (`governorateId`, `appliedShippingFee`), and new FSM states (`READY_FOR_SHIPPING`, `SHIPPED`, `DELIVERED`, `RTO`).

---

## Phase 3: User Story 2 - Super Admin Manages Governorate Shipping Fees (Priority: P1) 🎯 MVP

**Goal**: Establish the base logistic regions and dynamic fees. (NOTE: Executed before US1 as it is a core data dependency).

**Independent Test**: Super Admin can navigate to Governorate settings, create a governorate (e.g. Cairo, 60 EGP), and toggle its active status.

### Implementation for User Story 2

- [X] T004 [P] [US2] Create Convex mutation and query endpoints (`createGovernorate`, `updateGovernorate`, `toggleGovernorateStatus`, `listActiveGovernorates`) with `MANAGE_SYSTEM_CONFIG` RBAC in `packages/backend/convex/governorates.ts`.
- [X] T005 [P] [US2] Generate immutable Audit Log entries for all governorate mutations in `packages/backend/convex/governorates.ts`.
- [X] T006 [US2] Implement the Governorate Management Next.js specialized UI components and page in `apps/admin/src/app/(dashboard)/settings/governorates/page.tsx` utilizing `react-hook-form` and `zod`.

**Checkpoint**: At this point, the backend can permanently supply accurate governorate pricing logic.

---

## Phase 4: User Story 1 - Dynamic Shipping Fee at Checkout (Priority: P1)

**Goal**: Real-time order totals updating dynamically based on Storefront checkout region selection.

**Independent Test**: Customer goes to checkout, selects "Cairo", and total recalculates server-side dynamically matching the 60 EGP config.

### Implementation for User Story 1

- [X] T007 [P] [US1] Modify `api.cart.placeOrderFromSession` in `packages/backend/convex/cart.ts` to accept `governorateId`, validate it's active, dynamically inject its fee into the subtotal, and save the snapshot into the created order.
- [X] T008 [US1] Modify the Storefront Checkout component (`apps/storefront/src/app/(store)/checkout/page.tsx` or its linked components like `checkout-form.tsx`) to query `api.governorates.listActive` and drive real-time selection.

**Checkpoint**: Core operational checkout logic is completely restored and functional with dynamic fees.

---

## Phase 5: User Story 3 - Staff Account Provisioning (Priority: P2)

**Goal**: Prevent lockout, securely delegate onboarding capabilities natively via dashboard.

**Independent Test**: Super Admin provides granular `VIEW_ORDERS` to a new staff member and explicitly bounds escalation checks. 

### Implementation for User Story 3

- [ ] T009 [P] [US3] Implement `provisionStaff` and tightly bound `updateUserPermissions` mutations natively in `packages/backend/convex/users.ts`. Ensure bounds-checking strictly prevents privilege escalation (cannot grant what delegator doesn't own). Add audit logs.
- [ ] T010 [US3] Implement Team Management UI dashboard in `apps/admin/src/app/(dashboard)/team/page.tsx`.

**Checkpoint**: Platform can safely scale operational staff.

---

## Phase 6: User Story 4 - Returns (RTO) Workflow (Priority: P2)

**Goal**: Maintain strict `real_stock` fidelity through courier life cycles.

**Independent Test**: Authorized user transitions a SHIPPED order to RTO via backend mutation; verified that linked SKU real_stock is accurately incremented.

### Implementation for User Story 4

- [ ] T011 [P] [US4] Implement the `api.orders.updateRto` mutation in `packages/backend/convex/orders.ts`. Enforce `SHIPPED` -> `RTO` path only. Call `incrementSkuRealStock` operation natively inside mutation, including handling bundle BOMs if applicable. Add audit logs.
- [ ] T012 [US4] Expose the RTO transition button in the Admin Order details view (`apps/admin/src/app/(dashboard)/orders/[orderId]/page.tsx`).

**Checkpoint**: Courier failure tracking accurately recovers inventory.

---

## Phase 7: User Story 5 - Post-Confirmation Cancellation & Partial Returns (Priority: P2)

**Goal**: Catch-all inventory recovery for specific customer returns and manual pre-shipment cancellations.

**Independent Test**: Canceling a `CONFIRMED` order successfully reverts deducted physical stock natively. Agents can increment a specific variant natively.

### Implementation for User Story 5

- [ ] T013 [P] [US5] Modify the existing `cancelOrder` mutation in `packages/backend/convex/orders.ts` to automatically increment SKU `real_stock` *only* if the previous state was `CONFIRMED`.
- [ ] T014 [P] [US5] Create an independent `api.skus.restockItem` mutation bounded by `PROCESS_RETURNS` in `packages/backend/convex/skus.ts` to support ad-hoc post-delivery variants returns.
- [ ] T015 [US5] Expose the independent `restockItem` functionality dynamically in the Admin SKU/Product dashboard.

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T016 [P] Code cleanup, un-used artifact deletion, component standardization.
- [ ] T017 Verify all UI interactions strictly utilize proper loading states and display Zod validation errors inline.
- [ ] T018 Final manually-run smoke test validating the "Negative Concurrency Collisions" strict bounding via the Storefront using multiple parallel checkouts.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup + Foundational**: Must complete first.
- **US2 (Governorates)**: MUST precede US1 (Checkout).
- **Remaining Stories**: Can be processed in priority sequentially after US1.

### Parallel Opportunities

- The creation of the mutations (T004, T007, T009, T011, T013, T014) can run entirely in parallel after Foundation (T003) is committed.
- Frontends (T006, T008, T010, T012, T015) can run in parallel concurrently with their matching backend mutation definitions.

## Implementation Strategy

### MVP First (US2 + US1 Only)
1. Complete Foundational `schema.ts`.
2. Build Governorates backend and config Dashboard (US2).
3. Connect dynamic shipping config to Storefront Checkout (US1).
4. **Deploy MVP**. Checkout dynamically enforces live geographical shipping fees.



