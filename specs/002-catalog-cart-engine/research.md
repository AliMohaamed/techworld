# Research: Catalog & Persistent Cart Engine

## Technical Decisions

### Decision: Category–Product Relationship Enforcement
- **Decision**: `categoryId` is a required field on the `products` table, stored as `v.id("categories")`. Every `createProduct` and `publishProduct` mutation validates both that the category exists and that `isActive = true` before writing.
- **Rationale**: Orphaned products are explicitly forbidden by the PRD ("Every Product creation mutation must validate the existence of a valid, active categoryId"). Using a Convex `v.id("categories")` type provides schema-level integrity so the database cannot store an invalid reference.
- **Alternatives considered**: Allowing a nullable `categoryId` and validating later — rejected because it violates the PRD's "zero orphaned products" constraint and creates operational ambiguity.

---

### Decision: Category Deactivation — Soft Hide, Not 404
- **Decision**: When `isActive = false`, category and product list queries filter out those products, but `getProduct` still returns the record with a `hidden: true` flag. The Next.js storefront renders an "Unavailable" page for direct URLs rather than a 404.
- **Rationale**: Direct product URLs must remain indexable for SEO purposes as specified in the clarified business rules. A 404 would cause Google to deindex those pages. A soft "Unavailable" state preserves link equity while hiding content from active browsing.
- **Alternatives considered**: Returning a 404 from the API — rejected. Serving a full product page but with a banner — acceptable alternative but risks confusing customers; "Unavailable" page is cleaner.

---

### Decision: Hybrid Guest Cart Architecture
- **Decision**: The frontend generates a UUID `sessionId` on first visit stored in `localStorage`. All cart mutations (`addToCart`, `validateCart`, etc.) accept this `sessionId` as an argument. Convex manages a `cart_sessions` table keyed by `sessionId`.
- **Rationale**: There is zero customer login system. The `sessionId` in `localStorage` survives browser refreshes and tab closures. The Convex backend owns the authoritative cart state, enabling server-side pre-checkout validation and future abandoned cart analytics. Cart additions do NOT touch inventory (`display_stock` or `real_stock`) — this is the strict constitutionally-mandated separation.
- **Alternatives considered**: Pure `localStorage`-only cart (no backend) — rejected because it cannot support server-side validation before checkout and cannot track abandoned carts. Cookies — viable but localStorage is simpler for a guest-only model with no cross-domain requirements.

---

### Decision: Webhook Order Matching via Short Code Extraction
- **Decision**: When the WhatsApp provider sends an inbound message, the system extracts a unique Order Short Code (e.g., `ORD-123`) from the message text using a regex pattern. The extracted code is used to query the `orders` table for a matching order in `AWAITING_VERIFICATION` state.
- **Rationale**: Phone number matching alone is unreliable — a customer may text from a different number, or multiple orders may exist for the same phone. The Order Short Code is communicated to the customer in the original WhatsApp confirmation message, making it the reliable, unambiguous identifier.
- **Alternatives considered**: Phone number-only matching — rejected per the clarified business rules. Requiring customers to manually type a specific format — higher friction; regex on the short code is more forgiving of formatting variations.

---

### Decision: Webhook Idempotency
- **Decision**: Each incoming webhook payload is hashed (payload hash stored in `webhook_receipts`). Before processing, the system checks for an existing record with the same hash. Duplicate payloads are silently acknowledged (HTTP 200) without creating a second record.
- **Rationale**: Webhook providers typically retry delivery on non-200 responses. Idempotency prevents duplicate receipt attachments and ensures exactly-once semantics without requiring the provider to support deduplication natively.
- **Alternatives considered**: Using a provider-supplied `messageId` as the idempotency key — better when available and should be used as the primary key if the provider supplies it; hash is the fallback.

---

### Decision: Webhook Signature Verification in Next.js Route Handler
- **Decision**: The Next.js `app/api/webhook/whatsapp/route.ts` is the only HTTP-facing entry point. It verifies the HMAC signature (or shared-secret header) from the WhatsApp provider before forwarding the payload to Convex via an internal mutation triggered through the Convex HTTP client.
- **Rationale**: Convex mutations cannot directly receive raw HTTP requests from external providers. The Next.js API route serves as a thin, stateless verification adapter — all business logic (matching, attaching, logging) lives in Convex to maintain Absolute Server Authority.
- **Alternatives considered**: Convex HTTP Actions — Convex supports HTTP actions natively. This is a valid alternative that would remove the Next.js route entirely. To keep a strict Next.js middleware layer for signature verification and future rate-limiting, the hybrid approach is preferred for this implementation.

---

### Decision: Financial Redaction at Query Level  
- **Decision**: `getProduct` and `listProductsByCategory` Convex queries accept the calling identity and call `requirePermission`-style check for `VIEW_FINANCIALS`. The `cogs` field is explicitly deleted from the returned object before it leaves the server if the permission is absent.
- **Rationale**: PRD Section 1.3 is explicit: "Frontend hiding is insufficient." The field must be stripped before the payload leaves the server to prevent any client-side inspection revealing COGS or margin data.
- **Alternatives considered**: Returning null for `cogs` — still reveals the field exists. Omitting only on the frontend — rejected by the PRD.

---

### Decision: RBAC Permission Type Extension
- **Decision**: Extend the `Permission` union type in `convex/lib/rbac.ts` to include `MANAGE_CATEGORIES`, `MANAGE_PRODUCTS`, `MANAGE_DISPLAY_STOCK`, and `ADJUST_REAL_STOCK`. Update the `users.permissions` array validator in `schema.ts` to include these new literals.
- **Rationale**: New mutations need new permission flags per the PRD's permission taxonomy (Section 5.2). The existing `requirePermission` helper is reused without modification — only the type union grows.
- **Alternatives considered**: Reusing existing permissions (e.g., `VERIFY_PAYMENTS` as a catch-all admin flag) — rejected because it violates the granular, permission-driven RBAC architecture mandated by the constitution.
