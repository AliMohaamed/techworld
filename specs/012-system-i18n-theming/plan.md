# Implementation Plan: Phase 11 - System-Wide Polish, i18n & Theming

**Branch**: `012-system-i18n-theming` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-system-i18n-theming/spec.md`

## Summary

Implement structural Internationalization (i18n) via `next-intl`, theming (Dark/Light) via `next-themes`, and universal feedback mechanisms (`sonner` toasts, React Suspense skeletons) across both the `storefront` and `admin` applications to elevate the platform to a production-ready, premium standard. Dynamic content translation is explicitly out of scope for this phase.

## Technical Context

**Language/Version**: TypeScript, React 18, Next.js 14+ (App Router)
**Primary Dependencies**: `next-intl` (routing & translations), `next-themes` (theme management), `sonner` (toast notifications), `lucide-react`, standard React Suspense.
**Storage**: Client-side Cookies (for locale and theme persistence to avoid hydration mismatches).
**Testing**: Jest / React Testing Library (for component rendering checks).
**Target Platform**: Web browsers (Mobile, Tablet, Desktop) with robust Right-to-Left (RTL) support.
**Project Type**: Monorepo Web Applications (Storefront, Admin).
**Performance Goals**: <500ms locale switch without full page reloads, instant zero-shift theme toggling.
**Constraints**: Deeply nested server components must hydrate correctly, strictly avoid Flash of Unstyled Content (FOUC) on load, no DB schema changes for localization.
**Scale/Scope**: Impacts every UI component layout across both Next.js applications (`apps/admin` and `apps/storefront`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Is the Next.js frontend kept strictly as a presentation layer? Are all logic, pricing, inventory computations, and state mutations atomic and within Convex?
  *Pass: This phase is 100% UI and presentation-layer focused. No business logic or Convex mutations are modified.*
- [x] **Zero Floor & Concurrency Gate**: Can `real_stock` drop below zero in this design? Are stock deductions limited ONLY to the `CONFIRMED` state? Does the logic safely handle "Negative Concurrency Collisions"?
  *Pass: Irrelevant to styling and localization.*
- [x] **RBAC & Financial Opacity Gate**: Are we using granular permission flags (e.g., `VIEW_FINANCIALS`) at the Convex mutation level rather than hardcoded roles? Are financial fields stripped from payloads for unprivileged users before leaving the server?
  *Pass: Irrelevant to styling and localization.*
- [x] **Audit Gate**: Does this feature generate immutable audit logs for state, configuration, and permission changes?
  *Pass: UI theme/locale changes do not require application audit logs as they are user-preference presentation states.*

## Project Structure

### Documentation (this feature)

```text
specs/012-system-i18n-theming/
├── plan.md              # This file
├── research.md          # Technical analysis of i18n and Theming approaches
├── data-model.md        # Cookie schema and Translation JSON shapes
├── quickstart.md        # Guide for adding new translations and themes
└── tasks.md             # Implementation breakdown
```

### Source Code (repository root)

```text
packages/ui/
├── src/
│   ├── components/ui/       # Shadcn components wrapped with next-themes
│   └── styles/              # Tailwind global configurations

apps/storefront/
├── src/
│   ├── app/
│   │   ├── [locale]/        # Dynamic route segment for i18n
│   │   └── layout.tsx       # Root layout containing ThemeProvider and NextIntlClientProvider
│   ├── components/          # Suspense Skeletons and Theme toggles
│   ├── i18n/                # next-intl configuration and routing
│   └── messages/            # JSON translation files (en.json, ar.json)
├── middleware.ts            # next-intl locale routing interception

apps/admin/
├── src/
│   ├── app/
│   │   ├── [locale]/        # Dynamic route segment for i18n
│   │   └── layout.tsx       # Root layout containing ThemeProvider and NextIntlClientProvider
│   ├── components/          # Suspense Skeletons and Theme toggles
│   ├── i18n/                # next-intl configuration and routing
│   └── messages/            # JSON translation files
└── middleware.ts            # next-intl locale routing interception
```

**Structure Decision**: The Monorepo architecture requires duplicate setup of `next-intl` routing logic in both application boundaries (`storefront` and `admin`), but shared UI components inside `packages/ui` will utilize agnostic tools (`next-themes`, generic `sonner`, `lucide-react`). Translations (`messages/`) remain isolated per application to prevent runaway bundle sizes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A. Fully compliant with Constitution.
