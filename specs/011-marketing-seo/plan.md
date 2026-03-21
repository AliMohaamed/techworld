# Implementation Plan: Phase 10 - Marketing, Retention & Advanced SEO

**Branch**: `011-marketing-seo` | **Date**: 2026-03-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-marketing-seo/spec.md`

## Summary

This feature implements Phase 10 of the PRD: A Promo Codes engine with capped/uncapped discounts and mutual exclusivity from bundles; Cross-selling UI elements natively referencing unidirectional related products; automated WhatsApp webhooks triggered asynchronously on order state transitions; and advanced programmatic SEO incorporating a dynamic `sitemap.ts` and OpenGraph `generateMetadata` for the storefront.

## Technical Context

**Language/Version**: TypeScript (Next.js 14+, Convex)
**Primary Dependencies**: 
- `convex` (Backend mutations, schema, and scheduled actions for webhooks)
- `next` (Frontend `sitemap.ts` and `generateMetadata` for OG tags)
- `lucide-react` / `shadcn` (UI components for Promo Code input and Related Products carousel)
**Storage**: Convex Database (adding `promo_codes` table, updating `products` and `orders` schema)
**Testing**: Standard project testing framework
**Target Platform**: Vercel (Next.js), Convex Cloud
**Project Type**: Monorepo Web Application (Storefront + Admin)
**Performance Goals**: <500ms checkout latency for promo code validation; <2s webhook dispatch.
**Constraints**: Promo codes MUST not stack with Bundles (mutually exclusive) and Percentage discounts MUST support an absolute maximum value cap.
**Scale/Scope**: Impacts checkout mutation flow, product schema, and all product/sitemap routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Server Authority Gate**: Yes. Next.js only collects the promo code; Convex validates it against the `promo_codes` table and calculates the discount atomically during the `checkout` or `validateCart` flow.
- [x] **Zero Floor & Concurrency Gate**: Yes. Promo code concurrency on `current_uses` is handled atomically by Convex mutations preventing `current_uses` from exceeding `max_uses`.
- [x] **RBAC & Financial Opacity Gate**: Yes. Creating promo codes will require a management permission flag.
- [x] **Audit Gate**: Yes. The usage of a promo code will be logged in the order's financial snapshot.

## Project Structure

### Documentation (this feature)

```text
specs/011-marketing-seo/
├── plan.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/backend/
├── convex/
│   ├── schema.ts            # Add promo_codes, update products and orders
│   ├── promoCodes.ts        # Target for Promo Code CRUD and validation logic
│   ├── orders.ts            # Update to accept promo code and trigger webhooks
│   └── webhooks.ts          # Action to dispatch HTTP fetch to WhatsApp provider
packages/ui/
├── src/components/
│   └── storefront/
│       ├── PromoCodeInput.tsx     # New component for cart/checkout
│       └── RelatedProducts.tsx    # New component for PDP cross-selling
apps/storefront/
├── src/app/
│   ├── sitemap.ts           # Dynamic sitemap generator
│   └── products/
│       └── [slug]/page.tsx  # Update for dynamic OG metadata and RelatedProducts
apps/admin/
├── src/app/
│   └── marketing/
│       └── promo-codes/     # Dashboard CRUD UI for Promo Codes
```

**Structure Decision**: Integrated directly into the existing Turborepo monorepo structure spanning `packages/backend`, `packages/ui`, `apps/storefront`, and `apps/admin`.
