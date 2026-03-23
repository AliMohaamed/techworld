# Feature Specification: Phase 10 - Marketing, Retention & Advanced SEO

**Feature Branch**: `011-marketing-seo`  
**Created**: 2026-03-21  
**Status**: Draft  
**Input**: User description: "Phase 10 - Marketing, Retention & Advanced SEO"

## Clarifications

### Session 2026-03-21
- Q: Should promo codes be globally applicable to any cart, or do they need to support constraints like minimum order value? → A: Option A - Globally applicable to all carts regardless of value or contents (Anytime).
- Q: Can promo codes be combined with other discounts like Bundles? → A: Option A - Mutually exclusive per order, cannot be applied if cart contains Bundles.
- Q: Should percentage-based promo codes be capped? → A: Option B - Capped. Must support an optional maximum discount amount.
- Q: Are complementary product links bidirectional or unidirectional? → A: Option B - Unidirectional. Product A can link to B without B linking back to A.
- Q: How to handle WhatsApp webhook failures? → A: Option A - Log errors and flag order for manual follow-up (Fire and forget, no auto-retries).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apply Promo Codes at Checkout (Priority: P1)

As a Customer, I want to enter a promo code at checkout so that I can receive a discount on my total order cost.

**Why this priority**: Discounts are a core marketing tool to drive conversions and reward loyalty, directly impacting top-line revenue.

**Independent Test**: Can be tested by creating a promo code in the system and validating that applying it at the storefront checkout correctly reduces the order total before submission.

**Acceptance Scenarios**:

1. **Given** a valid, unexpired promo code, **When** the customer applies it at checkout, **Then** the system calculates the discount and updates the total order cost dynamically.
2. **Given** an expired or fully-used promo code, **When** the customer applies it, **Then** the system rejects the code and displays a clear error message.
3. **Given** a promo code that grants free shipping, **When** it is applied, **Then** the shipping fee for the selected governorate is waived.

---

### User Story 2 - Automated WhatsApp Notifications (Priority: P1)

As a Customer, I want to receive automated WhatsApp messages updating me on my order status so that I am kept informed without needing to contact support.

**Why this priority**: Proactive communication is essential in the Egyptian e-commerce market to reduce "where is my order" queries and ensure high customer satisfaction.

**Independent Test**: Can be tested by placing a test order and transitioning its state (e.g., from PENDING_PAYMENT_INPUT to CONFIRMED), verifying that the corresponding webhook is triggered to the WhatsApp API provider.

**Acceptance Scenarios**:

1. **Given** an order transitions to `PENDING_PAYMENT_INPUT`, **When** the system logs the state change, **Then** an outbound webhook is triggered to send payment instructions via WhatsApp.
2. **Given** an order transitions to `CONFIRMED`, **When** the state change occurs, **Then** the customer receives a WhatsApp confirmation message.

---

### User Story 3 - Discover Complementary Products (Priority: P2)

As a Customer, I want to see related or complementary products when I view a particular product so that I can easily discover accessories or similar items.

**Why this priority**: Cross-selling and up-selling increase the Average Order Value (AOV), maximizing the profitability of each customer session.

**Independent Test**: Can be tested by linking Product B as complementary to Product A, then viewing Product A on the storefront and confirming Product B appears in the "Related Products" section.

**Acceptance Scenarios**:

1. **Given** a product with defined complementary products, **When** a customer visits its Product Details Page (PDP), **Then** a "Related Products" section displays the linked items.
2. **Given** a product with no complementary products linked, **When** a customer visits the PDP, **Then** the "Related Products" section is either hidden or displays fallback products (e.g., from the same category).

---

### User Story 4 - Advanced SEO & Discovery (Priority: P2)

As a Marketing Manager, I want the storefront to have a dynamic sitemap and rich OpenGraph metadata so that search engines and social media platforms can index and display our products beautifully.

**Why this priority**: Organic search visibility and attractive social sharing are critical for driving top-of-funnel traffic.

**Independent Test**: Can be tested by requesting the `/sitemap.xml` URL and verifying it contains current products, and using social sharing tools to verify OpenGraph tags render correctly for product pages.

**Acceptance Scenarios**:

1. **Given** the current product catalog, **When** a search engine crawler visits the sitemap route, **Then** it receives an up-to-date XML sitemap of all active products and categories.
2. **Given** a product URL shared on social media, **When** the platform fetches the URL, **Then** the system serves dynamic OpenGraph metadata corresponding to the product's title, description, and thumbnail image.

---

### Edge Cases

- **Promo Code and Bundle Contention**: What happens if a user successfully applies a promo code to their cart, but subsequently adds a Bundle item? (System should remove the promo code and notify the user).
- **WhatsApp Webhook Failures**: If the external WhatsApp API fails, the system logs the error and flags the order in the Admin Dashboard for manual follow-up without blocking the user or auto-retrying.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST define a `promo_codes` schema with attributes `code`, `type` (fixed amount, percentage, free shipping), `value`, `max_uses`, and `expiry_date`.
- **FR-002**: The storefront checkout MUST dynamically validate the promo code against the backend before applying any discount to the total cost. Promo codes apply globally without minimum order value constraints, but are strictly mutually exclusive: only one code per order can be used, and it MUST NOT be applied if the cart contains Bundle items.
- **FR-003**: The system MUST support linking complementary products to a primary product (Schema Update).
- **FR-004**: The Product Details Page (PDP) MUST display a dedicated UI section for "Related Products".
- **FR-005**: The system MUST implement backend logic (HTTP actions or background functions in Convex) triggered by order state changes.
- **FR-006**: Triggered backend functions MUST securely send outgoing Webhooks to a generic WhatsApp API provider.
- **FR-007**: The system MUST generate a dynamic Next.js `sitemap.ts` listing all active, published products and categories.
- **FR-008**: The product pages MUST dynamically generate OpenGraph metadata (title, description, image) corresponding to the viewed product's details.

### Key Entities

- **PromoCode**: Represents a discount code.
  - Attributes: `code` (string, unique), `type` (enum), `value` (number), `max_discount_amount` (number, optional), `max_uses` (number), `current_uses` (number), `expiry_date` (timestamp).
- **Product (Updated)**:
  - New Relationship: Contains an array of `related_product_ids`. The relationship is strictly unidirectional (A relates to B does not imply B relates to A).
- **Order (Updated)**:
  - New Relationship: Must store the applied `promo_code_id` and the calculated discount in the financial snapshot to preserve immutability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Promo codes can be validated and applied at checkout with latency less than 500ms.
- **SC-002**: Order state changes trigger the corresponding WhatsApp webhook payload within 2 seconds of the database mutation.
- **SC-003**: The sitemap.xml endpoint responds in under 1 second, accurately reflecting the current active product catalog.
- **SC-004**: Average Order Value (AOV) increases gradually following the introduction of Cross-selling UI elements.
