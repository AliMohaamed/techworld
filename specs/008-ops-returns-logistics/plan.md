# Implementation Plan: 008-ops-returns-logistics

**Branch**: `008-ops-returns-logistics` | **Date**: 2026-03-20 | **Spec**: [specs/008-ops-returns-logistics/spec.md](file:///d:/Freelance/techworld/website/specs/008-ops-returns-logistics/spec.md)
**Input**: Feature specification from `/specs/008-ops-returns-logistics/spec.md`

## Summary

Implement dynamic shipping fees via a new `governorates` table, robust staff provisioning natively inside the dashboard with granular RBAC, and expand the order finite state machine (FSM) to handle Return to Origin (RTO) and post-confirmation cancellations with strictly atomic SKU-level inventory restocking.

## Technical Context

**Language/Version**: TypeScript 5+
**Primary Dependencies**: Convex, Next.js 14, React Hook Form, Zod, Better-Auth, shadcn/ui
**Storage**: Convex Database
**Testing**: Manual / Testing scenarios defined in spec
**Target Platform**: Web (Vercel + Convex)
**Project Type**: Next.js Monorepo (Web App + Serverless Backend)
**Performance Goals**: Checkout calculations must feel instant (client-side pre-hydration backed by server validation)
**Constraints**: Atomic inventory updates, strict zero-floor validation, no privilege escalation for staff provisioning
**Scale/Scope**: 27 Egyptian Governorates, additional FSM states (`READY_FOR_SHIPPING`, `SHIPPED`, `DELIVERED`, `RTO`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
  - *Yes. Shipping calculation and inventory restocks happen strictly in Convex mutations.*
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
  - *Yes. `real_stock` is only incremented in this feature. Deductions remain strictly bounded to `CONFIRMED`.*
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
  - *Yes. All new operations (`MANAGE_SYSTEM_CONFIG`, `MANAGE_USERS`, `MANAGE_SHIPPING_STATUS`) require strict, granular permission flags.*
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?
  - *Yes. Explicit requirements mandate audit logs for governorate changes, staff creation, permission updates, and RTO restocks.*

## Project Structure

### Documentation (this feature)

```text
specs/008-ops-returns-logistics/
├── plan.md              # This file
├── research.md          # Generated
└── data-model.md        # Generated
```

### Source Code

```text
packages/backend/convex/
├── schema.ts            # Extend orders and users tables, add governorates
├── governorates.ts      # New: CRUD and fetch logic for governorates
├── users.ts             # Extend: Staff provisioning and RBAC mutation restrictions
├── orders.ts            # Extend: New FSM states, snapshot appliedShippingFee
├── skus.ts              # Extend: Independent restock mutation (FR-023)
├── cart.ts              # Modify: checkout calculation mapping with governorateId
└── webhooks.ts          # Modification (if applicable to RTO tracking)

apps/admin/src/
├── app/(dashboard)/settings/governorates/ # New UI for shipping management
├── app/(dashboard)/team/                  # New UI for staff provisioning
└── components/                            # Forms using `react-hook-form` + `zod`

apps/storefront/src/
└── app/(store)/checkout/                  # Modify UI to fetch governorates and dynamically show shipping
```

**Structure Decision**: Monorepo integration, with server authority firmly placed inside `packages/backend/convex` and separate UIs across `admin` and `storefront`.
