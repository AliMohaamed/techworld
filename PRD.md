# Product Requirement Document (PRD)

**Project:** Unified E-Commerce & Operations Engine

**Architecture Philosophy:** High-Concurrency, Configuration-Driven, Zero-Trust Operations

**Core Tech Stack:** Next.js (Frontend) + Convex (Backend & Real-Time Database)

## 1. System Philosophy, Core Principles, and Non-Negotiable Constraints {#system-philosophy-core-principles-and-non-negotiable-constraints}

### 1.1 System Philosophy {#system-philosophy}

This platform is not a standard storefront; it is a high-velocity transaction engine designed to convert impulsive social commerce traffic into validated, fraud-resistant orders within the highly specific context of the Egyptian e-commerce market.

In Egypt, Cash-On-Delivery (COD) remains the dominant payment method, carrying inherently high operational risks of fake orders and costly Return to Origin (RTO) rates. The architecture is specifically optimized for this environment. It utilizes a **\'Verification-First Hybrid COD\'** model. Unlike standard payment gateways, the system captures user intent immediately upon data entry, creates a PENDING_PAYMENT_INPUT order, and triggers an automated WhatsApp workflow instructing the customer to transfer the required shipping fee via mobile wallets (Vodafone Cash/InstaPay). \"**Inventory Strategy:** To maximize top-of-funnel conversion during high-traffic events, inventory is **NOT reserved** at the order creation stage. The system accepts orders beyond physical stock levels to capture all potential leads. Stock deduction occurs strictly and atomically at the **CONFIRMED** stage. This creates a \'First-to-Pay, First-Served\' dynamic, accepting the operational necessity of refunding/apologizing to customers who pay after stock depletion.\"

**Required Relations:** Every Product creation mutation must validate the existence of a valid, active categoryId. Orphaned products are not permitted by the database schema.

The system is built for extreme concurrency (e.g., Flash Sales), requiring atomic data integrity to prevent overselling, and strict data segregation to protect business intelligence (margins, COGS) from operational staff.

### 1.2 Core Architectural Principles {#core-architectural-principles}

- **Absolute Server Authority (Convex):** The frontend (Next.js) is strictly a presentation and input layer. It holds zero authority over pricing, shipping calculations, inventory validation, or order state. All calculations, state transitions, and validations must occur securely on the backend using **Convex** server functions and mutations prior to any database write.

