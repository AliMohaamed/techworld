# Tasks: Catalog & Persistent Cart Engine

**Input**: Design documents from `/specs/002-catalog-cart-engine/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/webhook-whatsapp.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies within the same phase)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure updates

- [x] T001 Extend `Permission` union to include `MANAGE_CATEGORIES`, `MANAGE_PRODUCTS`, `MANAGE_DISPLAY_STOCK`, `ADJUST_REAL_STOCK` in `convex/lib/rbac.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema modifications that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Update `users` table's `permissions` array union to include new permission literals in `convex/schema.ts`
- [x] T003 Expand `products` table schema with commercial fields (`categoryId`, `images`, `selling_price`, etc.) in `convex/schema.ts`
- [x] T004 [P] Add `categories` table schema in `convex/schema.ts`
- [x] T005 [P] Add `cart_sessions` table schema in `convex/schema.ts`
- [x] T006 [P] Add `webhook_receipts` table schema in `convex/schema.ts`

**Checkpoint**: Foundation ready - schema is deployed, user story implementation can now begin in parallel where applicable.

---

## Phase 3: User Story 1 - Browse Products by Category (Priority: P1) 🎯 MVP

**Goal**: Customers can browse a catalog organized by categories, and view rich product data with `display_stock`.

**Independent Test**: Manually populate a category and product in Convex Dashboard, then call `getCategoryById` and `listProductsByCategory` to ensure correct payload behavior (including financial COGS stripping).

### Implementation for User Story 1

- [x] T007 [US1] Implement public query `getCategoryById` in `convex/categories.ts`
- [x] T008 [US1] Implement public query `listActiveCategories` in `convex/categories.ts`
- [x] T009 [US1] Implement public query `getProduct` (with financial redaction for non-admins) in `convex/products.ts`
- [x] T010 [US1] Implement public query `listProductsByCategory` (filtering for active categories and PUBLISHED status) in `convex/products.ts`

**Checkpoint**: At this point, the public catalog data reads correctly and strips sensitive financial fields.

---

## Phase 4: User Story 2 - Add Items to a Persistent Cart (Priority: P1)

**Goal**: Customers can add items to a backend-persisted guest cart session mapped via `sessionId`.

**Independent Test**: Use Convex dashboard to call `addToCart` with a test `sessionId` and verify it upserts items correctly without modifying `display_stock` on the product.

### Implementation for User Story 2

- [x] T011 [US2] Implement `addToCart` mutation (validating `quantity <= display_stock`) in `convex/cart.ts`
- [x] T012 [P] [US2] Implement `removeFromCart` mutation in `convex/cart.ts`
- [x] T013 [P] [US2] Implement `getCart` query returning populated cart items in `convex/cart.ts`

**Checkpoint**: The cart correctly stores items across simulated guest sessions.

---

## Phase 5: User Story 3 - Pre-Checkout Cart Validation (Priority: P1)

**Goal**: Strict server-side validation of the cart against live `display_stock` before order creation.

**Independent Test**: Call `validateCart`, then manually decrement a product's `display_stock` in the dashboard, call `validateCart` again and verify it correctly flags the item as failing validation.

### Implementation for User Story 3

- [x] T014 [US3] Implement `validateCart` query checking all items against live active/published state and `display_stock` in `convex/cart.ts`
- [x] T015 [P] [US3] Implement `clearCart` mutation to empty cart after a successful order in `convex/cart.ts`

---

## Phase 6: User Story 5 - Manage Categories from Dashboard (Priority: P2)

*(Reordered before Webhooks as it logically completes the core Catalog administration)*

**Goal**: Super Admins can safely CRUD categories and products via Dashboard mutations with RBAC.

**Independent Test**: Call `toggleCategoryActive` making it false, verify that `listProductsByCategory` from US1 now hides the child products.

### Implementation for User Story 5 (Admin Catalog)

- [ ] T016 [US5] Implement `createCategory` mutation requiring `MANAGE_CATEGORIES` in `convex/categories.ts`
- [ ] T017 [P] [US5] Implement `updateCategory` mutation requiring `MANAGE_CATEGORIES` in `convex/categories.ts`
- [ ] T018 [P] [US5] Implement `toggleCategoryActive` mutation requiring `MANAGE_CATEGORIES` and calling `logAudit` in `convex/categories.ts`
- [ ] T019 [US5] Implement `createProduct` mutation requiring `MANAGE_PRODUCTS` and an active `categoryId` in `convex/products.ts`
- [ ] T020 [US5] Implement `publishProduct` and `unpublishProduct` mutations requiring `MANAGE_PRODUCTS` and calling `logAudit` in `convex/products.ts`

---

## Phase 7: User Story 4 - Receive Payment Receipts via Webhook & Manual Fallback (Priority: P2)

**Goal**: Automated ingestion of WhatsApp payment screenshots via idempotency, short code matching, and manual fallback.

**Independent Test**: Send a POST request to the Next.js API route with a valid HMAC signature and mock payload, then verify the Convex `webhook_receipts` table records it correctly.

### Implementation for User Story 4

- [x] T021 [US4] Implement `processWebhookReceipt` internal mutation (idempotency, short-code regex matching, audit logging) in `convex/webhooks.ts`
- [x] T022 [US4] Implement Next.js API route for HMAC signature verification in `app/api/webhook/whatsapp/route.ts` Ensure it correctly bridges to the `internal.webhooks.processWebhookReceipt` mutation.
- [x] T023 [US4] Implement `attachReceiptManually` mutation requiring `VERIFY_PAYMENTS` and adding an audit log in `convex/webhooks.ts`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Wrap up and final integration checks.

- [x] T024 Validate all newly created write mutations successfully log `audit_logs` records.
- [x] T025 Run local `npx convex dev` to ensure 0 type errors generated in `_generated`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Modifies RBAC types; blocks everything.
- **Foundational (Phase 2)**: Core schema definitions; strictly BLOCKS Phase 3 through 7.
- **Phase 3 thru 6**: Core logic. US1 must be somewhat understood before US5, but US5 provides the write logic for US1's read logic. They can be done independently.
- **Phase 7 (Webhooks)**: Entirely independent of the Catalog/Cart engine aside from modifying Orders.
- **Polish (Final Phase)**: Runs at the end.

### Parallel Opportunities

- After Phase 2 completes, `convex/cart.ts` (US2 & US3) and `convex/webhooks.ts` (US4) and `convex/categories.ts` (US1 & US5) can be developed entirely in parallel by different agents/developers.
- Inside Phase 2, schema table additions (T004-T006) are strictly parallel.
