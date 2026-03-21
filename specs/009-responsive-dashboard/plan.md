# Implementation Plan: Responsive Admin Dashboard

**Branch**: `009-responsive-dashboard` | **Date**: 2026-03-21 | **Spec**: [specs/009-responsive-dashboard/spec.md](spec.md)
**Input**: Feature specification from `/specs/009-responsive-dashboard/spec.md`

## Summary

Implement fluid, responsive design architectures for the Techworld Admin Dashboard utilizing TailwindCSS breakpoints and dynamic `useMediaQuery` checks where structural DOM shifts are necessary. All interactions on mobile interfaces will shift dense widgets (filtering, complex wizards) to full-screen modals. Native CSS horizontal scrolling with sticky headers/columns will ensure data tables are legible and prevent page overlap.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18  
**Primary Dependencies**: Next.js 14+, Tailwind CSS v3.x, shadcn/ui
**Storage**: N/A (Frontend UX only, existing Convex models preserved)  
**Testing**: Playwright or Cypress for E2E responsive checks, Jest/RTL for unit tests.  
**Target Platform**: Modern, evergreen web browsers (Mobile, Tablet, Desktop)  
**Project Type**: Next.js full-stack web application (specifically the `admin/` module)  
**Performance Goals**: 60fps scrolling performance, avoiding heavy JS-driven layout recalculations (preferring CSS Grid/Flexbox).  
**Constraints**: Tailwind CSS responsive breakpoints strongly preferred; minimal custom vanilla CSS unless necessitated by specific sticky scrolling behaviors.  
**Scale/Scope**: Impacts all `.tsx` page files inside the Admin dashboard route group and generic central dashboard components (data tables, layout shells).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex? (Yes. This feature adds no UI-derived business logic. Strictly responsive visual styling adjustments.)
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"? (Yes. Inventory algorithms are not touched by this update.)
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server? (Yes. existing Convex logic stands.)
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes? (Yes. N/A for strictly visual styling.)

## Project Structure

### Documentation (this feature)

```text
specs/009-responsive-dashboard/
├── plan.md              
├── research.md          
├── data-model.md        
├── quickstart.md        
├── contracts/           
└── tasks.md             
```

### Source Code (repository root)

```text
packages/frontend/ (or web/)
├── src/app/admin/
│   ├── layout.tsx (Dashboard Shell/Sidebar navigation)
│   ├── page.tsx (Dashboard Home)
│   └── */page.tsx (All subpages)
└── src/components/admin/
    ├── data-table/ (Table layout structures)
    ├── navigation/ (Mobile Hamburger and Sidebar)
    └── forms/ (Responsive filters and modals)
```

**Structure Decision**: Using the Next.js App Router paradigm inherited from existing files, localizing changes within the `admin` app segment and associated UI component library.

## Complexity Tracking

This feature requires no violations of the Techworld Constitution and does not increase the underlying architectural complexity.
