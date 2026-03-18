# Implementation Plan: Core Data Schema & RBAC Engine

**Branch**: `001-core-schema-rbac` | **Date**: 2026-03-18 | **Spec**: [spec.md](./spec.md)

## Summary

This feature implements the foundational data schema and security engine using Convex. It includes an explicit decoupled inventory logic (`display_stock` vs `real_stock` with a `-5` oversell buffer), a granular RBAC system using permissions arrays instead of roles, strict FSM flow for order processing securely handling concurrent verifications, soft syncing of rejected stock, and comprehensive immutable audit logging.

## Technical Context

**Language/Version**: TypeScript / Node.js
**Primary Dependencies**: Convex Serverless Functions, Next.js
**Storage**: Convex Database
**Testing**: Convex built-in testing (vitest)
**Target Platform**: Convex Backend
**Project Type**: Cloud Database & Backend API
**Performance Goals**: Mutations < 50ms execution time
**Constraints**: Absolute Server Authority, Atomic transactions required for inventory & FSM
**Scale/Scope**: Schema definition, 4 core database tables, Cron logic

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"? *(With authorized -5 buffer).*
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?

## Project Structure

### Documentation (this feature)

```text
specs/001-core-schema-rbac/
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Database schema details
└── quickstart.md        # Developer setup
```

### Source Code (repository root)

```text
convex/
├── schema.ts            # Schema definitions for users, products, orders, audit_logs
├── users.ts             # User queries and RBAC logic
├── products.ts          # Product inventory operations 
├── orders.ts            # Order FSM mutations
├── audit.ts             # Internal mutation to append audit logs
├── crons.ts             # Cron job to flag STALLED_PAYMENT orders
└── lib/
    └── rbac.ts          # Authorization utilities mapping
```

**Structure Decision**: Utilizing the standard Convex backend structure placed directly in the `convex` folder.
