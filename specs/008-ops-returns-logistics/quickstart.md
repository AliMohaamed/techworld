# Quickstart Guide: Phase 8 (Operations, Returns & Logistics)

## Prerequisites

- [x] Node.js `20.x` or later.
- [x] Convex CLI configured and connected to your development environment.
- [x] Vercel environment with access to Next.js monorepo workspaces.
- [x] Active `MANAGE_USERS` and `MANAGE_SYSTEM_CONFIG` permission flags on your primary Super Admin account.

## Bootstrapping Governorates Data

Since the governorates seeding strategy relies on **Manual Entry** via the Admin Dashboard, the first step after deploying Phase 8 is to populate the system logistics:

1. **Login as Super Admin**: Ensure you are authenticated with an account possessing the `MANAGE_SYSTEM_CONFIG` flag.
2. **Navigate to Governorate Settings**: Access the new `/settings/governorates` route in the Admin Dashboard.
3. **Add Entries**: Begin adding the 27 Egyptian governorates. Required fields for each:
   - `name_ar`: Example, "القاهرة"
   - `name_en`: Example, "Cairo"
   - `shipping_fee`: Example, `60`
   - `isActive`: Toggle true.

> [!WARNING]
> Without at least ONE active governorate, the Storefront checkout will strictly block all customer orders due to `FR-007`.

## Team Onboarding

1. **Navigate to Team Management**: Go to the `/team` page in the Admin Dashboard.
2. **Assign Permissions Strategically**: 
   - A standard customer support member may only need `VIEW_ORDERS` and `PROCESS_RETURNS`.
   - A warehouse clerk requires `MANAGE_SHIPPING_STATUS`.
   - Only key personnel should have `VIEW_FINANCIALS`.
3. **Security Caution**: You cannot grant an agent a permission rank that you do not personally possess (bounds checking).

## RTO Workflow

1. A package fails delivery on the courier's end.
2. An agent with `MANAGE_SHIPPING_STATUS` accesses the order inside the Admin Dashboard.
3. The agent validates the order is currently `SHIPPED`.
4. The agent transitions the order to the `RTO` state. 
5. The `real_stock` will automatically increment by the exact shipment quantity for the specific SKU(s). Check the Audit Log to verify the precise physical stock increment.
