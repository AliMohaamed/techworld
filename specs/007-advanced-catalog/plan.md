# Implementation Plan: Phase 7 - Advanced Catalog, Variants, Media Gallery & Sale Pricing

**Branch**: `007-advanced-catalog` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-advanced-catalog/spec.md`

## Summary

Implement advanced catalog management supporting dynamic product variants, variant-level inventory controls, and in-modal complex form creation. Replaces simple image URLs with Convex File Storage IDs, enabling rich image galleries linked exclusively to specific variant attributes (colors), and incorporates `compareAtPrice` for discount merchandising.

## Technical Context

**Language/Version**: TypeScript (Next.js 14+, Convex Backend)
**Primary Dependencies**: React, TailwindCSS v4, shadcn/ui (`Dialog`, `Sheet`, `Form`), Zod, React Hook Form, Convex (`storage`)
**Storage**: Convex Database and Convex File Storage (for images)
**Testing**: Manual testing path defined in spec and standard Next.js Jest/Vitest (if existing)
**Target Platform**: Web (Desktop/Mobile responsive)
**Project Type**: Fullstack Web Application
**Performance Goals**: Instant image swap on variant select (no full page reload), fast file upload times to Convex.
**Constraints**: All state transitions and db updates MUST happen inside Convex. Variants must be strictly locked during stock deduction to prevent Negative Concurrency Collisions.
**Scale/Scope**: Support hundreds of products, each with up to 10 variants and image galleries. Files typically < 5MB.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?

## Project Structure

### Documentation (this feature)

```text
specs/007-advanced-catalog/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/backend/convex/
├── schema.ts            # Defines enhanced Products and SKUs (Variants) maps
├── products.ts          # CRUD mutations with RBAC
├── storage.ts           # Upload URLs and File handlers
└── sweepJobs.ts         # CRON job logic for orphaned file sweeps

apps/web/
├── app/(admin)/
│   └── components/
│       └── ProductModal.tsx  # The shadcn/ui Dialog based product manager
├── app/(store)/
│   └── products/[id]/
│       └── page.tsx          # Storefront product details (dynamic variant swapping)
└── components/
    └── ui/                   # existing shadcn elements (commands, dialogs)
```

**Structure Decision**: The frontend logic resides in the Next.js web app utilizing Next App Router segments for Admin and Storefront. The backend logic relies entirely on the existing Convex structure under `packages/backend/convex`.
