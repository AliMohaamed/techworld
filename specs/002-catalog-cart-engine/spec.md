# Feature Specification: Catalog & Persistent Cart Engine

**Feature Branch**: `002-catalog-cart-engine`  
**Created**: 2026-03-18  
**Status**: Draft  
**Input**: User description: "Catalog & Persistent Cart Engine" — Categories, Product Expansion, Persistent Cart Sessions, and Webhook Architecture.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Products by Category (Priority: P1)

As a customer arriving from a social media ad during a Flash Sale, I want to browse a product catalog organized by categories so I can quickly find the specific type of gadget I am looking for (e.g., "Smart Watches", "Audio") without endless scrolling through a flat, unorganized list.

**Why this priority**: The catalog is the entry point to the entire revenue funnel. Without structured, browsable categories and rich product data (images, descriptions, pricing), no customer can be converted. This is the absolute foundation.

**Independent Test**: Can be independently tested by creating a category, publishing a product within it, and verifying the product appears correctly on the storefront with its images, localized names, pricing, and `display_stock` count.

**Acceptance Scenarios**:

1. **Given** a category "Smart Watches" with `isActive = true` containing 3 published products, **When** a customer navigates to that category on the storefront, **Then** they see all 3 products with their images, localized name (Arabic/English), selling price, and `display_stock` (e.g., "Only 3 left!").
2. **Given** a category with `isActive = false`, **When** a customer attempts to browse that category URL, **Then** the storefront returns an empty state or a "Not Found" page—no products from inactive categories are ever visible to the public in browsing lists. However, direct URLs to its products remain accessible but show an "Unavailable" state.
3. **Given** a product belonging to an active category, **When** the customer views its detail page, **Then** they see a rich description, multiple images, the calculated selling price, and the current `display_stock`. The `real_stock` and COGS values are never exposed.

---

### User Story 2 - Add Items to a Persistent Cart (Priority: P1)

As a customer on a mobile device during a flash sale, I want to add products to my shopping cart and have it persist even if I accidentally close the browser tab or refresh the page, so that I don't lose my selected items and have to start over under time pressure.

**Why this priority**: Cart persistence directly prevents abandonment. In a flash sale context where 90% of traffic is mobile, an accidental page refresh that empties the cart is a lost sale.

**Independent Test**: Can be independently tested by adding items to the cart, closing the browser tab, reopening the storefront, and verifying the cart items are still present.

**Acceptance Scenarios**:

1. **Given** a customer has added 2 items to their cart, **When** they close and reopen the browser tab, **Then** their cart still contains the same 2 items with correct quantities and prices.
2. **Given** a product has `display_stock = 5` and the customer attempts to add a quantity of 6 to the cart, **Then** the system rejects the addition and displays a stock limitation message.
3. **Given** a customer has items in their cart, **When** they navigate to the checkout confirmation step, **Then** the system re-validates every cart item against the current `display_stock` and alerts the customer if any item is no longer available or has insufficient stock.

---

### User Story 3 - Pre-Checkout Cart Validation (Priority: P1)

As the system, I must strictly validate the customer's cart contents against live `display_stock` data before allowing the checkout to proceed, so that the business does not create orders for items that have already been virtually claimed by other shoppers.

**Why this priority**: Without server-side validation, the decoupled inventory strategy breaks. A customer might hold stale cart data from minutes ago while `display_stock` has been depleted. This directly prevents phantom orders.

**Independent Test**: Can be tested by adding an item when `display_stock = 2`, simulating another user depleting stock to 0, and then attempting checkout—expecting a clear validation error.

**Acceptance Scenarios**:

1. **Given** a cart containing Item A (qty 1), **When** the customer proceeds to checkout and `display_stock` for Item A is currently >= 1, **Then** the validation passes and checkout proceeds.
2. **Given** a cart containing Item B (qty 3), **When** the customer proceeds to checkout but `display_stock` for Item B has dropped to 1 since the item was added, **Then** the system rejects checkout for that item, explains the stock shortage, and suggests adjusting the quantity.
3. **Given** a cart with multiple items, **When** one item fails validation but others pass, **Then** the system reports the specific failing item(s) and allows the customer to remove them and continue with the valid items.

