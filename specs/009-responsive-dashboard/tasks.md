# Tasks: Responsive Admin Dashboard

**Input**: Design documents from `/specs/009-responsive-dashboard/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Find or install a Drawer/Sheet component (like Radix UI Dialog/Sheet) for mobile navigation in `packages/ui` or `apps/admin/src/components/ui/sheet.tsx`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Implement the responsive shell structure inside `apps/admin/src/app/layout.tsx` (or primary Admin dashboard layout).
- [X] T003 Integrate the Drawer/Sheet component into the layout navigation header, ensuring it only appears on `max-md` breakpoints, replacing or hiding the fixed sidebar dynamically.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Mobile Access to Core Operations (Priority: P1) 🎯 MVP

**Goal**: As an administrator using a mobile device, I want to view and interact with the main dashboard so that I can monitor key metrics and handle urgent alerts while on the go.

**Independent Test**: Can be independently tested by opening the dashboard on a mobile screen size, ensuring layouts stack correctly, tables use horizontal scrolling if needed, and navigation menus are accessible via a mobile menu toggle.

### Implementation for User Story 1

- [X] T004 [P] [US1] Update `apps/admin/src/app/(dashboard)/page.tsx` metric and statistic cards to stack vertically on mobile breakpoints using `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
- [X] T005 [P] [US1] Implement native horizontal scrolling with a sticky first column for the standard Data Table component inside `packages/ui/components/data-table.tsx` (or equivalent `apps/admin` table component).
- [X] T006 [P] [US1] Shift complex filtering forms inside `apps/admin/src/components/` or corresponding page routes to render inside full-screen mobile modals strictly on `max-md` viewports.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently on typical mobile boundaries.

---

## Phase 4: User Story 2 - Tablet Optimized Layouts for Operations (Priority: P2)

**Goal**: As a store manager using a tablet, I want to be able to comfortably manage orders and inventory without the UI feeling cramped or elements being too small to tap.

**Independent Test**: Can be tested on a tablet viewport (768px - 1024px), verifying that grid layouts adjust to appropriate column structures and touch targets remain accessible.

### Implementation for User Story 2

- [X] T007 [P] [US2] Update major grid structures across `/orders`, `/inventory`, and `/staff` routes within `apps/admin/src/app/` to utilize fluid intermediate breakpoint columns (`md:grid-cols-2`).
- [X] T008 [P] [US2] Increase minimum touch target sizes (`min-h-[44px]` or adequate padding) on all primary interactive buttons, switches, and table rows across `packages/ui` and generic `apps/admin/` widgets on `max-lg` screens.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T009 [P] Perform full dashboard audit to verify no horizontal overflow (`overflow-x-hidden` on main wrapper).
- [X] T010 [P] Verify sticky CSS layouts perform at 60fps on mobile without severe jank or structural overlap.
- [X] T011 [P] Ensure rapid orientation switches between portrait and landscape modes on mobile trigger CSS shifts gracefully.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent, though shares UI modules defined in Setup.

### Parallel Opportunities

- User Story 1 modifications (T004, T005, T006) can execute in fully parallel tasks tracking different components.
- User Story 2 modifications (T007, T008) can execute in fully parallel tasks across different routing hierarchies.

---

## Parallel Example: User Story 1

```bash
# Developer A modifies the Grid layout:
Task: "Update apps/admin/src/app/(dashboard)/page.tsx metric and statistic cards to stack vertically..."

# Developer B introduces data-table scroll responsiveness:
Task: "Implement native horizontal scrolling with a sticky first column for the standard Data Table component..."

# Developer C rebuilds filter forms:
Task: "Shift complex filtering forms... to render inside full-screen mobile modals"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently on mobile.
5. Deploy/merge feature core.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready.
2. Add User Story 1 → Test independently on iOS/Android emulators → PR (MVP!).
3. Add User Story 2 → Test tablet specific workflows → PR.
4. Each story adds fluid CSS support without breaking previous structure.
