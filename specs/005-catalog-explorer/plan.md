# Implementation Plan: Advanced Catalog & Categories Explorer

**Branch**: `005-catalog-explorer` | **Date**: 2026-03-19 | **Spec**: [specs/005-catalog-explorer/spec.md](spec.md)
**Input**: Feature specification from `/specs/005-catalog-explorer/spec.md`

## Summary

Implement a mobile-first Advanced Catalog Page (`/products`) with URL-persisted facet filtering and a "Load More" pagination approach, coupled with a visual Categories Overview Page (`/categories`). The backend relies on a sophisticated Convex `searchAndFilter` paginated query utilizing explicit search indices.

## Technical Context

**Language/Version**: TypeScript, React 18, Next.js 15
**Primary Dependencies**: Convex, Tailwind CSS, shadcn/ui (nuqs for URL sync)
**Storage**: Convex Database
**Testing**: Jest / Playwright
**Target Platform**: Web browsers (Mobile-first prioritized)
**Project Type**: Next.js Web Application
**Performance Goals**: 95% of filtered catalog queries respond on frontend in under 300ms.
**Constraints**: Storefront MUST utilize URL query parameters for filter syncing.
**Scale/Scope**: E-commerce catalog exploration flow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
  - *Yes.* The frontend simply renders the payload returned from `api.products.searchAndFilter`, delegating all matching logic natively to the Convex backend.
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
  - *Yes.* This feature focuses exclusively on rendering catalog and Read-Only queries, avoiding stock manipulation mutations entirely.
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
  - *Yes.* The definition of the `CatalogProduct` return type ensures fields like `unit_cogs` are implicitly stripped from the query before leaving the server, protecting operational financial metrics.
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?
  - *Yes/N/A.* Read-only queries do not require mutating the system `audit_logs`. Should configuration changes to filtering weights be added later config-side, they will be audited.

## Project Structure

### Documentation (this feature)

```text
specs/005-catalog-explorer/
├── plan.md              
├── research.md          
├── data-model.md        
├── quickstart.md        
├── contracts/           
└── tasks.md             
```

### Source Code (repository root)

```text
# Web application 
src/
├── app/
│   └── (store)/
│       ├── products/
│       │   └── page.tsx
│       ├── categories/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
├── components/
│   └── storefront/
│       ├── filter-drawer.tsx
│       ├── load-more-button.tsx
│       └── category-grid-card.tsx
convex/
├── products.ts
└── categories.ts
```

**Structure Decision**: The development directly fits within the existing Next.js App Router paradigm, expanding on `(store)` presentation route groupings and existing Convex schema definition locations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations.*
