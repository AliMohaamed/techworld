# Phase 1: Data Model & Schema

## New Tables

### `system_configs`
Provides global, type-safe configuration keys for immediate consumption by the storefront runtime.
- **Fields**:
  - `key` (string, unique ID pseudo schema): Enum-like configuration identifier (e.g., `"COD_ENABLED"`, `"MAINTENANCE_MODE"`).
  - `value` (any/flexible scalar): The actual configuration value.
  - `updatedAt` (number): Timestamp.
  - `updatedBy` (v.id("users")): Admin who modified it.
- **Validation**:
  - Read access: Config-dependent. `MAINTENANCE_MODE` must be public to block frontend routing. 
  - Write access: Strictly `MANAGE_SYSTEM_CONFIG` permission required on mutation.

### `blacklist`
Maintains a list of blocked customer profiles to thwart automated or serial fraud attempts without triggering an explicit frontend error (Silent block behavior per spec).
- **Fields**:
  - `phoneNumber` (string): The sanitized (E.164 string format mapped) number.
  - `reason` (string): Context.
  - `addedBy` (v.id("users")): Admin user reference.
  - `addedAt` (number): Epoch timestamp.
- **Indexes**:
  - `by_phone`: Unique/indexed by phone number for quick lookups during active `checkout`.

## Existing Table Modifications

### `orders`
- **Changes**:
  - Add `unit_cogs: v.optional(v.number())`. Without this, "Total COGS" aggregation mapped in the PRD is structurally impossible, because the system would have to infer historic cost-of-goods from mutable fields on `products` causing gross financial inaccuracy.
  - Optionally backfill existing orders, deriving `cogs` from the current product definition if one exists, via a data migration script.

## Core Aggregation Queries

### `api.analytics.dashboardMetrics`
- **Parameters**: `{ dateFrom: number, dateTo: number }`
- **Returns**: Validated DTO containing `{ totalOrders, netProfit, rtoRate, totalCogs, courierFees, statusBreakdown }`.
- **Logic**: Uses `ctx.db.query("orders")` with bounded `.filter` on `creationTime` to compute everything serverside inside memory if under standard Convex timeout/memory allowances, throwing an explicit UI error if standard limits are exceeded (protecting server integrity).
- **Gate**: Will throw `403` instantly if `VIEW_FINANCIALS` or `VIEW_ANALYTICS` is missing.
