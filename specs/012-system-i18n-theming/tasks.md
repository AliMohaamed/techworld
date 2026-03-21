---
description: "Task list template for feature implementation"
---

# Tasks: Phase 11 - System-Wide Polish, i18n & Theming

**Input**: Design documents from `/specs/012-system-i18n-theming/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and package installation

- [x] T001 Install `next-intl` in package.json at workspace root
- [x] T002 Install `next-themes` and `sonner` in package.json at workspace root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core localization filesystem structures that multiple apps will use

- [ ] T003 [P] Setup base `en.json` and `ar.json` translation files in `apps/storefront/src/messages/`
- [ ] T004 [P] Setup base `en.json` and `ar.json` translation files in `apps/admin/src/messages/`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Multi-Language Browsing with Dynamic Layout (Priority: P1) 🎯 MVP

**Goal**: Support routing and layout toggling for Arabic and English with `next-intl`.

**Independent Test**: Switch the language in the URL and watch the HTML `dir` flip between `rtl` and `ltr`.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Create Next.js i18n request configuration in `apps/storefront/src/i18n.ts`
- [ ] T006 [P] [US1] Create Next.js i18n request configuration in `apps/admin/src/i18n.ts`
- [ ] T007 [US1] Create global routing middleware with `Accept-Language` detection in `apps/storefront/src/middleware.ts`
- [ ] T008 [US1] Create global routing middleware with `Accept-Language` detection in `apps/admin/src/middleware.ts`
- [ ] T009 [US1] Refactor Storefront `apps/storefront/src/app/` structure into `[locale]` dynamic routing segment
- [ ] T010 [US1] Refactor Admin `apps/admin/src/app/` structure into `[locale]` dynamic routing segment
- [ ] T011 [US1] Update `apps/storefront/src/app/[locale]/layout.tsx` to inject HTML `dir` based on active locale and wrap children in `NextIntlClientProvider`
- [ ] T012 [US1] Update `apps/admin/src/app/[locale]/layout.tsx` to inject HTML `dir` based on active locale and wrap children in `NextIntlClientProvider`
- [ ] T013 [P] [US1] Create generic LanguageSwitcher UI component in `packages/ui/src/components/storefront/LanguageSwitcher.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - User Interface Theme Customization (Priority: P2)

**Goal**: Toggle UI between Dark and Light mode instantly using `next-themes`.

**Independent Test**: Toggle the theme and verify all `shadcn/ui` components swap colors appropriately with zero flash of unstyled content.

### Implementation for User Story 2

- [ ] T014 [US2] Create generic `ThemeProvider` component wrapping `next-themes` in `packages/ui/src/components/ThemeProvider.tsx`
- [ ] T015 [US2] Wrap Storefront root layout with `ThemeProvider` in `apps/storefront/src/app/[locale]/layout.tsx`
- [ ] T016 [US2] Wrap Admin root layout with `ThemeProvider` in `apps/admin/src/app/[locale]/layout.tsx`
- [ ] T017 [P] [US2] Update `tailwind.config.ts` in `packages/ui` to explicitly support `"class"` dark mode
- [ ] T018 [P] [US2] Create Dropdown ThemeToggle UI component in `packages/ui/src/components/ThemeToggle.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Consistent System Feedback & Graceful Loading (Priority: P2)

**Goal**: Show standardized success/error states via toasts and prevent layout shifts during fetches via Skeletons.

**Independent Test**: Trigger a generic action to see a sonner Toast, reload a dashboard to see Skeletons appear.

### Implementation for User Story 3

- [ ] T019 [US3] Instantiate `sonner` `<Toaster richColors />` globally inside `apps/storefront/src/app/[locale]/layout.tsx`
- [ ] T020 [US3] Instantiate `sonner` `<Toaster richColors />` globally inside `apps/admin/src/app/[locale]/layout.tsx`
- [ ] T021 [P] [US3] Wrap async Analytics charts with `<Suspense fallback={<Skeleton />}>` in `apps/admin/src/app/[locale]/(dashboard)/page.tsx`
- [ ] T022 [P] [US3] Wrap async product categories API calls with `<Suspense fallback={<Skeleton />}>` in `apps/storefront/src/app/[locale]/page.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T023 Extract scattered hardcoded English strings into `apps/storefront/src/messages/en.json` and replace with `useTranslations` hooks
- [ ] T024 Extract scattered hardcoded Admin English strings into `apps/admin/src/messages/en.json` and replace with `useTranslations` hooks
- [ ] T025 [P] Audit all generic buttons to ensure rapid-click toast spam is debounced/throttled

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed sequentially (US1 → US2 → US3) or in parallel
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 1 setup. Minimal dependencies on other stories.
- **User Story 3 (P2)**: Can start after Phase 1 setup.

### Parallel Opportunities

- Storefront and Admin routing conversions (T009 and T010) mirror each other and are parallelizable by different team members.
- `next-themes` implementation is visually orthogonal to `next-intl` layout restructuring, so Phase 4 can safely execute independently from Phase 3 if team capacity allows.

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Deliver User Story 1 (i18n Routing + LTR/RTL Layouts) → Test independently → Deploy/Demo (MVP!)
3. Deliver User Story 2 (Dark Mode Toggle) → Test independently → Deploy/Demo
4. Deliver User Story 3 (Toasts & Skeletons) → Test independently → Deploy/Demo
5. Complete final polish sweep for remaining un-extracted translations.
