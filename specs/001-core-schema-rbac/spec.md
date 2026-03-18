# Feature Specification: Core Data Schema & RBAC Engine

**Feature Branch**: `001-core-schema-rbac`  
**Created**: 2026-03-18  
**Status**: Draft  
**Input**: User description: "Core Data Schema & RBAC Engine" and custom PRD constraints for users, products, orders, and audit_logs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure User Permissions (Priority: P1)

As an administrator, I need to assign granular permission flags (e.g., VIEW_FINANCIALS, VERIFY_PAYMENTS) to users instead of static roles, so we can carefully control who accesses sensitive financial data or modifies inventory without relying on hardcoded roles.

**Why this priority**: Required for all subsequent authorization across the system. It enforces financial opacity.

**Independent Test**: Can be independently tested by assigning a specific flag to a user and verifying that only the permitted actions are allowed.

**Acceptance Scenarios**:

1. **Given** a new employee account, **When** the administrator assigns the `VIEW_FINANCIALS` flag, **Then** the employee can access the financial dashboard.
2. **Given** an employee without the `VERIFY_PAYMENTS` flag, **When** they attempt to verify a payment, **Then** the system denies the action securely.

---

### User Story 2 - Process New Hybrid COD Order (Priority: P1)

As an online customer, I want to place a Hybrid Cash-on-Delivery order that initially waits for my payment input without immediately locking physical products, so that physical stock isn't depleted by unverified orders.

**Why this priority**: Crucial for inventory management, preventing physical stock from dropping prematurely.

**Independent Test**: Can be tested by placing an order and verifying state goes to `PENDING_PAYMENT_INPUT` and `real_stock` remains unchanged, while `display_stock` decreases.

**Acceptance Scenarios**:

1. **Given** an available product with display_stock > 0, **When** a customer places a Hybrid COD order, **Then** the order state becomes `PENDING_PAYMENT_INPUT`, the product's `display_stock` is decremented, but `real_stock` remains the same.
2. **Given** a product with display_stock = 0, **When** a customer attempts to order, **Then** the system rejects the order.
3. **Given** an order stuck in `PENDING_PAYMENT_INPUT` for 24 hours, **When** the scheduled Convex Cron Job executes, **Then** the order state changes to `STALLED_PAYMENT` for CS follow-up instead of being auto-cancelled.

---

### User Story 3 - Verify and Confirm Order Payment (Priority: P1)

As a payment verification agent, I want to verify a payment receipt and transition an order from `AWAITING_VERIFICATION` to `CONFIRMED`, so that the physical inventory is securely deducted only when the payment is validated.

**Why this priority**: Implements the required verification-first order FSM and inventory deduction at the correct state.

**Independent Test**: Can be tested by verifying an order and observing the state change and the `real_stock` decrementing.

**Acceptance Scenarios**:

1. **Given** an order in `AWAITING_VERIFICATION` state, **When** an agent with `VERIFY_PAYMENTS` flag confirms the payment, **Then** the state transitions to `CONFIRMED` and the product's `real_stock` is decremented.
2. **Given** multiple concurrent verifications that reduce stock, **When** `real_stock` reaches the `-5` buffer limit, **Then** any further transaction must throw an "Insufficient Stock" error preventing stock drops to `-6`.
3. **Given** a verification is rejected, **When** the order is cancelled and `display_stock` falls below `real_stock`, **Then** the system triggers a "Soft Sync" adjusting `display_stock = real_stock`, without blindly incrementing `display_stock`.

---

### User Story 4 - Audit Security Actions (Priority: P2)

As a compliance officer, I need to reliably track every critical state transition, inventory adjustment, or permission update in an immutable audit log, so that I have a trustworthy trail for investigating disputes or unauthorized access.

**Why this priority**: Essential for security and transparency but secondary to the core transactional flow.

**Independent Test**: Can be tested by performing core actions and checking the audit log table for corresponding immutable entries.

**Acceptance Scenarios**:

1. **Given** a user changes an order state, **When** the transaction successfully completes, **Then** a new, tamper-proof record is appended to the audit log capturing the user, action, and timestamp.

### Edge Cases

- **Negative Concurrency Collisions (Oversell Allowance)**: The system allows a controlled overselling buffer. `real_stock` is permitted to drop to a strict hard limit of `-5`. Only when it attempts to drop below `-5` does it strictly throw an "Insufficient Stock" error.
- **Rejected Verifications (Soft Sync)**: If verification is rejected, `display_stock` is NOT automatically incremented. Instead, a "Soft Sync" rule applies: if `display_stock` drops below `real_stock` at any point, the system forces `display_stock = real_stock`.
- **Stuck Pending Orders (CS Follow-up)**: Orders stuck in `PENDING_PAYMENT_INPUT` are NEVER auto-cancelled. A 24-hour Convex Cron Job updates these orders to a `STALLED_PAYMENT` state (or `NEEDS_FOLLOW_UP` flag) for Customer Service manual intervention.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST strictly validate all actions against granular permission flags (e.g. `VIEW_FINANCIALS`, `VERIFY_PAYMENTS`), never using hardcoded roles.
- **FR-002**: System MUST manage inventory with decoupled `display_stock` (decremented on order placement) and `real_stock` (decremented only upon order transitioning to `CONFIRMED`).
- **FR-003**: System MUST enforce an exact Finite State Machine for orders containing sequential states such as `PENDING_PAYMENT_INPUT`, `AWAITING_VERIFICATION`, and `CONFIRMED`.
- **FR-004**: System MUST create an immutable tracking table (`audit_logs`) entry for any state transition, inventory adjustment, or permission update.
- **FR-005**: System MUST allow `real_stock` to drop below zero up to a strict hard limit of `-5` (overselling buffer), strictly throwing an "Insufficient Stock" error only when dropping beyond `-5`.
- **FR-006**: System MUST ensure that users without the `VIEW_FINANCIALS` flag cannot view payment receipts or sensitive financial amounts globally across the system.
- **FR-007**: System MUST NOT automatically increment `display_stock` upon order cancellation/rejection. It MUST implement a "Soft Sync" mechanism whereby if `display_stock` drops below `real_stock`, they are synchronized (`display_stock = real_stock`).
- **FR-008**: System MUST execute a 24-hour Convex Cron Job that transitions orders stuck in `PENDING_PAYMENT_INPUT` to `STALLED_PAYMENT` (or sets a `NEEDS_FOLLOW_UP` flag), explicitly ensuring they are not auto-cancelled.

### Key Entities

- **Users**: Represents individuals accessing the system. Contains an array/set of dynamic permission flags instead of singular roles.
- **Products**: Represents items for sale. Contains decoupled inventory metrics specifically separated into `display_stock` (virtual reservation) and `real_stock` (physical count).
- **Orders**: Represents customer purchases. Contains the precise FSM state field (`PENDING_PAYMENT_INPUT`, etc.) tracking its verification lifecycle.
- **Audit Logs**: Immutable tracking table entries representing the `userId`, `actionType`, `entityId`, `timestamp`, and `changes` made.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Invalid state transitions in the Order FSM are 100% rejected by the system.
- **SC-002**: Concurrent verification attempts correctly leverage the overselling buffer, ensuring `real_stock` never drops below `-5` entirely (100% adherence to the strict `-5` floor).
- **SC-003**: 100% of sensitive operations (permission changes, FSM transitions, inventory updates) automatically produce corresponding immutable audit log entries.
- **SC-004**: System successfully isolates financial data, guaranteeing 100% of unauthorized attempts without the `VIEW_FINANCIALS` flag return generic or hidden responses.
