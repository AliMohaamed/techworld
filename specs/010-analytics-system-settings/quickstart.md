# Quickstart: Analytics, System Settings & Dashboard

This document outlines how an engineer can test the newly implemented System Settings, Blacklist, and Analytics metrics locally without connecting to live production data.

### 1. Mocking Historical Order Data
To test the `Analytics Dashboard`:
- Run the localized seed script or Convex playground to inject at least 50 past `orders` containing `state` variants (`CONFIRMED`, `DELIVERED`, `RTO`).
- Ensure the Mock users have full RBAC (`VIEW_FINANCIALS`, `VIEW_ANALYTICS`) to see the UI rendered correctly.
- Test queries by navigating to `http://localhost:3000/`.

### 2. Testing Blacklist Checkout Rejection
- Add `+201234567890` to the `blacklist` table manually via the Convex dashboard (or Settings UI once implemented).
- Initiate a guest checkout workflow via `http://localhost:3001` with this specific phone number.
- Observe: The frontend should render a generic "Order Received!" success view, while the Convex backend immediately transitions the `order` state to `FLAGGED_FRAUD` inside `orders` table.

### 3. Activating Maintenance Mode
- Insert `{ key: "MAINTENANCE_MODE", value: true }` in `system_configs`.
- Open a live session on the Storefront on a secondary window.
- The session should immediately hit a React suspense boundary or redirect to `/maintenance` automatically via WebSockets.
