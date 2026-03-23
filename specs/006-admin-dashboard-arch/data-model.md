# Phase 1: Data Model Extraction

## Entities & Schemas

### Order

- **Fields**:
  - `status` (Enum string constrained strictly to the FSM: `PENDING_PAYMENT_INPUT`, `AWAITING_VERIFICATION`, `FLAGGED_FRAUD`, `CONFIRMED`, `READY_FOR_SHIPPING`, `SHIPPED`, `DELIVERED`, `RTO`, `CANCELLED`).
  - `shippingDetails` (Customer address, governorate IDs).
  - `financialSnapshot` (Immutable snapshot locking `unit_cogs`, `unit_selling_price`, `applied_shipping_fee`, `prepaid_shipping_amount` at creation).
  - `manualVerificationReceiptId` (Optional Reference to Convex File).
- **Relationships**: Contains embedded lists of `lineItems` linking to `Products` or `Bundles`.
- **Validation Rules (Convex Mutations)**:
  - Transition allowed *ONLY* by an authorized user (`VERIFY_PAYMENTS`, `MANAGE_SHIPPING_STATUS`).
  - Stock is never mutated upon checkout, *ONLY* deducted atomically upon transitioning to `CONFIRMED`.
  - Negative limits enforced. If `real_stock` ≤ 0, a `CONFIRMED` transition fails synchronously.
  - Automatically reverted (stock incremented) if navigating to `RTO` or `CANCELLED`.

### Product (SKUs / Bundles)

- **Fields**:
  - `categoryId` (Strict relationship reference to Category table).
  - `real_stock` (Physical truth warehouse count, integer \>= 0).
  - `display_stock` (UI marketing count, decoupled integer).
  - `attributes` (JSON blob containing variants like color, size).
  - `pricing` (Current listing data).
- **Validation Rules**:
  - Unpublish threshold blocked if active `categoryId` is missing or the category itself becomes inactive.
  - Operations staff cannot modify listings without `MANAGE_PRODUCTS` permission.

### Category

- **Fields**:
  - `isActive` (Boolean).
  - `name_ar`, `name_en` (Localized names).
  - `desc_ar`, `desc_en` (Localized descriptions).
- **Relationships**: A 1-to-many umbrella for `Products`.

### User (Staff)

- **Fields**:
  - `identifier` (Authentication ID resolving to Convex Auth session).
  - `permissions` (Array of literal strings e.g. `VIEW_ORDERS`, `VERIFY_PAYMENTS`, `MANAGE_SHIPPING_STATUS`, `PROCESS_RETURNS`, `MANAGE_PRODUCTS`, `ADJUST_REAL_STOCK`, `MANAGE_DISPLAY_STOCK`, `MANAGE_CATEGORIES`, `VIEW_FINANCIALS`, `MANAGE_SYSTEM_CONFIG`, `RESOLVE_FRAUD`, `MANAGE_USERS`).
- **Validation Rules**:
  - Staff explicitly never possess a singular "role=admin" string that inherently bypasses checks. System loops through the array array specifically on mutation invocation.

### AuditLog

- **Fields**:
  - `timestamp`
  - `actor_id`
  - `entity_type`
  - `entity_id`
  - `action` (e.g. `STATUS_CHANGE_CONFIRMED`)
  - `previous_state` (JSON)
  - `new_state` (JSON)
- **Validation rules**: Strictly append-only. No UPDATE or DELETE mutations are exposed or allowed on this table.