---

### User Story 4 - Receive Payment Receipts via Webhook & Manual Fallback (Priority: P2)

As an operations agent, I want WhatsApp/Vodafone Cash payment receipt screenshots sent by customers to be automatically received, parsed, and attached to the relevant pending order in the system by extracting the automated "Order ID / Short Code" from the text. Additionally, I need a manual fallback to upload receipts from the dashboard if the webhook fails.

**Why this priority**: The webhook automates the matching process, but the manual fallback guarantees that operations can continue even during webhook outages without losing verification capabilities.

**Independent Test**: Can be tested by sending a simulated webhook payload with an Order ID text and verifying attachment, followed by using the dashboard to manually upload a receipt image to a pending order.

**Acceptance Scenarios**:

1. **Given** an order `ORD-123` in `AWAITING_VERIFICATION` state, **When** a webhook payload arrives containing the text `ORD-123` along with a payment screenshot, **Then** the system automatically attaches the media reference to the matching order record.
2. **Given** a webhook payload arrives with an Order ID that has no matching pending order, **Then** the system logs the unmatched payload for manual review without throwing an error or losing data.
3. **Given** a customer's WhatsApp payment receipt is received manually by an agent, **When** the agent selects the pending order in the dashboard and uploads the receipt, **Then** the payment proof is successfully attached and the order is ready for verification.

---

### User Story 5 - Manage Categories from Dashboard (Priority: P2)

As a Super Admin, I want to create, edit, and toggle the active state of product categories from the administrative dashboard, so I can organize the storefront catalog without requiring a developer.

**Why this priority**: Category management is essential for catalog organization but is an admin-side concern. The storefront can launch with pre-seeded categories, making this secondary to the customer-facing catalog and cart experience.

**Independent Test**: Can be tested by creating a new category via the dashboard, publishing a product within it, toggling `isActive` to false, and verifying the category and its products disappear from the storefront.

**Acceptance Scenarios**:

1. **Given** a Super Admin with `MANAGE_CATEGORIES` permission, **When** they create a new category with Arabic and English names and a description, **Then** the category is persisted and available for product assignment.
2. **Given** an active category with 5 published products, **When** the Super Admin toggles `isActive` to false, **Then** all 5 products immediately become hidden on the storefront without altering their individual published statuses.
3. **Given** a user without the `MANAGE_CATEGORIES` permission, **When** they attempt to create or modify a category, **Then** the system rejects the action at the server level.

### Edge Cases

