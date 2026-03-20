# Feature Specification: Phase 8 – Operations, Returns & Logistics

**Feature Branch**: `008-ops-returns-logistics`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: User description: "Phase 8 - Operations, Returns & Logistics. Define the strict technical specifications for Dynamic Shipping Fees, Staff Provisioning (Super Admin Only), and Returns Workflow (RTO)."

## Clarifications

### Session 2026-03-20

- Q: Post-Delivery Partial Returns (Scope & Behavior) → A: Independent Restock Mutation (Option B). Post-delivery partial returns are handled via an independent SKU restock mutation, keeping the courier RTO workflow separate for full-order failures.
- Q: Privilege Escalation Prevention (Security & Privacy) → A: Restricted Delegation (Option A). Managers with `MANAGE_USERS` can only assign permissions that they themselves already possess, preventing malicious or accidental privilege escalation (e.g., granting `VIEW_FINANCIALS` when they don't have it).
- Q: Governorate Database Seeding (Integration & Constraints) → A: Manual Entry (Option B). The governorates table will begin empty, and the Super Admin must manually create all 27 entries and assign their fees via the Dashboard UI.

## User Scenarios & Testing *(mandatory)*
### User Story 1 – Dynamic Shipping Fee at Checkout (Priority: P1)

As a **Customer**, I want to see the exact shipping cost for my governorate update in real-time when I select it during checkout, so that I know the true total before committing to the order and there are no hidden costs.

**Why this priority**: Shipping fees are a primary trust signal in Egyptian e-commerce. Displaying them dynamically is essential for purchase confidence and directly reduces cart abandonment. This is also a hard dependency for the order's financial snapshot (the `applied_shipping_fee` field defined in PRD §3.3), and without it, the platform cannot calculate accurate totals.

**Independent Test**: Can be fully tested by navigating to the checkout page, selecting different governorates from a dropdown, and confirming the order total updates instantly. A placed order's total must equal (item subtotal + governorate shipping fee).

**Acceptance Scenarios**:

1. **Given** a customer with items in their cart, **When** they proceed to checkout and select "Cairo" (shipping fee: 60 EGP), **Then** the order summary dynamically displays the item subtotal + 60 EGP as the total.
2. **Given** a customer viewing the checkout page, **When** they change their governorate selection from "Cairo" (60 EGP) to "Aswan" (90 EGP), **Then** the displayed total instantly recalculates using 90 EGP without a page reload.
3. **Given** a customer who selects a governorate, **When** they place the order, **Then** the backend mutation calculates the total server-side using the live shipping fee for that governorate, and the resulting order record contains an immutable `appliedShippingFee` snapshot.
4. **Given** a disabled governorate (e.g., "North Sinai" is toggled off by the admin), **When** a customer views the checkout page, **Then** that governorate does not appear in the selectable list.

---

### User Story 2 – Super Admin Manages Governorate Shipping Fees (Priority: P1)

As a **Super Admin**, I want a dedicated interface in the Admin Dashboard to create, update, enable/disable, and price each Egyptian governorate's shipping fee, so that I can adapt instantly when courier companies change their pricing without needing a developer.

**Why this priority**: Without a governorate pricing data source, the checkout integration (User Story 1) cannot function. This is its prerequisite. Additionally, the PRD (§3.2) mandates Zone-Based Pricing and Toggle Availability.

**Independent Test**: Can be fully tested by logging in as Super Admin, navigating to the Governorate Management view, creating a new governorate entry, editing its fee, toggling it on/off, and confirming changes are persisted.

**Acceptance Scenarios**:

1. **Given** a Super Admin with `MANAGE_SYSTEM_CONFIG` permission, **When** they navigate to the "Governorate Management" view, **Then** they see a list of all governorates with their name, shipping fee, and active/inactive status.
2. **Given** a Super Admin, **When** they update "Alexandria"'s shipping fee from 55 EGP to 70 EGP, **Then** the fee is persisted, an immutable audit log entry is recorded, and all *future* orders from Alexandria use 70 EGP. Existing orders retain their original snapshot fee.
3. **Given** a Super Admin, **When** they toggle "Port Said" to inactive, **Then** that governorate immediately ceases to appear on the Storefront checkout. Existing orders for "Port Said" are unaffected.
4. **Given** a user *without* `MANAGE_SYSTEM_CONFIG` permission, **When** they attempt to access the governorate management mutations, **Then** the backend rejects the request.

---

### User Story 3 – Staff Account Provisioning (Priority: P2)

As a **Super Admin**, I want a "Team Management" view in the Admin Dashboard where I can invite or create new staff accounts and assign granular RBAC permission flags, so that I can safely scale my team without needing access to the Convex dashboard or a developer.

**Why this priority**: Staff provisioning is essential for scaling operations (adding verifiers, support agents). However, the platform is functional for a single Super Admin without it. The PRD (§5.1) mandates dynamic role architecture managed via a dashboard interface.

**Independent Test**: Can be fully tested by the Super Admin creating a new staff member email/name, assigning specific permissions (e.g., `VIEW_ORDERS`, `VERIFY_PAYMENTS`), and then logging in as the new staff member to confirm they can only access their permitted actions.

**Acceptance Scenarios**:

1. **Given** a Super Admin with `MANAGE_USERS` permission, **When** they navigate to the "Team Management" view in the dashboard, **Then** they see a list of all staff accounts with their name, email, and current permission flags.
2. **Given** a Super Admin, **When** they fill in a new staff member's name, email, and a temporary password, and toggle on `VIEW_ORDERS` and `VERIFY_PAYMENTS`, **Then** a new authentication account and users record are created with exactly those permissions, and an audit log entry is recorded.
3. **Given** a Super Admin, **When** they select an existing staff member and toggle `VIEW_FINANCIALS` on/off, **Then** the permission change is persisted atomically, an audit log is recorded, and the staff member's next query immediately reflects the new access level.
4. **Given** a staff member without `MANAGE_USERS` permission, **When** they attempt to create or modify another user's account, **Then** the backend mutation rejects the request.
5. **Given** a Super Admin attempting to create a staff account with a duplicate email, **When** they submit, **Then** the system returns a clear error and does not create a duplicate.

---

### User Story 4 – Returns (RTO) Workflow with Accurate SKU-Level Restocking (Priority: P2)

As an **Ops Agent** with appropriate permissions, I want to mark a shipped order as "RTO" (Return to Origin), so that the system automatically and accurately restocks the `real_stock` at the precise Variant (SKU) level, maintaining the warehouse's inventory truth.

**Why this priority**: RTO is a critical operational reality in Egyptian COD logistics where RTO rates can be significant. Accurate restocking prevents phantom inventory loss. However, the core order-to-ship flow functions without it; RTO adds operational completeness. The PRD (§2.2, State 8) mandates that RTO triggers real_stock incrementation.

**Independent Test**: Can be fully tested by creating an order, confirming it (stock deducted), transitioning it to `SHIPPED`, then transitioning it to `RTO`, and verifying the specific SKU's `real_stock` is incremented by the exact order quantity.

**Acceptance Scenarios**:

1. **Given** an order in `SHIPPED` state for SKU "T900-Black" (qty: 2), and current `real_stock` for that SKU is 8, **When** an authorized agent transitions the order to `RTO`, **Then** `real_stock` for SKU "T900-Black" is atomically incremented to 10, and an immutable audit log entry recording the restock is created.
2. **Given** an order in `CONFIRMED` state, **When** an agent attempts to transition it directly to `RTO`, **Then** the system rejects the transition because `RTO` is only reachable from `SHIPPED` (FSM enforcement).
3. **Given** an order in `SHIPPED` state containing a bundle product, **When** the order is transitioned to `RTO`, **Then** *each component SKU* in the bundle's Bill of Materials (BOM) has its `real_stock` incremented by its respective BOM quantity.
4. **Given** a user without `MANAGE_SHIPPING_STATUS` permission, **When** they attempt to transition an order to `RTO`, **Then** the backend mutation rejects the request.

---

### User Story 5 – Post-Confirmation Cancellation Restocking (Priority: P2)

As an **authorized staff member**, I want the system to automatically restock `real_stock` at the SKU level when a `CONFIRMED` order is cancelled before shipping, so that confirmed-but-uncollected inventory is accurately recovered.

**Why this priority**: The PRD (§2.4, Case 2) explicitly mandates that cancellations *after* confirmation must trigger a stock increment. This is a companion to the RTO workflow and completes the inventory recovery lifecycle.

**Independent Test**: Can be fully tested by confirming an order (stock deducted), then cancelling it, and verifying the SKU's `real_stock` is incremented back.

**Acceptance Scenarios**:

1. **Given** a `CONFIRMED` order for SKU "Mouse-Red" (qty: 1), and current `real_stock` is 14, **When** an authorized agent transitions the order to `CANCELLED`, **Then** `real_stock` for "Mouse-Red" is atomically incremented to 15, and an audit log entry is created.
2. **Given** a `PENDING_PAYMENT_INPUT` or `AWAITING_VERIFICATION` order, **When** it is cancelled, **Then** `real_stock` is NOT affected (stock was never deducted for these pre-confirmation states).

---

### Edge Cases

- **Concurrent RTO/Cancellation on the same order**: Two agents attempt to cancel or RTO the same order simultaneously. The system must ensure `real_stock` is only incremented once per order transition. Convex's transactional guarantees handle this atomically.
- **Governorate fee update during active checkout session**: A Super Admin changes Cairo's shipping fee while a customer has Cairo selected at checkout. The customer's order must snapshot the fee at the moment of order placement, not the updated fee (PRD §2.4, Case 3 – "Price at Time of Order").
- **Staff self-demotion**: A Super Admin accidentally removes their own `MANAGE_USERS` permission. The system should prevent the last user with `MANAGE_USERS` from revoking their own permission to avoid a lockout scenario.
- **Disabling all governorates**: If every governorate is toggled inactive, the checkout form must gracefully indicate that delivery is currently unavailable, preventing order submission.
- **RTO for an order whose SKU has been deleted/deactivated**: The system should still increment the `real_stock` of the SKU record regardless of its active status, since the physical stock still exists in the warehouse.
- **Email uniqueness across auth and users table**: The staff provisioning flow must validate uniqueness across both the Better-Auth accounts table and the Convex `users` table to prevent orphaned or duplicate records.

## Requirements *(mandatory)*

### Functional Requirements

#### Dynamic Shipping & Governorate Management

- **FR-001**: System MUST maintain a persistent data entity for each Egyptian governorate, containing at minimum: name (Arabic), name (English), shipping fee (numeric), and active/inactive status.
- **FR-002**: System MUST expose the list of active governorates (with their shipping fees) to the Storefront checkout page as a public, unauthenticated read operation.
- **FR-003**: System MUST dynamically calculate the order total server-side as `(sum of SKU prices × quantities) + governorate shipping fee` during order placement. The frontend display is a preview only; the backend is the authority.
- **FR-004**: System MUST snapshot the `appliedShippingFee` and the `governorateId` into the order record at the moment of creation. This snapshot is immutable and unaffected by future fee updates.
- **FR-005**: System MUST validate all governorate management mutations (create, update, toggle active status) against the `MANAGE_SYSTEM_CONFIG` permission flag.
- **FR-006**: System MUST create an immutable audit log entry for every governorate record creation, fee update, or active status toggle.
- **FR-007**: System MUST prevent order placement if the selected governorate is currently inactive, returning a clear error.
- **FR-008**: System MUST NOT display inactive governorates in the Storefront checkout dropdown.

#### Staff Provisioning & Team Management

- **FR-009**: System MUST provide a secured mutation to create new staff accounts. This mutation MUST: create a Better-Auth authentication record (email + hashed password), create a corresponding `users` table record with the specified permission flags, and log an immutable audit entry.
- **FR-010**: System MUST validate the staff creation mutation against the `MANAGE_USERS` permission flag. Unauthorized users must be rejected. Furthermore, the system MUST prevent privilege escalation by ensuring the acting user can only grant permission flags that they currently possess.
- **FR-011**: System MUST enforce email uniqueness across both the authentication layer and the `users` table. Duplicate email attempts must return a clear, descriptive error.
- **FR-012**: System MUST provide a mutation to update any staff member's permission flags. This mutation must be gated by `MANAGE_USERS` and must generate an audit log entry capturing the before/after permission arrays.
- **FR-013**: System MUST provide a "Team Management" view in the Admin Dashboard listing all staff accounts with their name, email, and currently assigned permission flags.
- **FR-014**: System MUST prevent the last remaining user with `MANAGE_USERS` permission from revoking their own `MANAGE_USERS` flag, to avoid a system lockout.

#### Returns Workflow (RTO) & Inventory Recovery

- **FR-015**: System MUST extend the order FSM to include `READY_FOR_SHIPPING`, `SHIPPED`, `DELIVERED`, and `RTO` states in addition to the existing states.
- **FR-016**: System MUST enforce strict FSM transitions: `RTO` is only reachable from `SHIPPED`. Direct transitions to `RTO` from any other state must be rejected.
- **FR-017**: When an order transitions to `RTO`, the system MUST atomically increment the `real_stock` of the specific SKU (variant) referenced by the order, by the exact order quantity.
- **FR-018**: When a `CONFIRMED` order transitions to `CANCELLED`, the system MUST atomically increment the `real_stock` of the specific SKU referenced by the order, by the exact order quantity. Pre-confirmation cancellations MUST NOT affect `real_stock`.
- **FR-019**: System MUST validate the `RTO` and `SHIPPED` / `DELIVERED` transition mutations against `MANAGE_SHIPPING_STATUS` permission flag.
- **FR-020**: System MUST create an immutable audit log entry for every order state transition, capturing the previous state, new state, the actor, the affected SKU(s), and any stock adjustment amounts.
- **FR-021**: For bundle orders, the RTO restocking mutation MUST iterate through each component in the bundle's Bill of Materials and increment each component SKU's `real_stock` by its BOM-defined quantity.
- **FR-022**: System MUST guarantee that restocking (increment) operations never execute more than once per state transition per order, leveraging transactional atomicity.
- **FR-023**: System MUST provide a dedicated, independent `restockItem` mutation to allow authorized support agents to increment `real_stock` for specific variants, supporting partial customer returns post-delivery without altering the primary order FSM.

### Key Entities

- **Governorate**: Represents an Egyptian administrative region with distinct shipping logistics. Key attributes: name (Arabic), name (English), shipping fee, active status. Relationships: referenced by orders to snapshot the shipping cost at order creation.
- **Users (Staff)**: Represents an operational staff member. Key attributes: name, email, identifier (linked to auth provider), permission flags array. Relationships: linked to Better-Auth authentication records; referenced by audit logs as actors.
- **Orders (Extended)**: Existing order entity extended with: `governorateId` (reference to the governorate entity at time of order), `appliedShippingFee` (immutable snapshot), and additional FSM states (`READY_FOR_SHIPPING`, `SHIPPED`, `DELIVERED`, `RTO`).
- **SKUs**: Existing variant entity. Key interaction: `real_stock` is the target field for both deduction (on CONFIRMED) and increment (on RTO/post-confirmation CANCELLED). Stock operations must always target the specific SKU, never the parent product.
- **Audit Logs**: Existing entity. Extended usage: captures all new operations (governorate changes, staff provisioning, RTO restocking, permission updates).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can see the shipping fee for their selected governorate and the updated order total within 1 second of selection during checkout, with zero page reloads.
- **SC-002**: Super Admins can create a new governorate entry, update its shipping fee, and toggle its visibility in under 2 minutes through the dashboard interface.
- **SC-003**: Super Admins can create a new staff account and assign permissions in under 3 minutes from the Team Management view, with zero need to access the Convex dashboard or any code deployment.
- **SC-004**: 100% of RTO transitions result in accurate `real_stock` incrementation at the exact SKU level, with zero inventory drift.
- **SC-005**: 100% of post-confirmation cancellation transitions result in accurate `real_stock` recovery at the SKU level.
- **SC-006**: Every governorate fee change, staff account creation, permission update, and order state transition generates a complete, immutable audit log entry.
- **SC-007**: Staff members without `MANAGE_USERS` permission are blocked from creating or modifying staff accounts with a 100% enforcement rate.
- **SC-008**: Staff members without `MANAGE_SYSTEM_CONFIG` permission are blocked from modifying governorate data with a 100% enforcement rate.
- **SC-009**: The system prevents the last user with `MANAGE_USERS` from self-revoking that permission, maintaining system administrative access at all times.
- **SC-010**: Order totals are always calculated server-side, and the stored `appliedShippingFee` snapshot is immune to retroactive fee changes.

## Assumptions

- **Egyptian Governorates**: There are 27 Egyptian governorates. The system will start with an empty table, and the Super Admin is responsible for manually adding them, establishing their names, and configuring their dynamic shipping fees via the newly structured Dashboard UI.
- **Authentication Provider**: Staff accounts use Better-Auth (credential provider) as already established in the codebase via `createInitialAdmin`.
- **Password Policy**: Staff temporary passwords follow a minimum length requirement (assumed 8+ characters). The system does not enforce a "change password on first login" flow in this phase (noted as a potential future enhancement).
- **Bundle BOM**: The Bill of Materials (BOM) data structure for bundles referenced in FR-021 is assumed to already exist or will be established alongside it; if not yet present, the RTO restocking for bundles will gracefully skip BOM iteration for non-bundle products.
- **Order Schema Extension**: Adding new fields (`governorateId`, `appliedShippingFee`) and new FSM states to the `orders` table is a non-breaking, additive change. Existing orders will have these fields as `undefined`/optional.
- **Single-SKU Orders**: The current order schema has one `productId` + one `skuId` per order row. Multi-line orders are represented as multiple order records sharing a `shortCode`. RTO/cancellation restocking operates per order row.
