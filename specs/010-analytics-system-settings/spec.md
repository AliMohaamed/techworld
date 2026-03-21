# Feature Specification: Analytics, Intelligence & System Settings

**Feature Branch**: `010-analytics-system-settings`  
**Created**: 2026-03-21  
**Status**: Draft  
**Input**: Phase 9 - Analytics, Intelligence & System Settings

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Analytics & Intelligence Dashboard (Priority: P1)

As a Super Admin, I want to view a centralized analytics dashboard so that I can monitor key business performance metrics in real-time, including profit margins, total orders, and RTO rates, without exposing financial data to operational staff.

**Why this priority**: Business owners need immediate visibility into performance to make decisions, particularly around profitability and shipping success.

**Independent Test**: Can be fully tested by simulating orders with different statuses and verifying that the dashboard accurately reflects aggregated KPIs using Convex queries.

**Acceptance Scenarios**:

1. **Given** a user with the `VIEW_FINANCIALS` and `VIEW_ANALYTICS` permissions, **When** they navigate to the dashboard, **Then** they see accurate metrics for Total Orders, Net Profit, Total COGS, Courier Fees, and RTO Rate.
2. **Given** a user without the `VIEW_FINANCIALS` permission, **When** they navigate to the dashboard, **Then** financial metrics (Net Profit, COGS) are masked or omitted entirely.

---

### User Story 2 - System Settings & Blacklist Management (Priority: P1)

As a Super Admin, I want to manage global application toggles and block malicious phone numbers through a UI so that I can respond to fraud or operational requirements without deploying new code.

**Why this priority**: Dynamic configuration control is vital for operational agility, particularly blocking organized fraud via blacklists and toggling features like COD based on logistics.

**Independent Test**: Can be fully tested by toggling a system configuration (e.g., COD enabled) and placing an order, or by attempting a checkout with a blacklisted phone number and observing the blockade.

**Acceptance Scenarios**:

1. **Given** a customer attempting checkout, **When** they enter a phone number present in the `blacklist` table, **Then** the system automatically transitions their order to a flagged/quarantined state or blocks the checkout entirely.
2. **Given** a Super Admin navigating to the Settings view, **When** they toggle "Maintenance Mode" or "COD Enabled" in the `system_configs`, **Then** the storefront immediately respects this state for all subsequent user sessions.

---

### User Story 3 - Audit Logs Viewer (Priority: P2)

As a Super Admin, I want to view a comprehensive ledger of all critical system actions so that I can investigate operational errors, stock manipulations, and unauthorized actions.

**Why this priority**: Operational transparency and accountability are non-negotiable in the zero-trust architecture defined in the PRD.

**Independent Test**: Can be fully tested by performing a state transition (e.g., confirming an order), navigating to the Audit Logs viewer, and verifying that the exact mutation is recorded with the correct timestamp and user ID.

**Acceptance Scenarios**:

1. **Given** a Super Admin accessing the Audit Logs view, **When** they load the page, **Then** they see a filterable, pageable table of immutable `audit_logs` entries.
2. **Given** a user without the appropriate `MANAGE_USERS` or `VIEW_AUDIT_LOGS` permission, **When** they try to access the Audit Logs view, **Then** the backend rejects the query and the UI displays a 403 Forbidden state.

### Edge Cases

- **Concurrent Config Updates**: What happens if two admins try to update the `system_configs` at the exact same millisecond? Convex's atomic transaction guarantees should serialize these updates.
- **Historic RTO vs Live Data**: How do we efficiently calculate the RTO rate if the number of historic orders is massive?
- **Mass Blacklisting**: How does the system handle an admin attempting to blacklist hundreds of numbers at once?

## Requirements *(mandatory)*

### Functional & Technical Specifications

- **FR-001**: **Analytics Dashboard Queries (Convex)**
  - Define aggregations for:
    - *Total Orders*: Count of orders (filtered by time range).
    - *Net Profit*: `Sum(Net Revenue) - Sum(Snapshot COGS)` across DELIVERED orders.
    - *RTO Rate*: `(Total RTO Orders / Total Shipped Orders) * 100`.
    - *Courier Fees*: Sum of `applied_shipping_fee` on shipped/delivered orders.
    - *Total COGS*: Sum of `unit_cogs` from order item snapshots.
    - *Order Status Breakdown*: Grouped count of orders by status.
  - Queries must strictly validate the `VIEW_FINANCIALS` and `VIEW_ANALYTICS` permissions.

- **FR-002**: **Analytics Dashboard UI Components**
  - Path: `apps/admin/src/app/(dashboard)/page.tsx`
  - Implement summary card components for top-level KPIs (Total Orders, Net Profit, RTO Rate).
  - Implement chart components (e.g., using Recharts) for Sales Velocity and Order Status Breakdown.

- **FR-003**: **System Settings Schema & Logic**
  - Define a singleton `system_configs` table/document in Convex to hold global toggles (e.g., `COD_ENABLED`, `MAINTENANCE_MODE`, `FRAUD_VELOCITY_THRESHOLD`).
  - Read access can be public or authenticated depending on the config (e.g., storefront needs to know if COD is enabled), but write access strictly requires `MANAGE_SYSTEM_CONFIG`.

- **FR-004**: **Blacklist Schema & Logic**
  - Define a `blacklist` table mapping phone numbers to block reasons and timestamps.
  - Integrate a check into the checkout validation mutation: if the user's phone number exists in the `blacklist`, immediately flag or block the transaction.

- **FR-005**: **Audit Logs Viewer**
  - Expose a read-only Convex query for the existing `audit_logs` table (filtering by actor, action type, date range).
  - Present a secure, filterable data table in the Admin dashboard. UI must prevent any editing or deletion of log entries.

### Key Entities

- **`system_configs`**: A singleton or key-value document containing global application settings. Fields include configuration identifiers and their current boolean/string/numeric values.
- **`blacklist`**: Stores `phoneNumber` (string), `reason` (string), `addedBy` (userId), and `addedAt` (timestamp).
- **`audit_logs`**: (Existing entity) Must map directly to the new Data Table UI for visualization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Super Admins can load the Analytics Dashboard and view all KPIs (Total Orders, Profit, RTO Rate) with data aggregating accurately in under 2 seconds.
- **SC-002**: A blacklisted phone number is strictly prevented from completing a successful standard checkout flow.
- **SC-003**: Modifications saved to the `system_configs` table affect the storefront logic instantaneously via Convex subscriptions without requiring a page refresh.
- **SC-004**: Financial data (COGS, Profit) remains strictly invisible to intercepting network requests for any user lacking the `VIEW_FINANCIALS` permission.
