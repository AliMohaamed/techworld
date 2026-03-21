# Phase 0 Research: System-Wide Polish, i18n & Theming

## 1. i18n with Next.js App Router (`next-intl`)
**Decision**: Utilize `next-intl` to handle server and client translations within the Next.js App Router framework.
**Rationale**: 
- `next-intl` tightly integrates with Next.js 14+ Server Components, allowing translations to happen on the server, saving client bundle sizes.
- It provides a robust routing middleware that intercepts requests, detects `Accept-Language` headers, checks cookie overrides, and smoothly handles `HTTP 307` redirects for unsupported locales.
- **RTL Support Execution**: To flip layouts horizontally, the root layout simply sets `dir="rtl"` (or `"ltr"`) dynamically based on the current locale (e.g. Arabic vs English). Tailwind CSS fully supports logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) which respect the global Document direction implicitly.

## 2. Universal Theming (`next-themes`)
**Decision**: Implement `next-themes` as an overarching context provider wrapping the Root Layout in both applications.
**Rationale**:
- Next-themes utilizes highly optimized inline scripts that run before hydration, completely solving the Flash of Unstyled Content (FOUC) problem.
- It seamlessly integrates with Tailwind CSS (by applying the `.dark` class to the `<html>` element).
- `shadcn/ui` components natively look for the `.dark` class hierarchy or CSS variables configured in `globals.css`.

## 3. Global Toaster (`sonner`)
**Decision**: Adopt `sonner` over older toast libraries for all application-wide feedback.
**Rationale**:
- `sonner` is extremely performant, customizable, and visually pairs perfectly with modern UI setups like `shadcn/ui` and `next-themes`.
- It handles rendering stacks and provides native support for debouncing identical actions when configured properly to avoid UI clutter (addressed via `toast.custom` or throttling wrapped invocation wrappers).

## 4. Loading States (Suspense & Skeletons)
**Decision**: Deploy `<Suspense fallback={<Skeleton />}>` heavily across both Admin dashboards and Storefront product pages.
**Rationale**:
- Rather than rendering blank empty states or a generic central loader during network requests, `shadcn/ui` Skeleton components give users immediate perceptual context about what layout is arriving.
- Next.js streaming boundaries handle this inherently when combined with Server Components that await data.
