# Tasks: Phase 10 - Marketing, Retention & Advanced SEO

**Input**: Design documents from `/specs/011-marketing-seo/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

*(No general project setup needed as this is an existing Turborepo monorepo).*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 [P] Setup environment variables for WhatsApp API locally using `npx convex env set` per quickstart.md
- [x] T002 Update Convex schema with `promo_codes` table in `packages/backend/convex/schema.ts`
- [x] T003 Update Convex schema adding `related_product_ids` array to `products` in `packages/backend/convex/schema.ts`
- [x] T004 Update Convex schema adding `promo_code_id`, `promo_code_snapshot`, and `discount_applied` to `orders` in `packages/backend/convex/schema.ts`

**Checkpoint**: Foundation ready - DB schema prepared. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Apply Promo Codes at Checkout (Priority: P1) 🎯 MVP

**Goal**: Allow customers to apply capped or uncapped promo codes at checkout, strictly preventing bundle overlap.

**Independent Test**: Can be tested by creating a promo code in the admin dashboard and validating the subtotal reduction at the storefront checkout.

### Implementation for User Story 1

- [x] T005 [P] [US1] Implement CRUD and `validatePromoCode` query in `packages/backend/convex/promoCodes.ts`
- [x] T006 [US1] Refactor `placeOrderFromSession` mutation in `packages/backend/convex/orders.ts` to validate mutually exclusive promo codes, calculate discount, and log immutably.
- [x] T007 [P] [US1] Build Admin Dashboard UI for managing promo codes in `apps/admin/src/app/marketing/promo-codes/page.tsx`
- [x] T008 [P] [US1] Create storefront UI component in `packages/ui/src/components/storefront/PromoCodeInput.tsx` (using shadcn/ui)
- [x] T009 [US1] Integrate `PromoCodeInput.tsx` into the storefront checkout page and wire it to the Convex order mutation payload
- [x] T010 [US1] Update the `cart` and `checkout` subtotal calculations on the frontend to preview the applied discount

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Automated WhatsApp Notifications (Priority: P1)

**Goal**: Order state changes trigger asynchronous outward webhooks to a generic WhatsApp API provider.

**Independent Test**: Can be tested by triggering a checkout and watching `webhook.site` or `ngrok` for the outbound HTTP payload.

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement `dispatchWhatsAppWebhook` internal action using native `fetch` in `packages/backend/convex/webhooks.ts`
- [x] T012 [US2] Update order state transition mutations (e.g., `PENDING_PAYMENT_INPUT`, `CONFIRMED`) in `packages/backend/convex/orders.ts` to trigger the webhook via `ctx.scheduler.runAfter(0, ...)`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Discover Complementary Products (Priority: P2)

**Goal**: Cross-sell and up-sell using unidirectional relationships linking complementary UI products on the PDP.

**Independent Test**: Manually assign related product IDs to a product in the DB and verify they render dynamically on its storefront page.

### Implementation for User Story 3

- [x] T013 [P] [US3] Implement internal queries to resolve related product references in existing catalog logic in `packages/backend/convex/products.ts` or similar
- [x] T014 [P] [US3] Create presentation component in `packages/ui/src/components/storefront/RelatedProducts.tsx`
- [x] T015 [US3] Integrate `RelatedProducts.tsx` into `apps/storefront/src/app/products/[slug]/page.tsx` passing fetched IDs

**Checkpoint**: All user stories up to US3 should now be independently functional

---

## Phase 6: User Story 4 - Advanced SEO & Discovery (Priority: P2)

**Goal**: Enhance programmatic SEO with a dynamic sitemap and structured OpenGraph metadata.

**Independent Test**: Requesting `/sitemap.xml` returns valid XML; social sharing tools show rich OG tags.

### Implementation for User Story 4

- [x] T016 [P] [US4] Implement dynamic sitemap generation in `apps/storefront/src/app/sitemap.ts` querying all active products/categories
- [x] T017 [P] [US4] Implement `generateMetadata` function in `apps/storefront/src/app/products/[slug]/page.tsx` to output dynamic OpenGraph tags based on the product slug

**Checkpoint**: All User Stories are complete.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T018 Code cleanup and removal of console logs
- [x] T019 Run quickstart.md validation to ensure instructions match final implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: BLOCKS all user stories. Must be executed physically first.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Can be run sequentially or in parallel depending on developer capability.

### Within Each User Story

- Database mutations/queries before UI Components
- Components before page integration

### Parallel Opportunities

- Admin UI (T007) and Storefront Component (T008) can be built simultaneously.
- Webhook Actions (T011) can be developed independently of the core checkout logic.
- SEO tasks (T016, T017) are completely decoupled presentation tasks.
