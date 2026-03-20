# Storefront Integration Contracts

## Public Queries

**`api.governorates.listActive`**
- **Action**: Used directly inside the `/checkout` route of the Next.js Storefront app. Must execute immediately on hydration so user can select their required `governorateId`.
- **Query Logic**: Fetches `governorate` entities where `isActive === true`. Strips out all internal data except translations and actual `shipping_fee` values.

## Checkout Modification

**`api.cart.placeOrderFromSession`**
- **Modification**: `governorateId` mapping parameter.
- **Action**: During checkout, the mutation fetches the *current* real-time rate for that `governorateId` on the server.
- **Validation**: 
  - `shipping_fee` becomes authoritative for the calculation: `(itemSubtotal) + governorateShippingFee`.
  - Fails transaction immediately if the `governorateId` is invalid, null, or currently `isActive === false` mapping to `FR-007`.
- **Outputs**:
  - `appliedShippingFee` snapshot attached immutably to the underlying `orders` output schema.
