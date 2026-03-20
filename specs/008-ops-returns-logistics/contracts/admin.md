# Admin Integration Contracts

## Team Management Mutation

**`api.users.provisionStaff`**
- **Action**: Atomically creates a Better-Auth credential account and a tightly coupled Convex `users` record.
- **Constraints**: Gated by `MANAGE_USERS`. Caller must possess identical or greater flags than strictly requested. Email uniqueness across `auth` and `users` tables.
- **Inputs**:
  - `name`: string
  - `email`: string
  - `password`: string
  - `permissions`: array of Valid RBAC Identifiers natively extracted from `permissionValues` in `convex/lib/permissions.ts`.

## Governorate Tracking Mutation

**`api.governorates.create`**
- **Action**: Pushes a new entity to `governorates` to seed dynamic capabilities.
- **Constraints**: Gated by `MANAGE_SYSTEM_CONFIG`.
- **Inputs**:
  - `name_ar`: string
  - `name_en`: string
  - `shipping_fee`: number
  - `isActive`: boolean

## Shipping Operations Mutation

**`api.orders.updateRto`**
- **Action**: Force transitions a target `SHIPPED` order to `RTO`. Increments specific linked SKU `real_stock` by original `quantity`. Generates an audit record documenting previous state and stock changes.
- **Constraints**: Force transitioned only by `MANAGE_SHIPPING_STATUS`. Direct FSM paths ONLY (`AWAITING_VERIFICATION` to `RTO` throws error).
- **Inputs**:
  - `orderId`: string (Id("orders"))

## Restock Post-Delivery Mutation

**`api.skus.restockItem`** (FR-023)
- **Action**: Restocks specific SKUs after customer returns (Partial Post-Delivery).
- **Constraints**: Gated by `PROCESS_RETURNS`.
- **Inputs**:
  - `skuId`: string (Id("skus"))
  - `quantity`: number, minimum 1
- **Side effects**: Directly impacts `real_stock`. Increments.
