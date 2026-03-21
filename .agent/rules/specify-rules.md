# website Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-21

## Active Technologies
- TypeScript, React 18, Next.js 15 + Convex, Tailwind CSS, shadcn/ui (nuqs for URL sync) (005-catalog-explorer)
- Convex Database (005-catalog-explorer)
- TypeScript / Node 20 + Next.js 16.1.6, React 19, Convex ^1.33.1, Tailwind CSS v4, shadcn/ui, Turborepo (006-admin-dashboard-arch)
- Convex (Backend & Real-Time Database) (006-admin-dashboard-arch)
- TypeScript (Next.js 14+, Convex Backend) + React, TailwindCSS v4, shadcn/ui (`Dialog`, `Sheet`, `Form`), Zod, React Hook Form, Convex (`storage`) (007-advanced-catalog)
- Convex Database and Convex File Storage (for images) (007-advanced-catalog)
- TypeScript 5.x, React 18 + Next.js 14+, Tailwind CSS v3.x, Radix UI (or shadcn/ui) (009-responsive-dashboard)
- N/A (Frontend UX only, existing Convex models preserved) (009-responsive-dashboard)
- TypeScript (Next.js 14+, Convex) (011-marketing-seo)
- Convex Database (adding `promo_codes` table, updating `products` and `orders` schema) (011-marketing-seo)
- TypeScript, React 18, Next.js 14+ (App Router) + `next-intl` (routing & translations), `next-themes` (theme management), `sonner` (toast notifications), `lucide-react`, standard React Suspense. (012-system-i18n-theming)
- Client-side Cookies (for locale and theme persistence to avoid hydration mismatches). (012-system-i18n-theming)

- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (005-catalog-explorer)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cd src; pytest; ruff check .

## Code Style

[e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]: Follow standard conventions

## Recent Changes
- 012-system-i18n-theming: Added TypeScript, React 18, Next.js 14+ (App Router) + `next-intl` (routing & translations), `next-themes` (theme management), `sonner` (toast notifications), `lucide-react`, standard React Suspense.
- 011-marketing-seo: Added TypeScript (Next.js 14+, Convex)
- 011-marketing-seo: Added TypeScript (Next.js 14+, Convex)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
