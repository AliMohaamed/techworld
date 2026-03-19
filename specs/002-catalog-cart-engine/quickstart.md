# Quickstart: Catalog & Persistent Cart Engine

## Prerequisites

Ensure Feature 001 (Core Data Schema & RBAC Engine) is fully deployed and passing. The following must exist before starting this feature:
- `convex/schema.ts` — with `users`, `products`, `orders`, `audit_logs` tables
- `convex/lib/rbac.ts` — with `requirePermission` utility and `Permission` type
- `convex/audit.ts` — with `logAudit` internal mutation
- `npx convex dev` running and in sync with the Convex cloud project

---

## Step 1: Extend the Permission Type

In `convex/lib/rbac.ts`, extend the `Permission` union:

```typescript
export type Permission =
  | "VIEW_FINANCIALS"
  | "VERIFY_PAYMENTS"
  // New — Catalog & Inventory
  | "MANAGE_CATEGORIES"
  | "MANAGE_PRODUCTS"
  | "MANAGE_DISPLAY_STOCK"
  | "ADJUST_REAL_STOCK";
```

---

## Step 2: Expand the Schema

Update `convex/schema.ts`:

1. Add new literals to `users.permissions` union.
2. Add new commercial fields to the `products` table.
3. Add `categories`, `cart_sessions`, and `webhook_receipts` tables.

Refer to `data-model.md` for the complete schema definitions. Run `npx convex dev` after saving — the generated types in `convex/_generated/` will update automatically.

---

## Step 3: Implement Category Mutations

Create `convex/categories.ts` implementing:
- `createCategory` / `updateCategory` / `toggleCategoryActive` (mutations, `MANAGE_CATEGORIES`)
- `listActiveCategories` / `getCategoryById` (public queries)

All write mutations must call `await ctx.runMutation(internal.audit.logAudit, {...})` after successful writes.

---

## Step 4: Implement Product Catalog Mutations

Create `convex/products.ts` implementing:
- `createProduct` (validate `categoryId` is active, requires `MANAGE_PRODUCTS`)
- `publishProduct` (validate parent `isActive = true`, transition DRAFT → PUBLISHED, requires `MANAGE_PRODUCTS`)
- `getProduct` (public query — strip `cogs` if caller lacks `VIEW_FINANCIALS`)
- `listProductsByCategory` (public query — returns only PUBLISHED products with active parent category)

---

## Step 5: Implement Guest Cart Engine

Create `convex/cart.ts` implementing the `sessionId`-keyed cart mutations.

**Key constraint**: Cart mutations MUST NOT modify `display_stock` or `real_stock`. The cart is purely a session convenience layer.

**`addToCart` guard:**
```typescript
const product = await ctx.db.get(args.productId);
if (product.display_stock < args.quantity) {
  throw new Error("Insufficient display stock for cart addition.");
}
```

**`validateCart` logic:**
- Iterate all items in the session's cart.
- For each item: check product exists, is `PUBLISHED`, parent category is active, `display_stock >= quantity`.
- Return a structured result: `{ valid: boolean, failedItems: [...] }`.

---

## Step 6: Implement Webhook Pipeline

### Next.js Route (HTTP Adapter)

Create `app/api/webhook/whatsapp/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  // Verify HMAC signature
  const expectedSig = "sha256=" + crypto
    .createHmac("sha256", process.env.WHATSAPP_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  if (signature !== expectedSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const payload = JSON.parse(rawBody);
  // Forward to Convex internal mutation
  await fetchMutation(api.webhooks.processWebhookReceipt, { payload });

  return NextResponse.json({ ok: true });
}
```

### Convex Internal Mutation (`convex/webhooks.ts`)

Implement `processWebhookReceipt`:
1. Compute SHA-256 hash of raw payload string.
2. Check `webhook_receipts` by `by_hash` index — return `DUPLICATE` if found.
3. Extract Order Short Code via regex: `/ORD-[A-Z0-9]+/i`.
4. Query `orders` for matching order in `AWAITING_VERIFICATION`.
5. Attach media reference and update/insert `webhook_receipts` with `MATCHED` or `UNMATCHED` status.
6. Call `logAudit` on successful match.

Implement `attachReceiptManually`:
- Requires `VERIFY_PAYMENTS` permission.
- Updates the order's `paymentReceiptRef` field and calls `logAudit`.

---

## Step 7: Environment Variables

Add to `.env.local` (Next.js) and Convex environment config:

```bash
WHATSAPP_WEBHOOK_SECRET=<your_shared_secret_from_provider>
CONVEX_DEPLOYMENT=<your_deployment_url>
```

---

## Step 8: Validation Checklist

- [ ] `npx convex dev` shows zero type errors after schema changes
- [ ] Creating a category with Arabic + English names succeeds
- [ ] Publishing a product whose parent category is inactive throws an error
- [ ] Toggle category to inactive → product disappears from `listProductsByCategory` but `getProduct` still returns with a resolvable record
- [ ] Cart `addToCart` with quantity > `display_stock` throws the correct error
- [ ] Cart `validateCart` correctly identifies stale/unpublished items
- [ ] Webhook POST with invalid signature returns 403
- [ ] Duplicate webhook payload returns 200 but creates no second `webhook_receipts` record
- [ ] `getProduct` called without `VIEW_FINANCIALS` does not return `cogs` field
- [ ] All write operations produce an `audit_logs` entry
