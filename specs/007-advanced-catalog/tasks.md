---
description: "Task list for Phase 7 - Advanced Catalog, Variants, Media Gallery & Sale Pricing"
---

# Tasks: Phase 7 - Advanced Catalog, Variants, Media Gallery & Sale Pricing

**Input**: Design documents from `/specs/007-advanced-catalog/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Enhance `catalog` database schema applying Unified SKU Architecture in `packages/backend/convex/schema.ts`
- [X] T002 Implement file upload URL generator logic in `packages/backend/convex/storage.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Implement backend CRON sweep job for orphaned files in `packages/backend/convex/sweepJobs.ts`
- [X] T004 [P] Register the file sweep execution schedule in `packages/backend/convex/crons.ts`
- [X] T005 Add atomic mutations for updating `real_stock` on SKUs securely in `packages/backend/convex/skus.ts`
- [X] T006 Update product query endpoints to fetch related SKUs automatically in `packages/backend/convex/products.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create/Edit Product with Variants, Images & Pricing (Priority: P1) 🎯 MVP

**Goal**: As an authorized Catalog Manager, manage complex product variants, link uploaded images, and define sale pricing within an in-page modal.

**Independent Test**: Can be fully tested by opening the modal in the dashboard, filling out product info, uploading images, configuring colors, setting prices, and saving.

### Implementation for User Story 1

- [X] T007 [P] [US1] Define highly-strict Zod validation forms for Product and Variant states in `apps/web/app/(admin)/components/product-zod-schemas.ts`
- [X] T008 [US1] Scaffold base Product Modal layout structure with `Sheet` and `Dialog` in `apps/web/app/(admin)/products/components/ProductFormSheet.tsx`
- [X] T009 [P] [US1] Create direct-to-Convex Image Upload component wrapper in `apps/web/app/(admin)/products/components/ConvexStorageUpload.tsx`
- [X] T010 [US1] Wire the Image Uploader up to the `ProductFormSheet` to append captured `Id<"_storage">` refs to state 
- [X] T011 [US1] Implement dynamic "Add Variant" field array mappings via `react-hook-form` in `apps/web/app/(admin)/products/components/ProductFormSheet.tsx`
- [X] T012 [US1] Bridge form submission directly to Convex `.mutation` for inserting Product and cascading to SKU creation

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently in the Admin Dashboard

---

## Phase 4: User Story 2 - Storefront Dynamic Product Presentation (Priority: P1)

**Goal**: As a Customer, view products with variants on the storefront, instantly hot-swap main images based on color selection, and see strictly styled `compareAtPrice` sale markers.

**Independent Test**: Can be fully tested by loading a variant-enabled product page, clicking color swatches, and verifying instantaneous image swaps.

### Implementation for User Story 2

- [ ] T013 [P] [US2] Construct responsive dynamic main image gallery container in `apps/web/app/(store)/components/DynamicProductGallery.tsx`
- [ ] T014 [US2] Refactor Storefront PDP to isolate client state for variant selection in `apps/web/app/(store)/products/[id]/page.tsx`
- [ ] T015 [US2] Bind color swatch clicks to state mutations triggering `DynamicProductGallery` URL swaps mapped to backend file IDs
- [ ] T016 [P] [US2] Implement conditional semantic rendering `<s>` for `compareAtPrice` vs `price` inside frontend product cards

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T017 [P] Execute full QA walk-through validating Mobile UI layouts for `ProductFormSheet.tsx` 
- [ ] T018 Confirm "Default" SKU creation fallback successfully works for purely simple products containing no manual variants

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) 

### Parallel Opportunities

- Foundational tasks marked [P] can run simultaneously with backend mutation structures.
- User Story 1 and User Story 2 can be developed simultaneously as Admin UI and Storefront UI operate in completely autonomous segments of Next.js routing.
- Validation logic (`Zod`) can be typed and drafted concurrently via [P] marks.

## Parallel Example: User Story Execution

```bash
# Launch Admin UI schema and Image wrappers simultaneously
Task: "Define highly-strict Zod validation forms for Product and Variant states..."
Task: "Create direct-to-Convex Image Upload component wrapper..."

# Launch Storefront UI and Image Galleries simultaneously
Task: "Construct responsive dynamic main image gallery container..."
Task: "Implement conditional semantic rendering <s> for compareAtPrice..."
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test Admin Dashboard Product Management independently.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Admin Functionality Active (MVP)
3. Add User Story 2 → Test storefront dynamic syncing independently.


