# Research: Advanced Catalog & Categories Explorer

## Technical Unknowns Resolved

### 1. Convex Pagination Strategy
- **Decision:** Implement the "Load More" functionality using Convex's native `usePaginatedQuery` hook combined with `paginationOpts` on the backend query.
- **Rationale:** Convex natively supports cursor-based pagination which is highly efficient. This cleanly maps to a "Load More" button without risking layout shifts or memory leaks compared to standard infinite scrolling, and natively handles cursor continuation.
- **Alternatives considered:** Traditional offset/limit pagination (inefficient in NoSQL at scale), infinite scrolling (rejected by spec UX clarification).

### 2. Full-Text Search and Filtering Combination
- **Decision:** The `api.products.searchAndFilter` query will branch its execution path. If `searchQuery` is provided, it will utilize `q.withSearchIndex("search_name")` and apply `.filter()` for price and categories. If `searchQuery` is absent, it leverages standard indices (e.g., `q.withIndex("by_category_and_price")`) for maximum DB performance.
- **Rationale:** Convex search capabilities mandate that full-text searches stem from `withSearchIndex`. Standard facet filtering can chain off it. Branching logic ensures queries without search terms don't pay the text-search performance penalty.
- **Alternatives considered:** Client-side search and filtering (rejected due to payload size limits and scalability).

### 3. URL State Synchronization
- **Decision:** Use standard Next.js `useRouter` and `useSearchParams` with shallow routing (`router.push(..., { scroll: false })`) to synchronize filter states.
- **Rationale:** Resolves FR-007 ensuring all selections persist dynamically in the URL parameter string. Prevents full page reloads, retaining a snappy client-side experience.
- **Alternatives considered:** Third-party state management libraries like Redux or Zustand (unnecessary overhead for URL-bound state).

### 4. Empty State Fallback Recommendations
- **Decision:** If `searchAndFilter` returns an empty `page` array, the frontend will trigger a secondary query (e.g., `api.products.getRecommendedProducts`) to render a visual fallback immediately below the "No products found" alert.
- **Rationale:** Adheres to the UX requirement to prevent drop-off and keeps the system within the strict bounds of zero-trust architecture by retrieving curated products securely.
