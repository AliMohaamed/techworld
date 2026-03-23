# Developer Quickstart: Responsive Admin Dashboard

## Local Development Workflow

1. Start the main Next.js development server and Convex backend.
   - `npm run dev`
2. Open Chrome Developer Tools (or another modern browser) and toggle the **Device Toolbar**.
   - Test explicitly across iPhone sizes (375px/390px, 430px) and Tablet sizes (768px/1024px).
3. Primary components updated:
   - `src/app/admin/layout.tsx` (the responsive navigation shell).
   - Core CRUD data table templates (`packages/ui/data-table.tsx` or similar central component mapping).
   - Form modals for complex filters (`components/admin/filters.tsx`).

## Core Responsibilities

- Avoid modifying the underlying schema logic or API queries just to fit data onto the screen; the focus is exclusively on the styling and CSS variables to handle smaller viewports.
- If you rely on `useMediaQuery` for conditional rendering to prevent loading heavy desktop DOM structures on mobile, ensure that SSR hydration mismatches do not occur.
