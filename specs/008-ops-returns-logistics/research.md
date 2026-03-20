# Phase 0: Outline & Research

## Resolved Technical Decisions

### 1. Governorate Seeding Strategy
- **Decision**: Manual Entry (via UI).
- **Rationale**: Keeps database strictly dynamic without hardcoded initialization scripts. Allows the `MANAGE_SYSTEM_CONFIG` admin to have complete control over name localization (Arabic/English) and fee structures from day zero.
- **Alternatives considered**: Seed script (rejected by clarification workflow since UI management is more aligned with dynamic needs for this phase).

### 2. Post-Delivery Returns Handling
- **Decision**: Independent `restockItem` mutation.
- **Rationale**: Handles scenarios where the courier successfully delivers (`DELIVERED` state) but a customer later returns a portion of the order (e.g., defective item). A unified `RTO` state would falsely flag the delivery logic.
- **Alternatives considered**: `PARTIALLY_RETURNED` FSM state (rejected due to unnecessary complexity).

### 3. Privilege Escalation Prevention
- **Decision**: Strict bounds check on `MANAGE_USERS` delegations.
- **Rationale**: An administrator creating a new user cannot assign a permission flat (e.g., `VIEW_FINANCIALS`) unless the administrator themselves possesses that permission.
- **Alternatives considered**: Unrestricted delegation (rejected to protect sensitive financial tracking).

### 4. Applied Shipping Fee Snapshot
- **Decision**: Snapshot as `appliedShippingFee` and store `governorateId` in `orders`.
- **Rationale**: Future-proofs historical reporting. If Alexandria's fee changes from 60 EGP to 80 EGP, past orders must still reflect the 60 EGP charge natively in the database, without requiring complex temporal queries.

## No Unresolved "NEEDS CLARIFICATION" Tags Remained.
All scope ambiguities were successfully resolved in the `speckit.clarify` session prior to planning. Research phase is complete.
