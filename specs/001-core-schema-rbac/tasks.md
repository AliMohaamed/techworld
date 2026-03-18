# Tasks: Core Data Schema & RBAC Engine

**Input**: Design documents from `/specs/001-core-schema-rbac/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, research.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Convex development environment via `npx convex dev` in project root
- [x] T002 Configure base convex directory structure `convex/lib/` and utility files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Setup database schemas (`users`, `products`, `orders`, `audit_logs`) obeying Data Model in `convex/schema.ts`
- [x] T004 [P] Implement `requirePermission` authentication/authorization utility in `convex/lib/rbac.ts`
- [x] T005 [P] Implement `logAudit` internal mutation for immutable recording in `convex/audit.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure User Permissions (Priority: P1) 🎯 MVP

**Goal**: As an administrator, I need to assign granular permission flags (e.g., VIEW_FINANCIALS, VERIFY_PAYMENTS) to users instead of static roles.

**Independent Test**: Can be independently tested by assigning a specific flag to a user and verifying that only the permitted actions are allowed natively through Convex.

### Implementation for User Story 1

- [x] T006 [P] [US1] Implement `updateUserPermissions` administrative mutation inside `convex/users.ts` using `requirePermission` 
- [x] T007 [P] [US1] Implement `getUserPermissions` query to resolve current flags to the frontend inside `convex/users.ts`
- [x] T008 [US1] Integrate `logAudit` helper at the successful completion of `updateUserPermissions` to track security changes

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Process New Hybrid COD Order (Priority: P1)

**Goal**: As an online customer, I want to place a Hybrid Cash-on-Delivery order that decreases `display_stock` independently without hard-reserving physical `real_stock`.

**Independent Test**: Can be tested by placing a new order and validating it strictly transitions to `PENDING_PAYMENT_INPUT` while `real_stock` remains stable.

### Implementation for User Story 2

- [x] T009 [P] [US2] Implement `createOrder` mutation in `convex/orders.ts` (Validates `display_stock > 0`, decreases it, initiates `PENDING_PAYMENT_INPUT`)
- [x] T010 [P] [US2] Implement Convex Cron Job `markStalledOrders` in `convex/crons.ts` checking for `PENDING_PAYMENT_INPUT` older than 24h explicitly shifting them to `STALLED_PAYMENT`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Verify and Confirm Order Payment (Priority: P1)

**Goal**: As an agent, I want to verify payments so that the physical inventory is securely deducted accurately only when the payment is confirmed.

**Independent Test**: Can be tested via Concurrent Verifications validating the oversell buffer strict `-5` error check and verifying rejection Soft Syncs appropriately.

### Implementation for User Story 3

- [x] T011 [P] [US3] Implement `verifyPayment` mutation in `convex/orders.ts` with strict oversell limitation checking if `newRealStock < -5` and using `requirePermission(ctx, 'VERIFY_PAYMENTS')`
- [x] T012 [P] [US3] Implement `rejectPayment` mutation in `convex/orders.ts` handling the Soft Sync of `display_stock = real_stock` when cancellations happen
- [x] T013 [US3] Refactor existing FSM states explicitly mapping transitions locally safely

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Audit Security Actions (Priority: P2)

**Goal**: As a compliance officer, I need to reliably track every critical state transition automatically.

**Independent Test**: After performing order transition states and permission modifications, verifying new entries propagate cleanly onto `audit_logs`.

### Implementation for User Story 4

- [x] T014 [P] [US4] Bind `logAudit` directly into the FSM transitions of `createOrder` inside `convex/orders.ts`
- [x] T015 [P] [US4] Bind `logAudit` directly into the FSM transitions of `verifyPayment` inside `convex/orders.ts`
- [x] T016 [P] [US4] Bind `logAudit` directly into the FSM transitions of `rejectPayment` inside `convex/orders.ts`

**Checkpoint**: The explicit cross-cutting audit capability is fully complete across all systems.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T017 [P] Perform comprehensive documentation updates inline in `convex/schema.ts` explicitly detailing the purpose of the `-5` bounds
- [x] T018 Code cleanup ensuring imports across the directory strictly utilize ESModules properly
- [x] T019 Run deployment verification outlined in `quickstart.md` successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (US1), User Story 2 (US2), User Story 3 (US3) can proceed in purely parallel execution sequences post-Foundation.
  - User Story 4 (US4) integrates the Auditing pattern into existing endpoints hence must fire sequentially towards the end.
- **Polish (Final Phase)**: Depends on all user stories completing cleanly.

### Parallel Opportunities

- The creation of base mutations and crons heavily utilizes independent table modifications, allowing tasks roughly mapped to independent filenames `convex/orders.ts` / `convex/users.ts` / `convex/crons.ts` to be completely dispatched natively across multiple implementers.
- All testing tasks (`T014`, `T015`, `T016`) can also be dispatched across multiple developers simultaneously since the internal utility `audit.ts` is fully immutable.

---

## Parallel Example: User Story 2

```bash
# Developer A focuses exclusively on Cron Jobs
Task: T010 [P] [US2] Implement Convex Cron Job `markStalledOrders` in `convex/crons.ts` checking for `PENDING_PAYMENT_INPUT` older than 24h explicitly shifting them to `STALLED_PAYMENT`

# Developer B focuses internally on Orders 
Task: T009 [P] [US2] Implement `createOrder` mutation in `convex/orders.ts` (Validates `display_stock > 0`, decreases it, initiates `PENDING_PAYMENT_INPUT`)
```

## Implementation Strategy

### Incremental Delivery Strategy

1. Complete Setup + Foundational → Foundation is ready.
2. Deliver User Story 1 (Administrative Access) isolating strictly secure access mappings via Convex Auth. 
3. Deliver User Story 2 (Order Creation) + Cron Job ensuring inventory checks function correctly and stale ones stall cleanly natively.
4. Deliver User Story 3 (Order Fulfillment FSM) guaranteeing payment states update securely.
5. Finish entirely up with User Story 4 (Security Logs) applying trace logs unconditionally over the finalized FSM methods.
