# Research: Core Data Schema & RBAC Engine

## Technical Decisions

### Decision: Overselling Buffer Management
- **Decision**: Leverage Convex's natively transactional/serializable properties to prevent race conditions during concurrent verifications, strictly throwing an error if `newRealStock < -5`.
- **Rationale**: `real_stock` dropping to `-5` is allowed per specifications. Convex eliminates typical negative concurrency collisions because all mutations run sequentially per table row. 

### Decision: Rejected Verifications & Soft Sync
- **Decision**: Within the order cancellation pathway, we will include conditional logic to `patch` the product's `display_stock` ONLY IF `current_display_stock < real_stock`.
- **Rationale**: Complies with the specification that rejects blindly incrementing display stock, which could inadvertently mask existing backend adjustments.

### Decision: Handling Stuck Orders (Cron Jobs)
- **Decision**: Utilize Convex's `crons.ts` to schedule a periodic job (running every hour or daily) that queries for `orders.state === "PENDING_PAYMENT_INPUT"` where the creation time falls outside the 24-hour window, iterating over them to patch their state to `STALLED_PAYMENT`.
- **Rationale**: Removes the business risk of auto-cancellation while flagging abandoned attempts precisely as requested.

### Decision: RBAC Implementation
- **Decision**: Represent user permissions as an array of literal strings. Auth will be strictly enforced at the start of every sensitive Convex mutation using a `requirePermission` helper rather than inside the React frontend.
- **Rationale**: Enforces Absolute Server Authority and prevents exposure of insecure data.
