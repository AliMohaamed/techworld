# Data Expectations & UI Mapping

This document outlines the data shapes the Next.js frontend expects to receive from the Convex backend. *Note: This does not define the backend schema, but rather the interface contract the UI binds to.*

## Entities

### `ProductDisplay`
Used in the Home Page and Category Browsing lists.
```typescript
interface ProductDisplay {
  _id: string; // Convex ID
  name: { ar: string, en: string };
  price: number; // Final selling price
  display_stock: number; // Psych/Display stock, NOT real_stock
  thumbnail_url: string;
  categoryId: string;
}
```

### `CartSessionState`
Used to populate the Cart Drawer and Checkout computations strictly processed by the backend.
```typescript
interface CartSessionState {
  sessionId: string;
  items: Array<{
    productId: string;
    quantity: number;
    name: { ar: string, en: string };
    unitPrice: number;
    subtotal: number;
    thumbnailUrl: string;
  }>;
  financials: {
    itemsSubtotal: number;
    shippingFee: number;
    grandTotal: number;
  };
  validation: {
    isValid: boolean;
    errors: string[]; // e.g., ["Item X went out of stock"]
  }
}
```

### `CheckoutSuccessPayload`
Data strictly returned upon successful execution of the `placeOrder` mutation.
```typescript
interface CheckoutSuccessPayload {
  orderId: string;      // The internal Convex ID (e.g. 'j5...423')
  shortCode: string;    // Human readable ID (e.g. 'ORD-90210')
  whatsappPayload: {
    targetNumber: string; 
    compiledMessage: string; // "Hello! This is my payment proof for ORD-90210..."
  }
}
```
