# Quickstart

## Local Setup

1. **Deploy Convex Models:**
   Run `npx convex dev` to push the new schema and validation rules directly to your development environment.

2. **Bootstrapping the Admin Permissions:**
   Because permissions govern all mutations, you'll initially have no permissioned users. Navigate to the Convex Dashboard (`https://dashboard.convex.dev/`), find your dummy user record in the `users` table, and manually append `["VIEW_FINANCIALS", "VERIFY_PAYMENTS"]` to their `permissions` array.

3. **Verifying Transactions:**
   - Place a test order through the API/development UI.
   - Verify `display_stock` is lower, but `real_stock` remains untouched.
   - Using the `orders` mutation interface, approve the order to test valid deductions to `real_stock`.
   - Ensure you see exactly ONE audit log generated in the `audit_logs` table for the transition.

## Running Cron Jobs Manually
To test the 24-hour timeout trigger without waiting:
- You can manually trigger the cron job `crons:markStalledOrders` directly from the Convex Dashboard's Functions page to identify missing payment inputs.
