---
description: "Task list template for feature implementation"
---

# Tasks: Analytics, Intelligence & System Settings

**Input**: Design documents from `/specs/010-analytics-system-settings/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are OPTIONAL. No TDD was requested, so verification relies on manual local testing outlined in `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Install `recharts` and init UI components via shadcn (e.g., `npx shadcn@latest add chart`) in `apps/admin`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Update `packages/backend/convex/schema.ts` to add `unit_cogs` to `orders`, and define `system_configs` and `blacklist` tables.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Analytics & Intelligence Dashboard (Priority: P1) 🎯 MVP

**Goal**: Monitor key business performance metrics in real-time without exposing financial data to operational staff.

**Independent Test**: Load the dashboard UI with a `VIEW_FINANCIALS` admin and verify that bounded indexed metrics aggregate instantly.

### Implementation for User Story 1

- [ ] T003 [US1] Create `packages/backend/convex/analytics.ts` and implement `dashboardMetrics` bounded aggregation query with `VIEW_FINANCIALS` validation.
- [ ] T004 [P] [US1] Create visual chart components in `apps/admin/src/components/charts/` (e.g., `SalesVelocityChart.tsx`).
- [ ] T005 [US1] Overwrite the root `apps/admin/src/app/page.tsx` wrapper to securely query `api.analytics.dashboardMetrics` and render KPIs.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - System Settings & Blacklist Management (Priority: P1)

**Goal**: Manage global application toggles and silently block malicious phone numbers through a UI.

**Independent Test**: Block a phone number and test the Storefront checkout; toggle Maintenance mode and verify immediate Storefront routing interference.

### Implementation for User Story 2

- [ ] T006 [P] [US2] Create `packages/backend/convex/settings.ts` exposing `getSystemConfig` and `updateSystemConfig` mutations restricting write-access.
- [ ] T007 [P] [US2] Create `packages/backend/convex/blacklist.ts` exposing queries/mutations to manage blocked numbers.
- [ ] T008 [US2] Update `packages/backend/convex/orders.ts` (specifically checkout/place order mutation) to query the `blacklist` table and silently shift orders to `FLAGGED_FRAUD` if matched.
- [ ] T009 [P] [US2] Create `apps/admin/src/app/(dashboard)/settings/page.tsx` UI to manage configs and the blacklist table.
- [ ] T010 [US2] Add a WebSocket active listener to Storefront (e.g., in a root layout/provider) that forces a fallback banner/redirect if `MAINTENANCE_MODE` is `true`.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Audit Logs Viewer (Priority: P2)

**Goal**: View a comprehensive ledger of all critical system actions for operational transparency.

**Independent Test**: Trigger a state mutation locally, then open the Audit logs table and verify the entry appears accurately without the ability to edit.

### Implementation for User Story 3

- [ ] T011 [P] [US3] Create `packages/backend/convex/audit.ts` exposing `paginatedList` using the Convex pagination API to read `audit_logs`.
- [ ] T012 [P] [US3] Create `apps/admin/src/app/(dashboard)/audit/page.tsx` featuring a read-only shadcn Data Table bound to `paginatedList`.

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T013 [P] Verify typing accuracy and run ESLint across `/apps/admin` and `/packages/backend`.
- [ ] T014 Execute manual sandbox scenarios defined in `quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all remaining stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion. User stories 1, 2, and 3 can be processed in parallel.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Needs Foundational schema. No other dependencies.
- **User Story 2 (P1)**: Needs Foundational schema. No other dependencies.
- **User Story 3 (P2)**: Needs Foundational schema so it can list mutations hitting the new tables.

### Parallel Opportunities

- After T002 is merged, T003, T006, T007, and T011 can be worked on instantly in parallel by separate Backend engineers mapping endpoints.
- T004, T009, and T012 are self-isolated Frontend slices and can be worked on concurrently.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational constraints.
2. Build User Story 1 (Dashboard APIs and Views).
3. Validate independent operations, then resume scaling into User Story 2 blocks.
