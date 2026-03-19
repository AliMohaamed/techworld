# Feature Specification: Standalone Admin Dashboard Architecture

**Feature Branch**: `006-admin-dashboard-arch`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Standalone Admin Dashboard Architecture. Based on the @[PRD.md], define the technical specifications for a completely separate Next.js Admin Dashboard application. Focus strictly on: Architecture, Security & RBAC, Core Modules (Order Management, Catalog Management), UI/UX."

## Clarifications

### Session 2026-03-19

- Q: What authentication provider should be used for staff login on the standalone admin dashboard? → A: Convex Auth
- Q: How should the workspace be structured to accommodate the standalone application while accessing the same Convex schemas? → A: Monorepo structure (apps/storefront, apps/admin, packages/convex)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Order Management & Verification Workflow (Priority: P1)

As an Operations Agent, I need a desktop-first interface to view the queue of orders in the `AWAITING_VERIFICATION` state so that I can manually verify customer WhatsApp payment receipts and transition orders to the `CONFIRMED` state.

**Why this priority**: Order verification is the core operational bottleneck in the Hybrid COD model. Without this interface, the business cannot process payments, and inventory deduction will not occur.

**Independent Test**: Can be independently tested by logging in as an Operations Agent, viewing the pending queue, opening a `AWAITING_VERIFICATION` order, uploading a manual receipt screenshot, and successfully transitioning it to `CONFIRMED`.

**Acceptance Scenarios**:

1. **Given** an Operations Agent views the order queue, **When** they filter for `AWAITING_VERIFICATION`, **Then** they see an organized data table of pending orders.
2. **Given** an order requires manual validation, **When** the Agent uses the "Manual Fallback" UI to attach a WhatsApp receipt and clicks Confirm, **Then** the order transitions to `CONFIRMED` and `real_stock` is atomically deducted via Convex.
3. **Given** an order is confirmed, **When** `real_stock` was already zero prior to confirmation, **Then** the system prevents the transition and displays an "Out of Stock" error.

---

### User Story 2 - Catalog & Category Management (Priority: P2)

As a Super Admin, I need a comprehensive UI to perform CRUD operations on Categories and Products so that I can update the catalog dynamically without direct backend access.

**Why this priority**: The storefront requires a dynamically managed inventory. Categories must exist before Products can be created, and products need precise SKU-level management.

**Independent Test**: Can be fully tested by creating a new category, toggling its active state, creating a product associated with that category, and updating its display and real stock independently.

**Acceptance Scenarios**:

1. **Given** a Super Admin interface, **When** creating a new category with English and Arabic names, **Then** the operational system saves it and allows it to be linked to products.
2. **Given** an active category, **When** a Super Admin toggles its `isActive` flag to false, **Then** the category is soft-deleted without affecting historical data.
3. **Given** a new product creation flow, **When** the Super Admin creates variants (SKUs), **Then** they must assign physical `real_stock` and manipulative `display_stock` separately.

---

### User Story 3 - Role-Based Access Control & Security Enforcement (Priority: P3)

As a System Administrator, I need the dashboard to visually hide or expose sections and actions (e.g., Financial Data) strictly based on my backend permission flags (e.g., `VIEW_FINANCIALS`) rather than hardcoded roles.

**Why this priority**: Protecting business intelligence and margin data from operations staff is a non-negotiable constraint of the PRD.

**Independent Test**: Can be fully tested by logging in as an agent without `VIEW_FINANCIALS` and verifying that all COGS, net margins, and total revenue metrics are redacted or inaccessible.

**Acceptance Scenarios**:

1. **Given** an Operations Agent logs in, **When** they navigate to order details, **Then** they cannot see COGS or profit margins.
2. **Given** an Operations Agent attempts to adjust system configuration, **When** they lack the `MANAGE_SYSTEM_CONFIG` flag, **Then** the UI hides the configuration panel and any API request fails.
3. **Given** a Super Admin accesses the system, **When** they view the dashboard, **Then** all financial metrics and system configurations are fully visible and editable.

---

### Edge Cases

- How does the dashboard UI handle "Negative Concurrency Collisions" (e.g., an agent trying to confirm an order right after another agent depleted the last `real_stock`)? _(Answer: The UI must gracefully catch the backend error and notify the agent without crashing.)_
- How does the system handle an agent attempting to create a product without a valid, active `categoryId`? _(Answer: Form validation must block submission, requiring a valid selection.)_
- What happens if the authentication session expires while an agent is filling out the manual WhatsApp receipt upload form? _(Answer: The UI should preserve the input if possible, prompt for re-authentication, or clearly notify the user of the session timeout.)_

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Admin Dashboard MUST be a standalone Next.js application, isolated from the Customer Storefront by restructuring the workspace into a Monorepo pattern (e.g., Turborepo or npm workspaces). Both apps must securely connect to the same existing Convex project via a shared package.
- **FR-002**: The Dashboard MUST utilize a desktop-first design pattern, relying heavily on data tables, sidebars, and high-density information layouts.
- **FR-003**: System MUST strictly validate all actions against granular permission flags (e.g. `VIEW_FINANCIALS`, `VERIFY_PAYMENTS`, `MANAGE_PRODUCTS`), never using hardcoded string-based roles. It MUST use Convex Auth exclusively for staff identity and session management.
- **FR-004**: System MUST dynamically redact or hide financial data (COGS, net margins, total revenue) for any logged-in user who lacks the `VIEW_FINANCIALS` permission.
- **FR-005**: The Order Management view MUST visually map directly to the Finite State Machine (FSM) states defined in the PRD (PENDING_PAYMENT_INPUT, AWAITING_VERIFICATION, CONFIRMED, etc.).
- **FR-006**: The Order verification flow MUST include a "Manual Fallback" interface allowing agents to upload validation proof (images/receipts) and manually progress the FSM to `CONFIRMED`.
- **FR-007**: The Catalog Management module MUST enforce strict entity relationships, requiring Categories to exist before Products can be established.
- **FR-008**: System MUST support localized inputs specifically for bilingual product/category names and descriptions (Arabic and English).

### Key Entities 

- **Order**: Represents a customer purchase lifecycle tracked linearly across the FSM states. Includes attached manual verification records.
- **Category**: A localized structural umbrella for products. Can be toggled active/inactive securely.
- **Product (SKU)**: Represents the physical items with independent `real_stock` and `display_stock` variables. 
- **User (Staff)**: Represents operational and administrative dashboard users, holding precise permission flags defining their operational capabilities.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operations Agents can process and transition an `AWAITING_VERIFICATION` order to `CONFIRMED` via the manual fallback UI in under 45 seconds on average.
- **SC-002**: Super Admins can successfully generate a new active category and link a newly created product/SKU to it without navigating away from the catalog namespace.
- **SC-003**: Zero sensitive financial metrics (e.g., COGS) leak into the frontend UI or network responses for users lacking the `VIEW_FINANCIALS` permission flag.
- **SC-004**: System cleanly captures and displays user-friendly error messages during negative stock collisions 100% of the time without unhandled runtime exceptions.
