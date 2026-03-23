# Phase 0: Outline & Technical Research

## Research Findings & Technical Strategy

### 1. Convex File Storage Integration Strategy
**Decision:** All images will be uploaded via the `generateUploadUrl` Convex server function, producing `Id<"_storage">` references which are stored exclusively on `products` and `skus` tables. The frontend will dynamically resolve these to valid browser URLs via `useQuery` fetching `ctx.storage.getUrl()`.
**Rationale:** This native approach binds images directly to the Convex data lifecycle, providing robust security, predictable access, and simplifying the schema compared to hosting files on third parties like AWS S3 or Cloudinary.
**Alternatives Considered:** Relying on third-party CDNs (Cloudinary, AWS S3). Rejected due to the architecture philosophy (Zero-Trust Operations) which prefers centralizing all state, operations, and logs purely within the Convex environment.

### 2. Orphan File Sweeping Mechanism
**Decision:** A discrete `crons.ts` sweep job that runs nightly (or configurable interval) and deletes any `_storage` records that do NOT safely intersect with the IDs registered in the `products` table's `thumbnail` or `images` arrays.
**Rationale:** Required by the Edge Cases spec (Question 2: Convex File Storage Orphan Cleanup). `onUnmount` React events are intrinsically unreliable and would result in storage bloat over time when administrative sessions drop.
**Alternatives Considered:** Cleaning files upon Dialog close using mutations (rejected as unreliable per Edge Cases specification clarification).

### 3. SKU Unification and Schema Normalization
**Decision:** Eliminate scalar stock fields on `products` root in favor of an associated `skus` table strictly linked via `productId`. Even single-variant ("simple") products are auto-provisioned a "Default" SKU. The UI logic checks out explicit SKUs, not products.
**Rationale:** Driven by Question 1 in the `/speckit.clarify` session. This ensures atomic stock deductions (via `real_stock`) never encounter race conditions blending simple/complex product types, strictly enforcing the Zero Floor constraint in a highly concurrent environment.

### 4. Admin UI Modals (`shadcn/ui` Form Overlays)
**Decision:** Employ the `Dialog` (for standard entries) and `Sheet` (for heavy nested SKU creation) components combined with `react-hook-form` and `zod`.
**Rationale:** Constitution Rule V. Explicit state bounding within the form hook guarantees strict validation *before* firing the Convex backend mutation, keeping bad data out of the server logic entirely and providing instantaneous feedback during modal workflows without routing lag.