- **Permission-Driven Authorization, Not Role-Based:** Hardcoded roles (e.g., \"Admin\", \"Agent\") do not exist in the system logic. The system utilizes a granular, dynamic permission model. Roles act merely as administrative labels (groupings of permissions) created dynamically via the dashboard. Access to read data or execute Convex mutations is validated exclusively against the user\'s assigned permissions.

- **Configuration Over Hardcoding:** System behaviors---such as rate limits, fraud velocity thresholds, negative stock buffers, wallet numbers, and warranty durations---must not be hardcoded. They are managed in a centralized **System Configuration Layer** stored in the Convex database and accessible only to users with the MANAGE_SYSTEM_CONFIG permission.

- **Decoupled Inventory Reality:** Marketing psychology and physical logistics are decoupled. The system maintains a display_stock (manipulatable for urgency) entirely separate from real_stock (the absolute physical truth).

- **Deterministic State Transitions:** Orders do not \"change status\"; they progress through a rigorously defined Finite State Machine (FSM). Every transition requires specific preconditions, permission validations, and results in guaranteed side effects (e.g., stock deduction, audit logging) executed atomically within Convex mutations.

- **Asynchronous Service Resilience:** Since the checkout flow depends on external webhooks (WhatsApp API), the system must implement robust \"Retry Mechanisms\" and \"Fail-safe States\". If the WhatsApp provider is down, the order should still be created, and the system should flag it for manual follow-up rather than blocking the user\'s purchase.

### 1.3 Non-Negotiable Constraints {#non-negotiable-constraints}

1.  **The Strict Zero Floor:**

    - real_stock must never drop below zero. Since inventory is not reserved at creation, the race condition happens at the **verification** stage. Any Convex mutation attempting to transition an order to CONFIRMED must fail if real_stock \<= 0, even if the customer has valid proof of payment. The system must block the confirmation and prompt the agent to move the order to a \'Refund/Backorder\' queue.

2.  **Concurrency & Idempotency Rules:**

    - Simultaneous operational actions (e.g., two agents verifying the same order at the exact same millisecond) must be handled atomically by Convex\'s transactional guarantees. The system must guarantee that stock is deducted once and only once per confirmed order.

    - Payment verification and stock deduction must succeed or fail as a single atomic transaction.

3.  **Financial Opacity for Operations:**

    - Unit economics (Supplier COGS, Net Profit Margins, Total Revenue) must be structurally isolated at the database read level.

    - A Convex query executed by a user lacking the VIEW_FINANCIALS permission must have financial fields stripped before the payload leaves the server. Frontend hiding is insufficient.

4.  **Immutable Audit Trail:**

    - Every state transition, inventory adjustment, system configuration change, and permission update must generate an immutable record in the Audit Log.

    - Logs must capture the timestamp, the identity of the actor (User ID or System), the entity modified, the exact pre-mutation state, and the post-mutation state.

5.  **Strict Guest Checkout Isolation:**

    - Customers have no persistent accounts, passwords, or login capabilities for the storefront. The Phone Number acts as the unique identifier.

    - Customer access to post-purchase flows (like the Warranty Portal) requires localized authentication (e.g., OTP validation against the phone number linked to a specific, eligible order).

## 2. The Order Lifecycle & Finite State Machine (FSM) {#the-order-lifecycle-finite-state-machine-fsm}

### 2.1 State Machine Philosophy {#state-machine-philosophy}

Orders cannot be arbitrarily updated. They exist within a strict FSM. Direct database writes to an order\'s status field are forbidden. Status changes occur only via specific Convex transition mutations (e.g., verifyPayment(), markAsShipped()) that evaluate the current state, validate the actor\'s permissions, and execute required side effects atomically.

**Traceability:** Every state transition strictly logs an immutable audit entry in the Convex database, including the UserID (or System actor) and a precise timestamp, to ensure a complete operational paper trail.

### 2.2 Defined Order States {#defined-order-states}

1.  **PENDING_PAYMENT_INPUT**: The customer has submitted their checkout details (Name, Phone, Governorate, Address). The system automatically triggers a WhatsApp message containing order details, the required shipping fee, and instructions to transfer and reply with the last 3 digits or a screenshot.

    - *Crucial Constraint: Real stock is NOT deducted.*

    - *Timeout/Retry Logic:* This state includes a configurable timeout period. If the customer does not complete the transfer within this timeframe, the system automatically sends a retry reminder or transitions the order to CANCELLED via a Convex CRON job.

2.  **AWAITING_VERIFICATION**: The customer has responded to the WhatsApp prompt. The order sits in the operational queue.

    - *Verification Methods:* Verification of the shipping fee transfer can be handled in two ways: The staff can check directly in the customer WhatsApp chat (Preferred), or optionally, the screenshot/transfer proof can be added to the Dashboard for review.

3.  **FLAGGED_FRAUD**: The system detected anomalous behavior (e.g., velocity breach, blacklisted number). The order is quarantined.

4.  **CONFIRMED**: An authorized agent has verified the payment proof.

    - *Crucial Side Effect 1:* real_stock is dynamically deducted. *(Emphasize: Stock is NEVER deducted when added to the cart, only upon explicit CONFIRMED status).*

    - *Crucial Side Effect 2:* The order details are added to the export queue (Excel/Sheet) for courier processing.

    - Atomic Guard: The mutation must explicitly check real_stock \> 0. If stock is zero, the mutation aborts, throws an OUT_OF_STOCK error, and prevents the status change

5.  **READY_FOR_SHIPPING**: The order has been batched/exported for courier processing (e.g., Bosta/Mylerz sheet generation).

6.  **SHIPPED**: The courier has picked up the package. AWB is attached.

7.  **DELIVERED**: The courier has confirmed successful delivery. Financial reconciliation is triggered.

8.  **RTO (Return to Origin)**: The courier failed to deliver. *Crucial Side Effect: real_stock is incremented (restocked).*

9.  **CANCELLED**: Order aborted before shipping (by user timeout, fraud rejection, or manual admin action). *Crucial Side Effect: If cancelled after being CONFIRMED, real_stock must be incremented.*

### 2.3 System-Level Fraud Detection & Handling {#system-level-fraud-detection-handling}

Fraud logic operates proactively to protect the verification team from noise and the inventory from locking.

- **Trigger Conditions (Managed via System Config in Convex):**

  - **Velocity Limit:** Same phone number places \> *X* orders within *Y* hours.

  - **Duplicate Proof:** The exact same 3-digit transfer code is submitted for multiple orders within 24 hours.

  - **Blacklist Match:** Phone number matches the system\'s dynamic RTO/Fraud blacklist.

- **Behavioral Outcome:**

  - If triggered during checkout or proof upload, the order bypasses AWAITING_VERIFICATION and transitions immediately to FLAGGED_FRAUD.

  - It is removed from the standard operational queue and placed in a dedicated \"Fraud Quarantine\" view.

- **Override Mechanism:**

  - Only users possessing the RESOLVE_FRAUD permission can interact with these orders.

  - The authorized user can either transition the order to AWAITING_VERIFICATION (marking it safe) or transition it to CANCELLED.

### 2.4 Operational Edge Cases & Exception Handling {#operational-edge-cases-exception-handling}

1.  **The Negative Concurrency Collision:**

    - **Scenario:** real_stock is at 1. Two customers (A and B) have paid and are AWAITING_VERIFICATION.

    - **System Behavior:** Agent 1 verifies Customer A. Convex atomically deducts stock from 1 to 0. Transaction succeeds. State -\> CONFIRMED.

    - **Collision:** Milliseconds later, Agent 2 tries to verify Customer B.

    - **Outcome:** The Convex mutation detects real_stock is 0. The transaction **fails**. The order remains in AWAITING_VERIFICATION. The UI displays an error: *\"Stock Depleted. Cannot Confirm.\"* The agent must then explain to Customer B and initiate a refund or offer an alternative.

2.  **Post-Confirmation Cancellation:**

    - *Scenario:* An order is CONFIRMED (stock deducted), but the customer requests cancellation before it is shipped.

    - *System Behavior:* When transitioned to CANCELLED by an authorized user, the FSM must recognize the previous state. Because it crossed the confirmation threshold, the system automatically triggers a stock increment operation within the mutation to restore the real_stock.

3.  **Mid-Flight Pricing/Shipping Updates:**

    - *Scenario:* A customer places an order. Five minutes later, the Super Admin updates the shipping fee for that governorate in the System Configuration.

    - *System Behavior:* The order\'s financial snapshot is immutable. The prices and shipping fees calculated at the exact moment of the PENDING_PAYMENT_INPUT creation are locked. System config updates only affect *future* orders.

## 3. System Configuration & Financial Control Layer {#system-configuration-financial-control-layer}

### 3.1 Centralized System Configuration Layer {#centralized-system-configuration-layer}

To maintain agility without code deployments, the system must utilize a dynamic configuration store within the Convex database. This layer is the \"Brain\" of the operations, accessible only to users with the MANAGE_SYSTEM_CONFIG permission.

**Configurable Parameters include:**

- **Inventory Rules:**

  - ORDER_EXPIRY_TIMEOUT: Hours after which a PENDING_PAYMENT_INPUT order is auto-cancelled.

  - LOW_STOCK_THRESHOLD: The trigger point for dashboard alerts.

- **Fraud & Security:**

  - FRAUD_VELOCITY_THRESHOLD: Max orders per phone number within X hours.

  - FRAUD_DUPLICATE_CODE_WINDOW: Timeframe (in hours) to check for duplicate 3-digit transfer codes.

  - API_RATE_LIMITS: Thresholds for placeOrder and file uploads.

- **Operational Workflow:**

  - WHATSAPP_RETRY_INTERVAL: Hours to wait before sending a follow-up reminder for payment input.

  - COLLECTION_WALLETS: A list of active mobile wallet numbers/names shown to customers for prepayment.

  - Ability to update the message template text sent to customers dynamically (e.g., changing the greeting or the payment instructions) without redeploying code.

### 3.2 Dynamic Shipping & Governorate Management {#dynamic-shipping-governorate-management}

Shipping fees are not static. The system must provide a dedicated interface for real-time logistical pricing management.

- **Zone-Based Pricing:** A mapping of all Egyptian governorates to their respective shipping costs.

- **Versioning:** When a shipping fee is updated, the change is applied only to *new* orders. The system must store the \"Price at Time of Order\" within the order\'s financial snapshot.

- **Toggle Availability:** Ability to temporarily disable shipping to specific governorates (e.g., due to courier issues or regional holidays).

### 3.3 Financial Control & Reconciliation {#financial-control-reconciliation}

The system acts as the \"Single Source of Truth\" for the business\'s unit economics.

- **Financial Snapshotting:** Every order must record an immutable snapshot of:

  - unit_cogs: Cost of Goods Sold for each item at that specific moment.

  - unit_selling_price: Price offered to the customer.

  - applied_shipping_fee: The fee calculated server-side at checkout.

  - prepaid_shipping_amount: The amount the customer transferred to the wallet.

- **Revenue Lifecycle:**

  - **Gross Revenue:** Total order value including shipping.

  - **Net Revenue:** Gross Revenue - Shipping Fees.

  - **Estimated Profit:** Net Revenue - Total COGS.

- **COD Reconciliation Logic:**

  - The Dashboard must provide a view to match \"Delivered\" statuses from the courier against the expected cash collection.

  - **The \"Gap\" Indicator:** Highlight orders where Prepaid Amount + Courier Collected Cash != Total Order Value.

### 3.4 Operational Margin Validation {#operational-margin-validation}

To protect the founder from accidental pricing errors:

- **Margin Alerts:** If a Super Admin sets a selling_price that results in a margin below a configurable MIN_PROFIT_THRESHOLD, the system must trigger a warning before saving the SKU.

- **Financial Redaction:** As established in Section 1, the VIEW_FINANCIALS permission is the gatekeeper. Users without this permission see masked values (e.g., \*\*\*) for all COGS and margin-related fields in the dashboard, preventing sensitive data leaks.

## 4. Product & Bundle Logic (Architectural Depth) {#product-bundle-logic-architectural-depth}

### 4.1 SKU-Level Inventory Management {#sku-level-inventory-management}

The system does not track \"Products\"; it tracks **SKUs**.

- **Variant Hierarchy:** A \"Product\" (e.g., T900 Ultra Watch) is a container. The \"SKUs\" (Black, Silver, Orange) are the physical entities with real_stock.

- **Attribute Mapping:** Each SKU must be mapped to specific attributes (Color, Size, Version) to ensure the warehouse packs the correct item.

### 4.2 Bill of Materials (BOM) for Bundles {#bill-of-materials-bom-for-bundles}

Bundles are virtual SKUs with a defined \"Recipe.\"

- **The Recipe:** BUNDLE_GAMER_X = SKU_HEADSET_BLK (x1) + SKU_MOUSE_BLK (x1).

- **Atomic Decrement:** Upon moving an order to CONFIRMED, the Convex mutation iterates through the Bundle\'s BOM and decrements each component\'s real_stock in a single database transaction.

### 4.3 Warranty Logic (Server-Driven) {#warranty-logic-server-driven}

Warranty is treated as a dynamic attribute of the SKU, not a static page.

- **Optionality:** Warranty is a SKU-specific attribute. If warranty_days is set to 0 or null, the system treats the product as non-warrantied. Eligibility Validation: When a customer enters their phone number in the Warranty Portal:

<!-- -->

- Step 1: The system fetches the SKU\'s warranty_days.

- Step 2: If warranty_days \> 0, execute logic: isEligible = (CurrentDate \<= OrderDeliveryDate + warranty_days). Note that eligibility starts from the DELIVERED date, not the order dat**e.**

<!-- -->

- **Eligibility Validation:** When a customer enters their phone number in the Warranty Portal, the backend calculates: isEligible = (CurrentDate \<= OrderConfirmationDate + SKU.warranty_days).

- **Portal Actions:** If eligible, the customer can submit a claim. If ineligible, the system displays the \"Warranty Expired\" status along with the expiration date.

**4.X Category Architecture & Management**

- Entity Hierarchy: The catalog is structured hierarchically. A Category serves as the primary container, and every Product must be strictly linked to one active Category via a \`categoryId\` reference.

- Localization & Presentation: Each Category must enforce dual-language fields (Arabic/English) for \`name\` and \`description\` to support the localized Storefront UI.

- State Management (Soft Deletion): Categories are never permanently deleted from the Convex database to preserve historical analytics and order integrity. Instead, an \`isActive\` boolean flag is utilized.

- Zero-Trust Constraints: A Product cannot be transitioned from \'Draft\' to \'Published\' status via a Convex mutation unless its parent Category is currently \`isActive = true\`. If a Category is toggled to inactive, all associated products immediately inherit a hidden state on the Storefront without altering their individual published statuses.

## 5. The RBAC & Permissions Framework {#the-rbac-permissions-framework}

### 5.1 Dynamic Role Architecture {#dynamic-role-architecture}

The system fundamentally rejects hardcoded role strings (e.g., role === \'admin\'). Instead, authorization is resolved by answering a single question: *\"Does the requesting UserID possess the required Permission flag for this action?\"*

- **Roles as Labels:** A \"Role\" is strictly an administrative grouping of permissions stored in Convex (e.g., a role named \"Customer Service Level 1\").

- **Dashboard Management:** An interface must exist for the Super Admin to:

  1.  Create custom Role names.

  2.  Toggle specific permission flags on/off for that Role.

  3.  Assign Users to Roles.

### 5.2 Core Permission Taxonomy {#core-permission-taxonomy}

Permissions define the boundaries of authority. The Convex backend will evaluate requests against these explicitly defined flags:

- **Order Processing Permissions:**

  - VIEW_ORDERS: View the order queue (read-only).

  - VERIFY_PAYMENTS: Authority to transition orders from AWAITING_VERIFICATION to CONFIRMED.

  - MANAGE_SHIPPING_STATUS: Authority to update AWB and transition to SHIPPED, DELIVERED, or RTO.

  - PROCESS_RETURNS: Authority to approve/reject Warranty claims.

- **Catalog & Inventory Permissions:**

  - MANAGE_PRODUCTS: Create/edit Products, SKUs, and Bundles.

  - ADJUST_REAL_STOCK: Authority to manually override physical inventory counts.

  - MANAGE_DISPLAY_STOCK: Authority to alter frontend urgency numbers.

  - MANAGE_CATEGORIES: Grants the ability to create new categories, edit localized names/descriptions, and toggle the \`isActive\` state from the Dashboard. Any mutation attempting to modify a category without this specific RBAC role will be rejected at the Convex server level (returning a 403 Forbidden).

- **System & Financial Permissions (Highly Restricted):**

  - VIEW_FINANCIALS: The ultimate gatekeeper. Required to see COGS, net margins, total revenue, and supplier pricing.

  - MANAGE_SYSTEM_CONFIG: Authority to change rate limits, negative stock thresholds, fraud rules, and shipping pricing.

  - RESOLVE_FRAUD: Authority to override FLAGGED_FRAUD quarantines.

  - MANAGE_USERS: Authority to create staff accounts and alter their roles/permissions.

### 5.3 Backend Enforcement Execution {#backend-enforcement-execution}

When an API request (mutation or query) is fired from the dashboard, the Convex backend middleware must independently fetch the user\'s assigned permissions. If the required permission flag is missing, the backend must abort the database transaction and return a 403 Forbidden response.

## 6. Audit Logs & Analytics {#audit-logs-analytics}

### 6.1 The Immutable Audit Trail {#the-immutable-audit-trail}

Accountability is critical in an operations-heavy model. Every significant system action must write a record to a centralized audit_logs table in Convex.

- **Trigger Events:** \* Every FSM order status transition.

  - Any manual adjustment to real_stock.

  - Modifications to the System Configuration parameters.

  - Changes to User Roles and Permissions.

- **Payload Structure:** An audit record must contain:

  - timestamp: Exact time of mutation.

  - actor_id: The ID of the User (or \"System\" for auto-timeouts).

  - entity_type & entity_id: e.g., \"Order\", \"ORD-987\".

  - action: e.g., \"STATUS_CHANGE_CONFIRMED\".

  - previous_state: JSON representation before the write.

  - new_state: JSON representation after the write.

- **Immutability:** The Convex backend must entirely block UPDATE or DELETE operations on the audit_logs table. Records are append-only.

### 6.2 Calculated Analytics & Business Intelligence {#calculated-analytics-business-intelligence}

Analytics are restricted to users with the VIEW_ANALYTICS and VIEW_FINANCIALS permissions. The system provides actionable, server-calculated metrics rather than just basic charts.

- **Performance Metrics:**

  - **Sales Velocity:** Number of CONFIRMED orders segmented by hour/day (essential for evaluating Flash Sale success).

  - **Inventory Turnover:** The rate at which specific SKUs deplete, indicating when to trigger supplier reorders before hitting zero.

- **Risk & Quality Metrics:**

  - **RTO Rate:** (Total RTO Orders / Total Shipped Orders) \* 100. This metric is vital for evaluating the quality of traffic sources and the performance of the chosen courier.

  - **Fraud Flag Rate:** Percentage of checkouts that hit the FLAGGED_FRAUD status.

- **Financial Metrics (Server-Calculated):**

  - **Contribution Margin:** Calculated historically based on the financial snapshot of delivered orders: Sum(Net Revenue) - Sum(Snapshot COGS). This calculation is executed strictly in a secure server context to prevent data leakage.

## **7. User Stories** {#user-stories}

### **7.1 Customer Persona (The Flash Sale Buyer)** {#customer-persona-the-flash-sale-buyer}

*Target: Speed, trust, and frictionless progression from interest to verified intent.*

- **Guest Checkout & Browsing:**

  - As a Customer, I want to view product pages that clearly show display_stock (e.g., \"Only 3 left in stock\") so that I am motivated to act quickly during a flash sale.

  - As a Customer, I want to add fixed Bundles (e.g., \"Pro Gamer Kit: Headset + Mic\") to my cart with a single click so that I don\'t have to navigate and configure individual components.

  - As a Customer, I want to check out entirely as a guest using only my Name, Phone Number, and Address, so that I don\'t face the friction of creating a password or verifying an email address.

  - As a Customer, I want to see a clear, dynamically calculated shipping fee based on my selected Governorate before placing the order, so that there are no hidden costs.

  - As a Customer, I want to browse and filter products by their respective Categories from the main navigation, so I can seamlessly find specific product types during high-traffic sales.

- **The Hybrid COD Experience:**

  - As a Customer, I want to receive an automated WhatsApp message immediately after placing my order with clear instructions and the exact wallet number, so that I know exactly how to prepay my shipping fee.

  - As a Customer, I want the ability to reply to the WhatsApp message with a screenshot of my Vodafone Cash/InstaPay transfer, so that the business can quickly confirm my intent to buy.

  - As a Customer, I want to be notified if my checkout attempt is blocked or delayed, so I understand if I took too long and my session expired.

- **After-Sales & Warranty:**

  - As a Customer, I want to access a Warranty Portal via a footer link and log in simply by entering my phone number, so I can see my eligible past orders.

  - As a Customer, I want to upload a photo/video demonstrating a manufacturer defect, so that I can claim a replacement without waiting in a long chat queue.

### **7.2 Operations Employee Persona (Fulfillment & Support)** {#operations-employee-persona-fulfillment-support}

*Target: Efficient queue management, error-free fulfillment, and strict task boundaries.*

- **Verification & Fulfillment Workflow:**

  - As an Ops Agent, I want to view a real-time queue of orders in the AWAITING_VERIFICATION state, so I can match customer WhatsApp screenshots with the business\'s wallet receipts.

  - As an Ops Agent, I want a single-click action to transition an order to CONFIRMED once the transfer is verified, knowing the system will automatically handle the inventory deduction safely.

  - As an Ops Agent, I want to select multiple CONFIRMED orders and click \"Export to Courier,\" so the system generates a CSV perfectly formatted for Bosta/Mylerz uploads.

  - As an Ops Agent, I want to manually update order statuses to SHIPPED (adding the AWB) or RTO (Return to Origin), so that the system knows to restock items if a delivery fails.

- **Support & System Constraints:**

  - As an Ops Agent, I want to review incoming Warranty claims, view the customer\'s uploaded evidence, and click \"Approve Replacement,\" so the system automatically generates a zero-cost replacement order for fulfillment.

  - As an Ops Agent, I want to be systematically blocked from viewing supplier COGS, net margins, or overall revenue dashboards, so that I am only focused on fulfillment and the business\'s financial privacy is maintained.

### **7.3 Admin / Business Owner Persona (The Super Admin)** {#admin-business-owner-persona-the-super-admin}

*Target: Complete control, financial visibility, configuration agility, and security.*

- **Financial & Inventory Intelligence:**

  - As a Super Admin, I want to view a protected dashboard showing the true Contribution Margin and total net revenue, so I can evaluate the real profitability of my campaigns.

  - As a Super Admin, I want to manually alter display_stock separately from real_stock, so I can create psychological scarcity on the storefront without impacting my warehouse\'s truth.

  - As a Super Admin, I want to be warned if I accidentally price a SKU below my defined MIN_PROFIT_THRESHOLD, so I don\'t run unprofitable campaigns by mistake.

  - As a Super Admin, I want a dedicated module in the Dashboard to execute CRUD operations on Categories (including uploading category thumbnails and localized texts), so I can organize the storefront logically.

  - As a Super Admin, I want to toggle the \`isActive\` status of any Category with a single click, instantly hiding it and all its child products from the Storefront without affecting backend order history.

- **System Configuration & Agility:**

  - As a Super Admin, I want a dedicated configuration panel to update shipping fees per Governorate, so I can adapt instantly when courier companies change their pricing.

  - As a Super Admin, I want to adjust the system\'s FRAUD_VELOCITY_THRESHOLD and GLOBAL_NEGATIVE_STOCK_LIMIT without requiring a developer, so I can tighten or loosen the system constraints based on current traffic behavior.

- **Security & Team Management (RBAC):**

  - As a Super Admin, I want to create new administrative Roles (e.g., \"Weekend Support\") and toggle exact permissions on/off, so I can safely scale my team with precise access control.

  - As a Super Admin, I want to review the immutable audit_logs table, filtering by User ID or Order ID, so I can investigate operational mistakes, track down who manually altered stock, or review overrides on FLAGGED_FRAUD orders.

  - As a Super Admin, I want the ability to manually override and release an order stuck in the FLAGGED_FRAUD quarantine if I personally verify the customer is legitimate.

## 8. Frontend Interface & Experience {#frontend-interface-experience}

### 8.1 Localization (i18n) {#localization-i18n}

- **Default Locale:** Arabic (RTL Layout).

- **Secondary Locale:** English (LTR Layout).

- **Implementation:** The system must support full RTL/LTR switching, ensuring that UI components, spacing, and text flow adjust dynamically based on the selected language.

### 8.2 Theming (Dark/Light Mode) {#theming-darklight-mode}

- **Global Theme Support:** The system must support both Light and Dark modes.

- **Dashboard Preference:** Dark mode is highly recommended as the default for the Dashboard to reduce operational visual fatigue for staff spending long hours in the system.

### 8.3 Architectural Split (Storefront vs. Dashboard) {#architectural-split-storefront-vs.-dashboard}

- **Route-Based Separation:** The project will utilize Next.js Route Groups to separate concerns and logic:

  - (store) group: Handles all public-facing pages, persistent cart, guest checkout, and the warranty portal.

  - (admin) group: Handles the operational dashboard, financial analytics, and system configuration.

- **Routing Strategy & Security:** The Storefront resides at the root (/) or sub-paths. The Dashboard resides under an authenticated path (e.g., /admin). The (admin) group must be strictly protected by a Middleware that validates User session and RBAC (Role-Based Access Control) permissions before rendering any page or data.

**8.4 UI/UX Principles, Brand Identity & Styling Stack**

> **Tech Stack Constraint:** The frontend UI must be built using Tailwind CSS v4 and shadcn/ui. Theming must be managed strictly via CSS variables in accordance with shadcn\'s theming conventions, avoiding hardcoded hex colors in the components.
>
> **Brand Identity & Design Tokens (TechWorld):**

- Primary Color: Bold Mustard Yellow/Gold (derived from the TechWorld logo background). This is strictly reserved for primary CTAs (e.g., \"Add to Cart\", \"Confirm Payment\") to drive high conversion.

- Foreground/Text: Solid Black and dark slates for high contrast and readability.

- Typography: Since no specific brand font is mandated, use modern, highly legible Sans-Serif fonts optimized for digital screens. Recommended: \'Inter\' for English (LTR) and \'Cairo\' or \'Tajawal\' for Arabic (RTL).

- Component Styling: Utilize shadcn/ui defaults with slight customizations: clean sharp edges or subtle rounding (e.g., rounded-md), removing unnecessary borders, and using soft drop-shadows to create depth without clutter.

**UX Core Principles:**

- Mobile-First Priority: 90%+ of traffic is expected via mobile devices. The storefront UI must be optimized for thumb-reachability (e.g., sticky bottom \"Add to Cart\" bars during Flash Sales).

- Frictionless Journey: Minimize inputs. Use large, tappable areas. Avoid multi-step pagination where a single scrollable page suffices.

- Functional Density (Dashboard): Unlike the storefront, the Dashboard UX must prioritize \"data density\"---displaying maximum actionable information (order lists, status tags) without requiring excessive scrolling.

## 9. Shopping Cart & Integrations {#shopping-cart-integrations}

### 9.1 Persistent Shopping Cart {#persistent-shopping-cart}

- **Session Behavior:** The shopping cart must persist across browser sessions and accidental page refreshes (utilizing local storage or cookies) to prevent loss of user intent during the guest checkout flow.

- **Pre-Checkout Validation:** The cart must strictly validate the selected items against the current display_stock before allowing the user to navigate to the final checkout confirmation step.

### 9.2 External Integrations & Webhooks (WhatsApp) {#external-integrations-webhooks-whatsapp}

- **Webhook Listener:** The system must expose a secure webhook endpoint to asynchronously receive incoming messages and media (e.g., Vodafone Cash payment screenshots) from the 3rd-party WhatsApp API provider.

- **Automated Routing:** Incoming media and messages must be automatically parsed and attached to the relevant order in the AWAITING_VERIFICATION operational queue, matching the payload via the sender\'s Phone Number.


## Future Phases & Advanced Architecture (Production Roadmap)

To transition from MVP to a Production-Ready Enterprise System, the following phases and features MUST be implemented sequentially. All code comments generated for these features MUST be in English.

### 1. Advanced Catalog, Variants & Media (Phase 7)
* **Media Gallery & Uploads:** Deprecate string URLs for images. Use Convex File Storage. Products must support a main `thumbnail` and a gallery of `images`. Admin UI must support direct file uploads.
* **Dynamic Variants (SKUs):** Products can optionally have variants (e.g., Color, Size). Inventory (`real_stock` and `display_stock`) MUST be tracked at the variant level. 
* **Variant Image Sync:** Admins can link specific uploaded images to specific colors. On the storefront, selecting a color dynamically updates the main product image.
* **Sale Pricing:** Add an optional `compareAtPrice` field. If `compareAtPrice` > `price`, the storefront must display it with a strikethrough next to the current sale price.
* **Catalog UI/UX:** Admin forms for Category and Product creation must be refactored into modern Modals/Sheets (using shadcn/ui).

### 2. Operations, Returns & Logistics (Phase 8)
* **Dynamic Shipping:** Implement a `governorates` table with distinct shipping fees to dynamically calculate the total order cost at checkout.
* **Returns Workflow:** Implement an RTO (Return to Origin) workflow to accurately restock returned items to `real_stock`.
* **Staff Provisioning:** A secure view for the Super Admin to create and manage staff accounts and their RBAC permissions.

### 3. Analytics, Intelligence & System Settings (Phase 9)
* **Analytics Dashboard:** Display KPIs including Total Orders, RTO Rate, Fraud Rate, Net Profit, Total Collected, Courier Fees, Total COGS, Sales Velocity, Order Status Breakdown, and Top Governorates.
* **System Settings & Governance:** A centralized hub for global configs (e.g., toggle COD), an IP/Phone Blacklist, and an interface to view `audit_logs`.
* **Low Stock Alerts:** Automated warnings when `real_stock` falls below configured thresholds.

### 4. Marketing, Retention & Advanced SEO (Phase 10)
* **Promo Codes:** Engine for percentage, fixed-amount, and free-shipping discounts.
* **WhatsApp Webhooks:** Automated order confirmation messages via Convex HTTP actions.
* **Cross-selling/Up-selling:** Display complementary products on the Product Details Page.
* **Advanced SEO:** Automated Dynamic XML Sitemap and OpenGraph metadata integration.