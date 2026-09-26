# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Enhance the Product Details page with a "Related Products" section at the bottom. The system will display up to 4 related products based on the viewed product's category and explicit related product associations. A swipeable carousel will be used on mobile and a 4-column grid on desktop.

## Technical Context

**Language/Version**: TypeScript / Next.js
**Primary Dependencies**: React, Next.js, Convex, Tailwind CSS
**Storage**: Convex Database (fetching from `products` table)
**Testing**: N/A
**Target Platform**: Web (Storefront App)
**Project Type**: Web Application Feature
**Performance Goals**: Related products must load in under 300ms.
**Constraints**: Max 4 products displayed; exclude current product; hide out-of-stock items; hide section completely on fetch failure after one retry.
**Scale/Scope**: Component addition to the Product Details page (`apps/storefront/src/app/[locale]/(store)/products/[slug]/page.tsx`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
  - Yes. The related products calculation (filtering out of stock, matching category, excluding current product) will be encapsulated in a Convex query function.
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
  - N/A. This feature only reads products and does not mutate inventory.
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
  - Yes. The public query for related products will only return public fields (name, image, selling_price).
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?
  - N/A. This is a read-only feature.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

```text
apps/storefront/
└── src/
    ├── app/[locale]/(store)/products/[slug]/
    │   └── page.tsx                        # Will be updated to include the RelatedProducts section
    └── components/storefront/
        └── related-products.tsx            # New component for displaying related products

packages/backend/
└── convex/
    └── products.ts                         # Will contain the new query for related products
```

**Structure Decision**: A new `related-products.tsx` component will be added to the storefront components, which will be imported by the product details page. The fetching logic will reside in a new Convex query within `convex/products.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
