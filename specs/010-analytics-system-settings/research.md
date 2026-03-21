# Phase 0: Research & Technical Decisions (Analytics & Settings)

## Decision 1: Aggregation Computation Strategy (Convex)
- **Decision**: Perform real-time bounded queries in Convex using indexed queries. We will use `useQuery` or specialized data pre-aggregations restricted strictly to a selected Date Range (e.g., Last 7 Days).
- **Rationale**: Per the clarification answers in `spec.md`, for MVP to early production, querying over indexed bounded ranges of `orders` provides real-time accuracy without the heavy infrastructure overhead of CRON-based materialized views.
- **Alternatives considered**: 
  - Scheduled CRON to `daily_metrics` table: Rejected as premature optimization.
  - Event-driven running totals: Rejected, extreme risk of concurrency mutation conflicts ("Negative Concurrency Collisions") when dozens of orders hit at once.

## Decision 2: Charting Library for Analytics Dashboard
- **Decision**: `recharts` tightly integrated with Tailwind/shadcn/ui.
- **Rationale**: Highly composable declarative React API. Excellent compatibility with Next.js App Router Client Components and Tailwind CSS variable-based theming (e.g., using `var(--primary)`).
- **Alternatives considered**: 
  - `Chart.js`: Canvas-based, harder to customize cleanly with React paradigms.
  - `Visx`: Too low-level, requires massive boilerplate for basic tooltips.

## Decision 3: Audit Log Visualization Strategy
- **Decision**: Paginated Convex query mapped to a shadcn Data Table.
- **Rationale**: The `audit_logs` table is essentially infinite and append-only. Standard `useQuery` will hit Convex response limits (8MB memory constraints). We MUST use `usePaginatedQuery` (`api.audit.paginatedList`) from the start, filtering by generic `entityId` or `actor`.
- **Alternatives considered**: None. Pagination is mandatory for high-velocity logs.
