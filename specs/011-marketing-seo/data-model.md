# Data Model: Phase 10 - Marketing, Retention & Advanced SEO

## Entities

### `promo_codes`
A new table in Convex to store discount configurations.

**Fields**:
- `code`: `v.string()` (Unique identifier, e.g., "SAVE20")
- `type`: `v.union(v.literal("fixed"), v.literal("percentage"), v.literal("free_shipping"))`
- `value`: `v.number()` (The discount amount or percentage, e.g., 20)
- `max_discount_amount`: `v.optional(v.number())` (Cap for percentage discounts)
- `max_uses`: `v.number()` (Total times this code can be used globally)
- `current_uses`: `v.number()` (Counter tracking current redemptions)
- `expiry_date`: `v.optional(v.number())` (Timestamp in ms when the code expires)
- `isActive`: `v.boolean()` (Allows manual toggling on/off by admins)

**Validation Rules**:
- `code` must be unique across the system (enforced by a secondary index or logic).
- `type == "percentage"` requires `value` between 1 and 100.
- `current_uses` must be ≤ `max_uses`. Mutation must abort if exceeded.
- Cannot be applied if `Date.now() > expiry_date`.

### `products` (Schema Update)
Extension of the existing `products` schema for cross-selling.

**New Fields**:
- `related_product_ids`: `v.optional(v.array(v.id("products")))`

**Validation Rules**:
- Relationship is explicitly unidirectional (Product A linking to Product B does not mandate B linking to A).
- Only valid, active Product IDs should be permitted in the array.

### `orders` (Schema Update)
Extension of the existing `orders` schema to immutably track promo code application and provide data for WhatsApp webhooks.

**New Fields**:
- `promo_code_id`: `v.optional(v.id("promo_codes"))` (Reference to the applied code)
- `promo_code_snapshot`: `v.optional(v.string())` (The literal string code applied, in case the code document is later deleted/changed)
- `discount_applied`: `v.optional(v.number())` (The calculated financial amount deducted from the subtotal)

**Validation Rules**:
- Promo code application is mutually exclusive with Bundles. If any item in the `cart_items` is a bundle, `promo_code_id` cannot be applied.
- The `discount_applied` must be immutably recorded at checkout and must never change even if the promo code is later updated or deleted.

---

## State Transitions & Actions

### Promo Code Validation (`validatePromoCode`)
1. Fetches code document by string.
2. Aborts if `!code.isActive`, `code.current_uses >= code.max_uses`, or `isExpired(code.expiry_date)`.
3. Aborts if checkout payload contains any Bundle items (Mutual Exclusivity).
4. Calculates deterministic discount amount (applying `max_discount_amount` cap if type is percentage).
5. Returns `discountAmount` and `valid: true`.

### Order State Webhooks (`dispatchWhatsAppWebhook`)
1. Triggered via `ctx.scheduler.runAfter` within the existing order status transition mutations (`PENDING_PAYMENT_INPUT`, `CONFIRMED`).
2. Dispatches an async HTTP request (`fetch`) using `convex/actions.ts` to a generic WhatsApp API provider.
3. Errors are caught and logged natively in Convex `_execution` logs. The failing webhook does *not* revert the primary order state transition (Fire-and-Forget policy).
