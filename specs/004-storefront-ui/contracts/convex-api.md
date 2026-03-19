# Interface Contracts: Customer Storefront UI

The frontend communicates with Convex purely via these predefined queries and mutations.

## Queries

### `api.products.getForStorefront`
- **Args**: `{ categoryId?: string, limit?: number }`
- **Returns**: `ProductDisplay[]`
- **Notes**: Only returns `isActive = true` parent category items. Does NOT return `real_stock`.

### `api.cart.getSessionCart`
- **Args**: `{ sessionId: string }`
- **Returns**: `CartSessionState`
- **Notes**: Always re-calculates subtotals server-side on read to guarantee Absolute Server Authority.

## Mutations

### `api.cart.addItem`
- **Args**: `{ sessionId: string, productId: string, quantity: number }`
- **Returns**: `void`
- **Notes**: Overrides local actions. Validates against `display_stock` softly.

### `api.orders.placeOrderFromSession`
- **Args**: 
  ```typescript
  { 
    sessionId: string, 
    customerInfo: { 
      name: string, 
      phone: string, 
      address: string, 
      governorate: string 
    } 
  }
  ```
- **Returns**: `CheckoutSuccessPayload`
- **Notes**: Will process the items tied to the `sessionId` on the server and create a `PENDING_PAYMENT_INPUT` order. Does not deduct `real_stock` (Zero Floor policy).
