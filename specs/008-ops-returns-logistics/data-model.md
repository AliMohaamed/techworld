# Phase 1: Data Model & Contracts

## Entity Modifications (Target: `convex/schema.ts`)

### New Table: `governorates`
Represents an Egyptian administrative region with localized names and its dynamic shipping fee.

**Fields**:
- `name_ar` (string): Arabic translation of the governorate (e.g., "القاهرة").
- `name_en` (string): English translation (e.g., "Cairo").
- `shipping_fee` (number): The cost in EGP to deliver to this region.
- `isActive` (boolean): Controls visibility during checkout. Inactive governorates are not selectable but still exist for historical records.

**Relationships**:
- None directly mapping out, but deeply referenced by new `orders`.

**Validation Rules**:
- `shipping_fee` must be a non-negative number.

---

### Modified Table: `orders`
Existing schema extended to support spatial logic, financial snapshots corresponding strictly to delivery regions, and the complete FSM lifecycle.

**New Fields**:
- `governorateId` (optional Reference to `governorates`): Immutable reference to the chosen region when the order was placed.
- `appliedShippingFee` (optional number): Financial snapshot preventing retroactive charge recalculations if a fee changes.

**FSM State Union Extension**:
The `state` string literal union must be expanded to include the fulfillment lifecycle:
- `"READY_FOR_SHIPPING"`: Batch exported for Bosta/Mylerz sheets.
- `"SHIPPED"`: Sent out.
- `"DELIVERED"`: Successful fulfillment.
- `"RTO"`: Return To Origin (Courier delivery failure).

**State Transitions (Strictly Server-Side)**:
- `SHIPPED` -> `RTO`:
  - **Side Effect**: Increments `real_stock` on the linked SKU by the order `quantity` (or increments each SKU in the BOM if the product is a bundle).
- `CONFIRMED` -> `CANCELLED`:
  - **Side Effect**: Post-confirmation cancellations revert the confirmed status and must increment `real_stock` by the `quantity`.
- Pre-`CONFIRMED` states -> `CANCELLED`:
  - **Side Effect**: None (stock wasn't deducted yet, reflecting VFH-COD strategy).

---

### Modified Table: `users`
**Fields**:
- No structural changes to the schema file itself for Staff Provisioning!
- The existing `permissions` field (Array of strings from `permissionValues` from `lib/permissions.ts`) is fully capable of capturing all granular access rights (e.g. `MANAGE_USERS`, `MANAGE_SYSTEM_CONFIG`).

**Validation Rules (Mutation logic in `users.ts`)**:
- Enforce unique `email` against both Convex and the Better-Auth database.
- *Strict Bounds Constraint*: When users are inserted/patched via `createUser` or `updateUserPermissions`, a system check MUST guarantee the delegator explicitly possesses every permission flag they are attempting to grant.

---

### Modified Action: Audit Logs
- Automatically tracks `ORDER_STATUS_UPDATED` (recording previous state, new state, and any SKU `real_stock` increments).
- Automatically tracks `GOVERNORATE_CREATED`, `GOVERNORATE_UPDATED`, and `GOVERNORATE_DELETED`.
- Automatically tracks `USER_PERMISSIONS_UPDATED` and `STAFF_USER_CREATED`.

## Interfaces / Contracts

**Storefront Integration**:
- The Next.js frontend checkout must now call a public Convex query (e.g., `api.governorates.listActive`) to populate the dropdown.
- The payload sent to `placeOrderFromSession` must include the selected `governorateId`. Sub-total calculation remains strictly server-side (FR-003 constraint).

**Admin Integration (System Config)**:
- Super Admins use new mutations (`createGovernorate`, `updateGovernorate`, `toggleGovernorateStatus`) guarded strictly by `MANAGE_SYSTEM_CONFIG`.

**Admin Integration (Team Management)**:
- Super Admins use new mutations (`createStaffUser`, `updateStaffPermissions`) guarded strictly by `MANAGE_USERS` (and bounded by the specific flags they possess).