- **Stale Cart Data**: What happens when a customer's locally persisted cart references a product that has been entirely deleted or unpublished since their last visit? The system must gracefully remove invalid items from the cart and notify the customer.
- **Category Deactivation Cascade**: When a category is toggled to inactive, all its child products must be hidden from the storefront browsing and search results. However, direct product URLs must NOT return a 404; they must remain accessible for SEO purposes but clearly display an "Unavailable" or "Out of Category" state. Existing orders referencing those products must remain intact.
- **Concurrent Cart Additions During Flash Sales**: If 100 customers simultaneously add the last `display_stock = 1` item to their carts, only one should succeed at checkout validation. The cart itself can allow adding, but the pre-checkout server validation is the strict gatekeeper.
- **Webhook Replay Attacks**: The webhook endpoint must be idempotent. If the same payload is delivered twice (a common occurrence with webhook infrastructure), the system must not duplicate receipt attachments or trigger duplicate state transitions.
- **Product Price Changes After Cart Addition**: If a product's price changes after being added to a customer's cart, the checkout must use the current live price at the moment of order creation (prices are snapshotted at `PENDING_PAYMENT_INPUT` creation, not at cart-add time).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support a `categories` entity with dual-language fields (Arabic/English) for name and description, an `isActive` boolean for soft-deletion, and enforce that every product references exactly one valid, active category.
- **FR-002**: System MUST expand the existing `products` entity to include commercial presentation data: an array of image references, a rich description (Arabic/English), selling price, and optional COGS—while strictly preserving the existing decoupled `display_stock` and `real_stock` inventory fields.
- **FR-003**: System MUST prevent any product from being published (transitioning from Draft to Published) if its parent category has `isActive = false`.
- **FR-004**: System MUST implement a persistent 100% guest cart architecture using a `cart_sessions` table in Convex, mapped to a unique `sessionId` generated by the frontend and stored in Local Storage. No customer login system shall be implemented.
- **FR-005**: System MUST perform a strict server-side validation of all cart items via the `cart_sessions` backend data against live `display_stock` data before allowing the customer to proceed to the checkout confirmation step.
- **FR-006**: System MUST expose a secure, authenticated webhook endpoint capable of receiving incoming media (payment receipt screenshots) and text messages from a WhatsApp API provider.
- **FR-007**: System MUST automatically match incoming webhook payloads to the relevant pending order by extracting a unique "Order ID / Short Code" from the WhatsApp message text, and MUST provide a manual fallback for agents to upload receipts directly to an order via the dashboard.
- **FR-008**: System MUST strip financial fields (COGS, margins) from product data returned to any user lacking the `VIEW_FINANCIALS` permission before the payload leaves the server.
- **FR-009**: System MUST generate immutable audit log entries for all category state changes, product publications, and webhook receipt attachments.
- **FR-010**: System MUST ensure the webhook endpoint is idempotent, rejecting duplicate payloads without creating duplicate records.

### Key Entities

- **Categories**: Represents product groupings. Contains localized `name_ar`, `name_en`, `description_ar`, `description_en`, an `isActive` flag, and an optional image/thumbnail. A category with `isActive = false` hides all child products from the storefront.
- **Products (Expanded)**: Extended from the existing schema. Adds `categoryId` (required reference to an active category), `images` (array of storage references), `description_ar`, `description_en`, `selling_price`, `cogs` (restricted by `VIEW_FINANCIALS`), and a `status` field (Draft/Published). Preserves `display_stock` and `real_stock`.
- **Cart Sessions**: Represents a guest shopper's cart. Contains a unique session identifier (persisted client-side), an array of cart items (product reference, selected quantity), and timestamps for creation/last update.
- **Webhook Receipts**: Represents incoming payment proof from the WhatsApp provider. Contains the sender's phone number, media references (image URLs/storage IDs), raw payload data, a matched order reference (if found), and processing status.

## Assumptions

- There is NO customer login system; it is a 100% guest checkout model. 
- Cart persistence uses a Hybrid Guest approach: The frontend generates a `sessionId` stored in Local Storage, which Convex uses to manage the `cart_sessions` table in the backend. This enables server-side pre-checkout validation and abandoned cart tracking.
- The WhatsApp API provider will send webhook payloads via standard HTTPS POST with a verifiable signature or shared-secret mechanism.
- Product images will be stored via Convex file storage, with the product entity holding an array of storage IDs.
- Cart sessions do not reserve inventory. They are purely a convenience mechanism. All stock enforcement happens at pre-checkout validation and order creation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can browse, filter, and view products organized by category within 2 seconds of page load on a mobile device.
- **SC-002**: Cart contents persist with 100% reliability across browser refreshes, tab closures, and accidental navigation for the duration of the session/cookie lifetime.
- **SC-003**: Pre-checkout validation correctly rejects 100% of cart submissions where any item's requested quantity exceeds the current live `display_stock`.
- **SC-004**: 95% of incoming webhook payloads with valid phone numbers are automatically matched to the correct pending order within 5 seconds of receipt.
- **SC-005**: Zero financial data (COGS, margins) is ever exposed to users without the `VIEW_FINANCIALS` permission in any product query response.
