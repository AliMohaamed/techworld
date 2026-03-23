Phase 7: Advanced Catalog, Variants & Media Architecture
Focus: Deep schema changes for inventory tracking, asset management, and up-selling.

Product Variants (SKUs): Refactor the products schema to support variants (e.g., Colors, Sizes). Shift real_stock and display_stock tracking to the Variant level.

Native Media Uploads: Integrate Convex File Storage to allow direct uploads for a primary thumbnail and an array of images per product/variant, deprecating URL strings.

Cross-selling / Up-selling: Add relational fields in the database to link and display complementary products on the Product Details Page to increase Average Order Value (AOV).

Catalog UI/UX Overhaul: Replace standalone creation pages with sleek, state-preserving Modals (using shadcn/ui) for Category and Product creation.

Phase 8: Operations, Returns & Logistics
Focus: Order fulfillment, reverse logistics, and precise shipping calculation.

Dynamic Shipping Fees: Create a governorates table with distinct shipping rates. Integrate this into the Storefront checkout logic to dynamically calculate total costs.

Returns Workflow: Implement a dedicated workflow for Return to Origin (RTO) and customer returns, including logic to automatically restock real_stock when items are returned.

Staff Provisioning Interface: Build a dedicated Super Admin view to create staff accounts and dynamically allocate permission flags without touching the Convex dashboard.

Phase 9: Analytics, Intelligence & System Settings
Focus: Deep business intelligence, security, and global configurations.

Analytics & Intelligence Dashboard: Implement a comprehensive data visualization page including:

Total Orders, Net Profit, Total Collected, Total COGS, Courier Fees.

Advanced metrics: RTO Rate, Fraud Rate, Sales Velocity (Orders/Revenue), Order Status Breakdown, and Top Governorates.

Settings & Governance Page: A centralized hub containing:

System Configs: Toggles for global variables (e.g., enabling/disabling COD, maintenance mode).

Blacklist: A system to block specific phone numbers or IP addresses from placing orders.

Audit Logs: A read-only, filterable data table exposing the backend audit_logs table.

Low Stock Alerts: Automated UI notifications when real_stock drops below a configurable threshold.

Phase 10: Marketing, Retention & Advanced SEO
Focus: Traffic generation, conversion optimization, and automated communication.

Discount & Promo Codes: Engine to generate and apply percentage, fixed-amount, or free-shipping promo codes at checkout.

WhatsApp Automation (Webhooks): Implement backend Convex triggers to send automated WhatsApp confirmation/status messages.

Advanced SEO: Automated Dynamic XML Sitemap generation and OpenGraph metadata integration for highly shareable product links.

Phase 11: System-Wide Polish & Accessibility
Focus: Pre-launch visual perfection and robust error handling.

Global Validation Sweep: System-wide audit to enforce strict react-hook-form and zod schema validation across all Storefront and Admin inputs.

Mobile-Responsive Admin UI: Ensure the Admin layout, sidebar, and data tables degrade gracefully on mobile screens for on-the-go management.

Localization & Theming: Complete bi-lingual support (Arabic/English) and ensure Dark/Light themes operate flawlessly across the entire system.