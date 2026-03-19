# Convex API Contracts

## Admin Operational Mutations

- `updateOrderStatus`
  - **Input**: `{ orderId: Id<"orders">, newState: string, manualReceiptId?: Id<"_storage"> }`
  - **Requires**: Context authorization containing appropriate permission flag depending on the state transition (`VERIFY_PAYMENTS` for `CONFIRMED`, `MANAGE_SHIPPING_STATUS` for `SHIPPED`).
  - **Side-Effects**: Deducts or Restocks `real_stock` depending on state changes. Generates an Audit Log. Throws `OUT_OF_STOCK` error on `CONFIRMED` transition failure if collision occurs.

- `createCategory`
  - **Input**: `{ name_ar: string, name_en: string, desc_ar: string, desc_en: string }`
  - **Requires**: `MANAGE_CATEGORIES` permission.
  - **Side-Effects**: Generates an Audit Log, inserts a `categories` record.

- `toggleCategoryStatus`
  - **Input**: `{ categoryId: Id<"categories">, isActive: boolean }`
  - **Requires**: `MANAGE_CATEGORIES` permission.
  - **Side-Effects**: Temporarily hides all associated sub-products on frontend by invalidating active references in the client logic.

- `createOrUpdateProduct`
  - **Input**: `{ categoryId: Id<"categories">, real_stock: number, display_stock: number, pricing: FinancialSnapshot, ...attributes }`
  - **Requires**: `MANAGE_PRODUCTS` permission. Warns if pricing \< `MIN_PROFIT_THRESHOLD`.

## Financial Data Masking

- `getOrderDetails`
  - **Input**: `{ orderId: Id<"orders"> }`
  - **Returns**: Financial object filtered based on `ctx.user.permissions.includes('VIEW_FINANCIALS')`. Unprivileged users receive `{ unit_cogs: "***", net_margin: "***" }` payloads securely from the server itself.
