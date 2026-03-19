# Implementation Plan: Customer Storefront UI

**Branch**: `004-storefront-ui` | **Date**: 2026-03-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-storefront-ui/spec.md`

## Summary

This feature implements the core Customer Storefront UI for TechWorld using Next.js, explicitly acting as a presentation layer mapped to the Convex backend. It fulfills the Verification-First Hybrid COD strategy via a bespoke WhatsApp handoff flow, ensures absolute server authority for all pricing and stock logics, and introduces a robust session-based cart architecture independent of authenticated users. 

## Technical Context

**Language/Version**: TypeScript / React 18+  
**Primary Dependencies**: Next.js (App Router), Convex React Client, Tailwind CSS v4, shadcn/ui, Lucide Icons, `uuid` (for session generation)  
**Storage**: LocalStorage (for `sessionId`), Convex (Database)  
**Testing**: Jest / React Testing Library (Unit tests), Playwright (E2E for checkout flows)  
**Target Platform**: Web Browsers (Mobile-First responsive design)
**Project Type**: Next.js Web Application
**Performance Goals**: Lighthouse Performance > 90 on Mobile, < 1s TTI (Time to Interactivity)
**Constraints**: Absolute Server Authority (0 client-side invoice/stock math), Dark Mode default with `#ffc105` accents.
**Scale/Scope**: High-concurrency flash sale readiness.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server? (N/A for storefront since they are unauthenticated guests, but yes).
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes? (Handled primarily by backend mutations triggered from the UI).

## Project Structure

### Documentation (this feature)

```text
specs/004-storefront-ui/
├── plan.md              # This file
├── research.md          # Technical decisions and unknown resolutions
├── data-model.md        # UI-to-Backend data expectations
├── quickstart.md        # How to run and test this specific feature
├── contracts/           # API and webhook payload definitions
└── tasks.md             # Task breakdown (next step)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (store)/         # Route group for storefront
│   │   ├── page.tsx     # Home (Flash Sale interface)
│   │   ├── categories/  # Category Browsing
│   │   ├── products/    # Product Detail Pages
│   │   └── success/     # Checkout Success & WhatsApp Handoff
│   ├── layout.tsx       # Root layout containing providers
├── components/
│   ├── ui/              # shadcn UI components
│   ├── storefront/      # Storefront specific components
│   │   ├── header.tsx
│   │   ├── cart-drawer.tsx
│   │   └── product-card.tsx
├── providers/
│   ├── convex-client-provider.tsx
│   └── session-provider.tsx # Handles UUID generation in localStorage
└── lib/
    └── utils.ts
```

**Structure Decision**: A Next.js App Router structure organizing public storefront routes within a `(store)` route group to seamlessly separate public routing constraints from future `(admin)` routes as specified in the PRD.
