# Feature Specification: Customer Storefront UI

**Feature Branch**: `004-storefront-ui`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "Customer Storefront UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Flash Sale Mobile Browsing (Priority: P1)

As a customer browsing on a mobile device, I want to experience a high-performance storefront featuring dark mode aesthetics, clean Space Grotesk typography, and striking yellow (#ffc105) action buttons, so that I feel a premium level of trust and urgency to buy products. 

**Why this priority**: Mobile traffic is the primary driver of sales. A premium, high-urgency visual experience directly impacts conversion rates during flash sales.

**Independent Test**: Can be fully tested by loading the Home and Product Detail Pages on a mobile device to verify the layout, typography, and dark mode theming strictly match the prescribed Design System.

**Acceptance Scenarios**:

1. **Given** a user opens the storefront on a mobile device, **When** the Home layout renders, **Then** it defaults to Dark Mode, uses Space Grotesk for all text, and primary CTAs are styled with #ffc105.
2. **Given** a user is viewing a Product Detail Page, **When** they inspect the stock indicator, **Then** the UI reflects the real-time `display_stock` seamlessly fetched from the backend.

---

### User Story 2 - Authoritative Cart & Drawer (Priority: P1)

As a customer selecting items, I want to add products to a persistent side Drawer/Cart seamlessly. The UI must always accurately display pricing and stock directly validated by the server, ensuring I am never misled about totals or availability.

**Why this priority**: Absolute server authority ensures zero discrepancy between what the user sees and what the system enforces, preventing overselling or incorrect invoice calculations.

**Independent Test**: Can be fully tested by adding multiple items to the cart and observing that totals are derived entirely from backend query responses without client-side math.

**Acceptance Scenarios**:

1. **Given** the user adds an item to the cart, **When** the cart drawer opens, **Then** all prices and totals strictly reflect data returned directly from Convex `cart_sessions`.
2. **Given** the user views their cart items, **When** they attempt checkout, **Then** the cart avoids doing any local stock validation and defers entirely to backend checks.

---

### User Story 3 - Category Navigation (Priority: P2)

As a customer exploring the catalog, I want to easily navigate through product categories on my mobile device, allowing me to filter and locate specific types of products without friction.

**Why this priority**: Smooth navigation is crucial to product discovery, especially for stores with diverse inventories extending beyond front-page flash sale items.

**Independent Test**: Can be fully tested by clicking through category filters and ensuring the correct product lists are rendered gracefully.

**Acceptance Scenarios**:

1. **Given** the user is on the Category Browsing screen, **When** they tap a specific category, **Then** the UI seamlessly updates to show grouped products originating from Convex queries.

---

### User Story 4 - Checkout Success & WhatsApp Handoff (Priority: P1)

As a customer who has just placed an order, I want to see a clear success screen with my Order ID and a prominent button redirecting me to WhatsApp, so that my proof of payment is directly and accurately matched with my specific order.

**Why this priority**: Correctly matching a customer's payment to their order is the linchpin of the Verification-First Hybrid COD functionality. The WhatsApp handoff automation minimizes human error and operational friction.

**Independent Test**: Can be tested by forcing a successful checkout state and verifying that the generated WhatsApp URL contains the exact pre-filled text with the generated Order ID.

**Acceptance Scenarios**:

1. **Given** a customer successfully creates an order, **When** they are redirected to the Success Screen, **Then** their specific Order ID/Short Code is prominently displayed.
2. **Given** the customer is on the Success Screen, **When** they click the #ffc105 "Send Payment Proof" CTA, **Then** they are redirected to the business WhatsApp with a pre-filled message including their Order ID.

### Edge Cases

- **Real-time Stock Depletion**: If a highly sought-after product drops to 0 stock simultaneously while a user is on the Product Detail Page, the UI must gracefully react to the updated Convex query subscription and reflect the "Out of Stock" state on the CTA without requiring a page reload.
- **Client-Side Data Manipulation**: If a malicious user attempts to alter cart prices or stock values in their browser window, the UI will strictly reflect the single source of truth from Convex when rendering totals, negating the spoofed attempt.
- **Lost Connection to Backend**: What happens when the websocket connection to Convex is interrupted? The UI must display an offline connection state and prevent users from attempting checkout or modifications until reconnected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The UI MUST strictly follow the prescribed Design System, defaulting to Dark Mode, utilizing Space Grotesk typography, and applying the #ffc105 yellow accent for primary interactive elements.
- **FR-002**: Storefront layouts MUST be mobile-first. Specific optimized layouts MUST be created for Home, Category Browsing, Product Detail Pages, and a persistent Drawer/Cart.
- **FR-003**: The architecture MUST strictly adhere to the Absolute Server Authority principle. The UI is strictly a presentation layer.
- **FR-004**: The UI MUST NOT perform local cart total calculations, validate stock levels locally, or dictate pricing logic under any condition.
- **FR-005**: All product, stock, and pricing data reflected on the UI MUST purely originate from real-time Convex `products` and `cart_sessions` queries.
- **FR-006**: The shopping cart MUST be implemented as a side Drawer and maintain session continuity across browser reloads or accidental drops.
- **FR-007**: The Next.js root layout or global provider MUST reliably check for and generate a UUID `sessionId` in Local Storage upon a user's first visit. This `sessionId` MUST be utilized for all Convex cart queries and mutations.
- **FR-008**: The UI MUST include a "Checkout Success" screen displayed upon successful order placement. It MUST display the generated Order ID / Short Code prominently and feature a #ffc105 primary CTA button linking to the business WhatsApp.
- **FR-009**: The WhatsApp CTA link on the Success screen MUST contain a pre-filled message that includes the specific Order ID for accurate webhook receipt matching.

### Key Entities

- **Storefront View**: A presentation-only UI construct mapping state from the backend to predefined mobile layouts.
- **Cart Drawer**: A slide-out presentation pane displaying `cart_sessions` data queried from Convex.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The storefront achieves mobile Lighthouse performance scores of 90+, ensuring high speed and responsiveness critical for social commerce traffic.
- **SC-002**: The implemented UI components visually pass a 1:1 parity check against the Stitch MCP project targets (ID: 6118921326996911734) in terms of colors, typography, and spacing.
- **SC-003**: A full audit confirms 0 instances of client-side math being used for invoice totals, shipping calculations, or stock deductions in the Next.js codebase.
- **SC-004**: The time-to-interactivity for viewing products and adding to cart remains perceptibly instantaneous (sub-1 second).
