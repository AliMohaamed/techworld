# R2 Migration — Execution Checklist

Companion to [`r2-storage-migration.md`](./r2-storage-migration.md).  
Work through phases **in order**. Each phase can be completed independently. The app stays live throughout — the dual-read resolver means no downtime is required.

Mark tasks `[x]` as you complete them.

---

## Phase 0 — Cloudflare Setup (manual, no code)

> Do this before any code changes. The backend needs real credentials to deploy.

- [ ] Create R2 bucket `techworld-storage` in Cloudflare Dashboard → R2
- [ ] Create R2 API Token with **Object Read & Write** scoped to the bucket  
  Save: Account ID, Access Key ID, Secret Access Key
- [ ] Set up public domain for the bucket:
  - **Option A (prod):** R2 → Settings → Connect Domain → `cdn.yourdomain.com`  
    _(Domain must be on Cloudflare nameservers)_
  - **Option B (dev only):** Enable r2.dev public URL — rate-limited, not for production
- [ ] Set CORS policy on the bucket (allow PUT + GET from localhost:3000, localhost:3001, and production domains — see [migration doc §9.4](./r2-storage-migration.md#94-cors-policy))
- [ ] Add env vars to **Convex dashboard** (Settings → Environment Variables):
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_PUBLIC_BASE_URL` (e.g. `https://cdn.yourdomain.com`)
  - `MIGRATION_TOKEN` (generate a random 32-char secret; save it for Phase 5)
- [ ] Add to `apps/admin/.env.local`:
  - `NEXT_PUBLIC_R2_PUBLIC_HOST=cdn.yourdomain.com`
- [ ] Add to `apps/storefront/.env.local`:
  - `NEXT_PUBLIC_R2_PUBLIC_HOST=cdn.yourdomain.com`

---

## Phase 1 — Backend: R2 client + dual-read resolver

> Creates the two library files that everything else depends on. Deploy this before changing any upload flows so the app can read both Convex Ids and `r2:` refs simultaneously.

- [x] Install `aws4fetch` in `packages/backend`:
  ```
  cd packages/backend && npm install aws4fetch
  ```
- [x] Create `packages/backend/convex/lib/r2.ts`  
  Functions: `presignPut`, `presignGet`, `deleteObject`, `listObjects`, `putBuffer`  
  Uses `aws4fetch` — works in Convex's V8 edge runtime
- [x] Create `packages/backend/convex/lib/storageRef.ts`  
  Functions: `isR2Ref`, `resolveRef`, `r2KeyFromRef`  
  Dispatch: `r2:public/*` → public URL | `r2:receipts/*` → signed URL | else → `ctx.storage.getUrl`
- [x] Run `npm run dev:backend` and confirm Convex deploys with no errors

---

## Phase 2 — Backend: update all read paths

> Switch every query/mutation that calls `ctx.storage.getUrl` to use `resolveRef`. Deploy before changing any upload flows.

- [x] `packages/backend/convex/storage.ts` — `getStorageUrls`: delegate each id to `resolveRef`
- [x] `packages/backend/convex/products.ts` line 231 — `getProductDisplayUrl`: use `resolveRef`
- [x] `packages/backend/convex/orders.ts` line 50 — `getOrderReceiptUrl`: use `resolveRef`
- [x] Run `npm run dev:backend` — no errors
- [ ] Smoke test: open admin product form → existing images still load (legacy Convex Ids resolve correctly)
- [ ] Smoke test: open an order with a receipt → receipt image still loads

---

## Phase 3 — Backend: update write paths (upload endpoints)

> Switch the mutation endpoints from Convex upload URLs to R2 presigned PUT URLs.

- [x] `packages/backend/convex/storage.ts` — `generateCatalogUploadUrl`:
  - Accept `contentType: string` arg
  - Return `{ uploadUrl: r2.presignPut(...), key: "public/catalog/<uuid>.webp" }`
  - Remove `ctx.storage.generateUploadUrl()` call
- [x] `packages/backend/convex/files.ts` — `generateReceiptUploadUrl`:
  - Accept `contentType: string` arg
  - Return `{ uploadUrl: r2.presignPut(...), key: "receipts/<uuid>.<ext>" }`
  - Remove `ctx.storage.generateUploadUrl()` call
- [x] `packages/backend/convex/webhooks.ts` — `downloadAndAttachMedia` action:
  - `fetch(mediaUrl)` → `arrayBuffer()` + detect MIME from headers
  - `r2.putBuffer("receipts/<uuid>.<ext>", buffer, mime)`
  - Pass `"r2:receipts/<uuid>.<ext>"` string to `applyReceiptToOrder`
- [x] `packages/backend/convex/webhooks.ts` — `applyReceiptToOrder`:
  - Change arg `storageId: v.id("_storage")` → `storageRef: v.string()`
- [x] Run `npm run dev:backend` — no errors

---

## Phase 4 — Backend: update delete paths + orphan sweep

> Switch orphan cleanup from Convex `ctx.storage.delete` to `r2.deleteObject` (with fallback for legacy refs during transition).

- [x] `packages/backend/convex/products.ts` lines 1037, 1242 — orphan cleanup in `updateProduct` / `updateSKU`:
  - If `isR2Ref(ref)`: schedule internal action calling `r2.deleteObject(r2KeyFromRef(ref))`
  - Else: `ctx.storage.delete(ref as Id<"_storage">)`
  - Move the R2 delete into an `internalAction` (mutations can't call `fetch`)
- [x] `packages/backend/convex/categories.ts` line 173 — same dual-delete for `thumbnailImageId`
- [x] `packages/backend/convex/sweepJobs.ts` — rewrite `sweepOrphanedCatalogFiles`:
  - Change from `internalMutation` → `internalAction`
  - Replace `ctx.db.system.query("_storage")` with `r2.listObjects("public/")` + `r2.listObjects("receipts/")`
  - Delete unreferenced keys via `r2.deleteObject`
  - Keep legacy branch: also sweep Convex `_storage` for legacy Ids (remove after `--reap-convex` is run)
- [x] `packages/backend/convex/crons.ts` line 14 — point daily 01:00 UTC cron at new action
- [x] Run `npm run dev:backend` — no errors

---

## Phase 5 — Backend: add migration mutations

> Internal mutations used exclusively by the migration script in Phase 7.

- [x] Create `packages/backend/convex/migrations.ts`:
  - `listRefsToMigrate({ table, cursor })` — paginates, skips refs already starting with `r2:`
  - `patchProductRef({ docId, field, newRef, token })`
  - `patchSkuRef({ docId, newRef, token })`
  - `patchCategoryRef({ docId, newRef, token })`
  - `patchOrderReceiptRef({ docId, newRef, token })`
  - Each checks `token === process.env.MIGRATION_TOKEN` before proceeding
- [x] Run `npm run dev:backend` — no errors

---

## Phase 6 — Frontend: update admin upload UI

> Switch the admin upload components from Convex upload flow to the browser-compress → R2 presigned PUT flow.

- [x] Install `browser-image-compression` in `apps/admin`:
  ```
  cd apps/admin && npm install browser-image-compression
  ```
- [x] `apps/admin/src/components/catalog/products/ConvexStorageUpload.tsx`:
  - Update `handleFiles`:
    1. Compress with `browser-image-compression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: 0.85 })`
    2. Call `generateCatalogUploadUrl({ contentType: "image/webp" })` → `{ uploadUrl, key }`
    3. `fetch(uploadUrl, { method: "PUT", body: compressed, headers: { "Content-Type": "image/webp" } })`
    4. Push `"r2:" + key` into `imageIds` state (not a Convex storage Id anymore)
  - Update label: "Convex Edge Storage" → "Cloudflare R2"
  - Add pre-upload validation: reject files > 10 MB; reject non-`image/*` MIME
- [x] `apps/admin/src/app/[locale]/(dashboard)/orders/[id]/page.tsx` (receipt upload):
  - Same compression + R2 PUT pattern
  - Keep original file type (no WebP conversion for receipts)
  - Update `receiptUrl` display to read from `getOrderReceiptUrl` (already signed by backend)
- [x] `apps/admin/next.config.js`:
  - Add `{ hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST }` to `images.remotePatterns`
  - Keep existing Convex hostname until Phase 8 is complete

- [ ] Smoke test (admin, port 3001):
  - Upload a new product with 3 images → confirm PUT goes to R2, not Convex (check Network tab)
  - Confirm images are stored as `r2:public/catalog/...` strings in DB
  - Confirm thumbnails render correctly in the form sheet
  - Delete an image → confirm `r2.deleteObject` called, object disappears from R2 dashboard
  - Upload an order receipt → confirm receipt stored as `r2:receipts/...`, signed URL rendered in order view

---

## Phase 6b — Frontend: update storefront next.config

- [x] `apps/storefront/next.config.js`:
  - Add `{ hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST }` to `images.remotePatterns`
  - Keep existing Convex hostname

- [ ] Smoke test (storefront, port 3000):
  - Open a product page → images load from R2 public URL
  - Confirm content-type is `image/webp`, file sizes < 200 KB

---

## Phase 7 — Run migration script (existing files)

> Migrates all files that were uploaded before this migration. The app stays live throughout.

**Prerequisites:** Phases 0–5 deployed. You have `MIGRATION_TOKEN` and R2 credentials ready.

- [x] Create `scripts/migrate-convex-to-r2.ts` (the migration script)
- [x] Create `scripts/README-migration.md` (run instructions)
- [x] Set env vars in your local shell for the script:
  ```
  export R2_ACCOUNT_ID=...
  export R2_ACCESS_KEY_ID=...
  export R2_SECRET_ACCESS_KEY=...
  export R2_BUCKET=techworld-storage
  export R2_PUBLIC_BASE_URL=https://cdn.yourdomain.com
  export CONVEX_URL=https://your-deployment.convex.cloud
  export MIGRATION_TOKEN=...
  ```
- [x] **Dry run** — review the output, confirm file counts look correct:
  ```
  npx ts-node scripts/migrate-convex-to-r2.ts --dry-run
  ```
- [x] **Single-table test** — run on categories first (smallest table):
  ```
  npx ts-node scripts/migrate-convex-to-r2.ts --filter-table=categories
  ```
  - Inspect `migration-progress.json` — confirm `categories` entries are `status: "done"`
  - Open R2 dashboard → confirm objects appear under `public/categories/`
  - Open admin → verify category thumbnails still render

- [x] **Full migration run:**
  ```
  npx ts-node scripts/migrate-convex-to-r2.ts
  ```
  Monitor `migration-errors.log` for failures. Re-run if there are transient failures (script is idempotent).

- [x] **Verify** — confirm every migrated ref resolves:
  ```
  npx ts-node scripts/migrate-convex-to-r2.ts --verify
  ```
  Must exit with **0 errors**. Fix any failures before proceeding to cleanup.

---

## Phase 8 — Cleanup

> Only after Phase 7 `--verify` exits clean.

- [x] **Reap Convex storage** — deletes all blobs from Convex `_storage`:
  ```
  npx ts-node scripts/migrate-convex-to-r2.ts --reap-convex
  ```
- [x] Confirm Convex dashboard → Storage shows 0 files (may take up to 24 h for usage stats to refresh)
- [ ] Confirm Convex Free-plan warning clears within 24 hours
- [ ] Remove legacy Convex `_storage` sweep branch from `sweepJobs.ts` (the `ctx.db.system.query("_storage")` fallback — no longer needed)
- [ ] Remove the Convex hostname from `apps/admin/next.config.js` and `apps/storefront/next.config.js` `remotePatterns` (all refs are now `r2:` strings)
- [ ] Run `npm run dev:backend` — confirm clean deploy
- [ ] Revoke `MIGRATION_TOKEN` in Convex dashboard (delete the env var — `migrations.ts` endpoints are now dead code)
- [ ] Archive `scripts/migration-progress.json` to a safe location (it's your rollback map; don't delete it until you're confident)

---

## Phase 9 — Post-migration validation (1 week later)

- [ ] Check R2 dashboard: storage MB used, Class A/B ops/month — confirm within free-tier limits
- [ ] Check orphan sweep cron logs (Convex dashboard → Functions → `sweepOrphanedCatalogFiles`) — ran successfully, deleted only orphaned files (ideally 0 for a freshly migrated bucket)
- [ ] Spot-check 5 products uploaded before migration → images still render
- [ ] Spot-check 5 orders with receipts uploaded before migration → receipt images load with valid signed URLs
- [ ] Confirm all new product uploads go to R2 (no residual Convex storage usage)
- [ ] Update migration status in this file: **Status: Complete ✓**

---

## Quick reference: key file paths

| File | Role |
|---|---|
| `packages/backend/convex/lib/r2.ts` | R2 S3 client |
| `packages/backend/convex/lib/storageRef.ts` | Dual-read resolver |
| `packages/backend/convex/storage.ts` | Generates presigned PUT for product images |
| `packages/backend/convex/files.ts` | Generates presigned PUT for receipts |
| `packages/backend/convex/webhooks.ts` | Downloads WhatsApp media → uploads to R2 |
| `packages/backend/convex/sweepJobs.ts` | Daily orphan sweep against R2 |
| `packages/backend/convex/migrations.ts` | Internal mutations for migration script |
| `apps/admin/src/components/catalog/products/ConvexStorageUpload.tsx` | Product image upload UI |
| `apps/admin/src/app/[locale]/(dashboard)/orders/[id]/page.tsx` | Receipt upload UI |
| `scripts/migrate-convex-to-r2.ts` | One-shot migration script |
| `docs/migrations/r2-storage-migration.md` | Full technical reference |

## Quick reference: env vars

| Var | Where set | Who reads it |
|---|---|---|
| `R2_ACCOUNT_ID` | Convex dashboard | `lib/r2.ts` |
| `R2_ACCESS_KEY_ID` | Convex dashboard | `lib/r2.ts` |
| `R2_SECRET_ACCESS_KEY` | Convex dashboard | `lib/r2.ts` |
| `R2_BUCKET` | Convex dashboard | `lib/r2.ts` |
| `R2_PUBLIC_BASE_URL` | Convex dashboard | `lib/storageRef.ts` |
| `MIGRATION_TOKEN` | Convex dashboard | `migrations.ts` |
| `NEXT_PUBLIC_R2_PUBLIC_HOST` | `.env.local` (both apps) | `next.config.js` remotePatterns |
