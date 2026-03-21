# Implementation Plan: Analytics, Intelligence & System Settings

**Branch**: `010-analytics-system-settings` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Phase 9 - Analytics, Intelligence & System Settings

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement the Phase 9 Phase 9 Analytics, Intelligence & System Settings architecture. This introduces real-time bounded analytics on the existing order data stream utilizing `recharts`, creates dynamic configurations via a new `system_configs` singleton, prevents automated fraud through a server-validated `blacklist`, and visualizes structural operations through a paginated `audit_logs` interface.

## Technical Context

**Language/Version**: TypeScript, Node  
**Primary Dependencies**: Next.js App Router, Convex, Tailwind CSS, shadcn/ui, Recharts  
**Storage**: Convex Real-Time Database  
**Testing**: Jest / Playwright  
**Target Platform**: Web Browsers  
**Project Type**: Monorepo Web Application (Storefront/Admin with shared backend)  
**Performance Goals**: Bounded metric aggregations must return in <2000ms.  
**Constraints**: All configurations must reflect locally scoped states. Storefront must be instantly susceptible to `system_configs` updates via WebSockets.
**Scale/Scope**: Supports querying tens of thousands of historical orders within finite date boundaries.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?

## Project Structure

### Documentation (this feature)

```text
specs/010-analytics-system-settings/
├── plan.md              # This file
├── research.md          # Technical analysis, UI components, data scaling strategy
├── data-model.md        # Database design, constraints, validations 
├── quickstart.md        # Testing configurations
└── tasks.md             # To be populated
```

### Source Code (repository root)

```text
apps/admin/
├── src/
│   ├── app/
│   │   ├── page.tsx (Analytics Dashboard overrides Root)
│   │   ├── (dashboard)/settings/page.tsx
│   │   └── (dashboard)/audit/page.tsx
│   └── components/
│       └── charts/

packages/backend/
└── convex/
    ├── analytics.ts
    ├── settings.ts
    ├── blacklist.ts
    ├── orders.ts (modified)
    └── schema.ts (modified)
```

**Structure Decision**: A standard Turborepo split containing the server-side Next.js admin app handling UI rendering and the backend Convex package handling deterministic schema states and querying.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | Feature strictly adheres to constraints | N/A |
