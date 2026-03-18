# Data Model: Core Data Schema & RBAC Engine

## Convex Schema Definitions

```typescript
// users table
{
  name: v.string(),
  email: v.string(),
  permissions: v.array(v.union(v.literal("VIEW_FINANCIALS"), v.literal("VERIFY_PAYMENTS"))),
  // Additional profile fields as needed
}

// products table
{
  name: v.string(),
  price: v.number(),
  display_stock: v.number(),
  real_stock: v.number(),
  // Strict rule: real_stock >= -5 
}

// orders table
{
  userId: v.id("users"),
  productId: v.id("products"),
  quantity: v.number(),
  state: v.union(
    v.literal("PENDING_PAYMENT_INPUT"),
    v.literal("AWAITING_VERIFICATION"),
    v.literal("CONFIRMED"),
    v.literal("STALLED_PAYMENT"),
    v.literal("CANCELLED")
  )
}

// audit_logs table
{
  userId: v.optional(v.id("users")), // System changes may omit user
  entityId: v.string(), // The Order/User/Product ID
  actionType: v.string(), // e.g. "ORDER_CREATED", "PAYMENT_VERIFIED", "PERMISSION_ADDED"
  timestamp: v.number(),
  changes: v.any() // Structured JSON representing before/after
}
```

## State Transitions (Orders FSM)

- **Initialization**: Creates with `PENDING_PAYMENT_INPUT`. Decrements product's `display_stock`.
- **Payment Input**: `PENDING_PAYMENT_INPUT` -> `AWAITING_VERIFICATION`
- **Cron Intervention**: `PENDING_PAYMENT_INPUT` (If > 24 hours) -> `STALLED_PAYMENT`
- **Verification Approval**: `AWAITING_VERIFICATION` -> `CONFIRMED`. Decrements `real_stock`.
- **Verification Rejection**: `AWAITING_VERIFICATION` -> `CANCELLED`. Evaluates condition to trigger Soft Sync (`display_stock = real_stock` if `display_stock < real_stock`).
