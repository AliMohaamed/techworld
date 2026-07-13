# R2 Storage Migration: Convex → Cloudflare R2

**Status:** Planned  
**Author:** Engineering  
**Date:** 2026-05-18  
**Motivation:** Convex Free-plan storage limit exceeded. Migrating file storage to Cloudflare R2 (10 GB storage, $0 egress at any scale, S3-compatible).

---

## 1. Why Cloudflare R2

| Factor | Convex Storage | Cloudflare R2 |
|---|---|---|
| Free storage | ~1 GB (shared Free-plan limit) | **10 GB/month** |
| Egress / bandwidth | Counted against Free-plan | **$0 at any scale, forever** |
| Image transforms | None | None (pre-process at upload) |
| S3 compatibility | No | Yes — any S3 SDK works |
| Signed private URLs | Via `ctx.storage.getUrl()` | S3 presigned GET (configurable TTL) |
| Upload method | Convex mutation proxy | Presigned S3 PUT directly from browser |

Other providers considered and rejected:
- **ImageKit / Cloudinary** — metered bandwidth; would reproduce the same cap problem at scale.
- **Backblaze B2** — egress is free only through Cloudflare CDN, adds operational complexity.
- **Supabase Storage** — 1 GB free; too small.

---

## 2. What is stored (full inventory)

| Table | Field | Type | Description | Privacy |
|---|---|---|---|---|
| `products` | `thumbnail` | optional `storageRef` | Primary product image | Public |
| `products` | `images` | array of `storageRef` | Product gallery | Public |
| `categories` | `thumbnailImageId` | optional `storageRef` | Category thumbnail | Public |
| `skus` | `linkedImageId` | optional `storageRef` | Variant-specific image | Public |
| `orders` | `paymentReceiptRef` | optional `storageRef` | Payment receipt screenshot | **Private** |

Schema type today: `storageRef = v.union(v.string(), v.id("_storage"))`. The `string` branch is already used post-migration — no schema change required.

---

## 3. Reference-string convention (after migration)

All new uploads store a **prefixed key string** in the database field:

```
r2:public/catalog/<uuid>.webp       → product images and thumbnails
r2:public/categories/<uuid>.webp    → category thumbnails
r2:public/skus/<uuid>.webp          → SKU variant images
r2:receipts/<uuid>.<ext>            → payment receipts (private, signed URL only)
```

Legacy Convex `Id<"_storage">` strings remain in the DB until the migration script runs and are handled by a dual-read fallback resolver throughout the transition.

### Resolver dispatch logic (`lib/storageRef.ts`)

```
resolveRef(ctx, ref):
  if ref starts with "r2:public/"   → "${R2_PUBLIC_BASE_URL}/${ref.slice(3)}"
  if ref starts with "r2:receipts/" → r2.presignGet(ref.slice(3), TTL=3600)
  else                              → ctx.storage.getUrl(ref as Id<"_storage">)
```

This single helper is called from every read path — `getProductDisplayUrl`, `getStorageUrls`, `getOrderReceiptUrl`, `sweepJobs`. No caller needs to know which storage backend is active.

---

## 4. Upload flow (new)

### Product / category / SKU images (admin)

```
Browser (ConvexStorageUpload.tsx)
  ↓ 1. imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1600,
                                fileType: "image/webp", initialQuality: 0.85 })
  ↓ 2. useMutation(api.storage.generateCatalogUploadUrl)({ contentType: "image/webp" })
         → backend runs requirePermission(MANAGE_PRODUCTS)
         → returns { uploadUrl: presigned S3 PUT URL, key: "public/catalog/<uuid>.webp" }
  ↓ 3. fetch(uploadUrl, { method: "PUT", body: compressedFile, headers: { Content-Type } })
         → file goes directly to R2, never through Convex
  ↓ 4. store "r2:public/catalog/<uuid>.webp" in component state → saved to DB on form submit
```

### Payment receipts (admin, manual)

Same flow but:
- `generateReceiptUploadUrl` called (requires `VERIFY_PAYMENTS` permission)
- Key: `"receipts/<uuid>.<original-ext>"`
- **Do NOT convert receipts to WebP** — admins may need to forward JPEG/PNG to banks
- Still compress: `{ maxSizeMB: 1, maxWidthOrHeight: 2400 }` (no format change)

### Payment receipts (WhatsApp webhook, automatic)

```
webhooks.downloadAndAttachMedia (internalAction)
  1. fetch(whatsapp_media_url) → ArrayBuffer
  2. detect MIME from Content-Type header
  3. r2.putBuffer("receipts/<uuid>.<ext>", buffer, mime)
  4. runMutation(applyReceiptToOrder, { orderId, storageRef: "r2:receipts/<uuid>.<ext>" })
```

---

## 5. Image compression strategy

**Layer 1 — Browser pre-compression (zero server cost, happens before upload):**

| Setting | Product images | Receipts |
|---|---|---|
| `maxWidthOrHeight` | 1600 px | 2400 px |
| `maxSizeMB` | 0.2 MB | 1 MB |
| `fileType` | `image/webp` | keep original |
| `initialQuality` | 0.85 | 0.85 |
| HEIC auto-convert | yes | yes |
| Library | `browser-image-compression` | `browser-image-compression` |

**Why 0.85 / WebP is "visually lossless":**  
Quality 85 WebP is indistinguishable from the source at typical e-commerce display sizes (≤ 800 px). A 4 MB iPhone photo compresses to ≈ 80–150 KB with no perceptible difference. This is the compression standard used by Shopify, Amazon, and all major e-commerce platforms.

**If strict lossless is required later:**  
Switch to `{ fileType: "image/png", initialQuality: 1, maxSizeMB: 5, maxWidthOrHeight: 4000 }`. Expect 4–8× larger files.

**Layer 2 — Optional later: Cloudflare Image Resizing (Workers)**  
R2 does not do on-the-fly transforms. If responsive srcset is needed, a Cloudflare Worker can proxy `cdn.domain.com/public/catalog/<key>?w=400` → resize via Cloudflare Image Resizing (5,000 free unique transforms/month on Workers free plan). Not required for v1 — pre-compressed WebP at 1600 px is sufficient for all current display sizes.

**Storage math (estimate):**  
- 1,000 products × 5 images × 120 KB = 600 MB product images  
- 10,000 orders × 1 receipt × 500 KB = 5 GB receipts  
- Total ≈ **5.6 GB** — within 10 GB free tier with headroom

---

## 6. Backend changes

### New files

#### `packages/backend/convex/lib/r2.ts`

R2 client using `aws4fetch` (S3-compatible, runs in Convex's V8 edge runtime — do **not** use `@aws-sdk/client-s3`, it requires Node.js internals). Reads env vars at call time (Convex actions/mutations don't have module-level env access).

```typescript
// Env vars required in Convex dashboard:
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET, R2_PUBLIC_BASE_URL

presignPut(key: string, contentType: string, ttlSeconds: number): Promise<string>
presignGet(key: string, ttlSeconds: number): Promise<string>
deleteObject(key: string): Promise<void>
listObjects(prefix: string, continuationToken?: string): Promise<{ keys: string[], nextToken?: string }>
putBuffer(key: string, buffer: ArrayBuffer, contentType: string): Promise<void>
```

#### `packages/backend/convex/lib/storageRef.ts`

```typescript
isR2Ref(ref: string): boolean
resolveRef(ctx: QueryCtx | ActionCtx, ref: string): Promise<string | null>
r2KeyFromRef(ref: string): string   // strips "r2:" prefix
```

#### `packages/backend/convex/migrations.ts`

Internal mutations/queries for the migration script. All guarded by `MIGRATION_TOKEN` env check (not RBAC — this runs out-of-band before auth is needed):

```typescript
listRefsToMigrate({ table, cursor })   // paginates, skips "r2:" refs already migrated
patchProductRef({ docId, field, newRef, token })
patchSkuRef({ docId, newRef, token })
patchCategoryRef({ docId, newRef, token })
patchOrderReceiptRef({ docId, newRef, token })
```

### Modified files

#### `packages/backend/convex/storage.ts`

- `generateCatalogUploadUrl`: no longer calls `ctx.storage.generateUploadUrl()`. Returns `{ uploadUrl, key }` via `r2.presignPut(...)`. Permission check unchanged.
- `getStorageUrls`: delegates each id to `resolveRef` — handles both Convex Ids and `r2:` refs transparently.

#### `packages/backend/convex/files.ts`

- `generateReceiptUploadUrl`: returns `{ uploadUrl, key }` for `receipts/` prefix. Permission check unchanged.

#### `packages/backend/convex/products.ts`

- `getProductDisplayUrl` (line 231): use `resolveRef`.
- `updateProduct` orphan cleanup (line 1037): dual-delete — if ref starts with `r2:` call `r2.deleteObject(r2KeyFromRef(ref))`; else `ctx.storage.delete(id)`. Move to an `internalAction` because R2 calls use `fetch` (mutations can't call fetch).
- `updateSKU` orphan cleanup (line 1242): same pattern.

#### `packages/backend/convex/categories.ts`

- `updateCategory` orphan cleanup (line 173): same dual-delete.

#### `packages/backend/convex/orders.ts`

- `getOrderReceiptUrl` (line 50): `resolveRef` returns a signed URL for `r2:receipts/*` and falls back to `ctx.storage.getUrl` for legacy Convex Ids.

#### `packages/backend/convex/webhooks.ts`

- `downloadAndAttachMedia` (lines 128–162): `ctx.storage.store(blob)` → `r2.putBuffer(key, arrayBuffer, contentType)`. Returns `"r2:receipts/<uuid>.<ext>"` string.
- `applyReceiptToOrder` (lines 168–201): `storageId: v.id("_storage")` → `storageRef: v.string()`.

#### `packages/backend/convex/sweepJobs.ts`

- Rewritten as an **action** (needs `fetch` for R2 API calls; `sweepOrphanedCatalogFiles` was a mutation).
- Instead of `ctx.db.system.query("_storage")`, paginates `r2.listObjects("public/")` and `r2.listObjects("receipts/")`.
- Build referenced set from DB as before.
- Delete unreferenced objects via `r2.deleteObject`.

#### `packages/backend/convex/crons.ts`

- Daily 01:00 UTC cron re-targeted at the new action.

#### `packages/backend/package.json`

- Add: `aws4fetch`

---

## 7. Frontend changes

### `apps/admin`

#### `ConvexStorageUpload.tsx` (lines 131–248)

New `handleFiles` flow:
1. `browser-image-compression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 1600, useWebWorker: true, fileType: "image/webp", initialQuality: 0.85 })`
2. `generateCatalogUploadUrl({ contentType: "image/webp" })` → `{ uploadUrl, key }`
3. `fetch(uploadUrl, { method: "PUT", body: compressed, headers: { "Content-Type": "image/webp" } })`
4. Push `"r2:" + key` into `imageIds` state
5. Label change: "Convex Edge Storage" → "Cloudflare R2"

#### `orders/[id]/page.tsx` (receipt upload, lines 38–111, 589–595)

Same pattern, but keep original MIME type for receipts (no WebP conversion).

#### `apps/admin/package.json`

- Add: `browser-image-compression`

#### `apps/admin/next.config.js`

```js
images: {
  remotePatterns: [
    { hostname: process.env.NEXT_PUBLIC_R2_PUBLIC_HOST },
    // keep existing Convex hostname until --reap-convex runs
  ]
}
```

### `apps/storefront`

#### `next.config.js`

Same `remotePatterns` addition.

No component changes — `product.images[i]` is already used as a raw URL string.

---

## 8. Environment variables

### Convex dashboard (backend env vars)

| Variable | Description |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token Access Key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token Secret Access Key |
| `R2_BUCKET` | Bucket name (e.g. `techworld-storage`) |
| `R2_PUBLIC_BASE_URL` | Public base URL, e.g. `https://cdn.yourdomain.com` |
| `MIGRATION_TOKEN` | Random secret used by migration script to call internal mutations |

### `apps/admin/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_R2_PUBLIC_HOST` | Hostname only, e.g. `cdn.yourdomain.com` (for `remotePatterns`) |

### `apps/storefront/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_R2_PUBLIC_HOST` | Same as admin |

---

## 9. Cloudflare R2 setup (one-time, manual)

### 9.1 Create bucket

1. Cloudflare Dashboard → R2 Object Storage → Create Bucket
2. Name: `techworld-storage` (or your choice)
3. Region: Automatic

### 9.2 Create API token

1. R2 → Manage R2 API Tokens → Create API Token
2. Permissions: **Object Read & Write**
3. Scope: Specific bucket → `techworld-storage`
4. Save: Access Key ID + Secret Access Key + Account ID

### 9.3 Public domain binding (production)

**Option A — Custom domain (recommended):**
1. R2 bucket → Settings → Public Access → "Connect Domain"
2. Enter `cdn.yourdomain.com` (must be on Cloudflare nameservers)
3. Done — all objects under `public/*` are served at `https://cdn.yourdomain.com/public/<key>`

**Option B — r2.dev URL (dev only):**
1. R2 bucket → Settings → Public Access → Enable
2. Use `pub-<hash>.r2.dev` as base URL
3. Rate-limited; not for production

> **Receipt security note:** The public binding serves all objects by exact key. Receipt keys are UUIDs and never linked publicly. For defense-in-depth (v1.5), add a Cloudflare Worker that 404s requests matching `receipts/*` on the public domain.

### 9.4 CORS policy

Set in R2 bucket → Settings → CORS:

```json
[
  {
    "AllowedOrigins": [
      "https://admin.yourdomain.com",
      "http://localhost:3001",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 10. Migration script: `scripts/migrate-convex-to-r2.ts`

### Overview

One-shot Node.js script that reads every storage ref from Convex, downloads the file, re-uploads to R2, then patches the DB ref to the new `r2:` string. The backend is updated first so it can read both formats concurrently — the app stays fully functional throughout.

### Flags

| Flag | Effect |
|---|---|
| `--dry-run` | Print what would be migrated; no writes |
| `--filter-table=<name>` | Only migrate one table (e.g. `categories`) |
| `--verify` | After migration: HEAD each `r2:` ref, confirm 200 + content-length > 0 |
| `--reap-convex` | Delete all blobs from Convex `_storage`. **Run only after `--verify` succeeds.** |

### Algorithm

```
for each table in [products, categories, skus, orders]:
  cursor = null
  loop:
    rows = listRefsToMigrate({ table, cursor })
    for each row (4 concurrent):
      if row.ref starts with "r2:": skip
      if row.ref in migration-progress.json as "done": skip
      url = convexGetUrl(row.ref)
      response = fetch(url)
      buffer = response.arrayBuffer()
      mime = response.headers["Content-Type"]
      key = buildKey(table, row.field, mime)  // e.g. "public/catalog/<uuid>.webp"
      r2.putObject(key, buffer, mime)
      patchXxxRef({ docId: row.docId, newRef: "r2:" + key })
      write migration-progress.json: { docId, field, oldRef, newRef: "r2:" + key, status: "done" }
    cursor = rows.nextCursor
    if cursor == null: break
```

### Idempotency and resumability

- `listRefsToMigrate` server-side skips any ref already starting with `r2:`.
- Script checks `migration-progress.json` to skip already-processed `docId+field` pairs within a run.
- On crash: re-run picks up where it left off. Failures are logged to `migration-errors.log` but don't halt the run.

### Progress file: `scripts/migration-progress.json`

```json
[
  {
    "docId": "jx7abc123",
    "table": "products",
    "field": "thumbnail",
    "oldRef": "kg2xyz...",
    "newRef": "r2:public/catalog/f47ac10b-58cc.webp",
    "status": "done",
    "migratedAt": 1716050000
  }
]
```

Keep this file. It is the rollback map — if a migrated ref needs to be reverted, use `oldRef` to patch back.

### Rate limiting

- 4 concurrent uploads
- ~10 ops/second sustained
- R2 free tier: 1 M Class A ops/month ≈ 23/s sustained — well within limit

### Expected duration

~5,000 files × 120 KB avg ÷ 50 Mbps upload = ~20 minutes

---

## 11. Rollback plan

1. **During migration (before `--reap-convex`):** Stop the script at any point. `resolveRef` dual-read means the app handles both formats. No user impact.
2. **Revert specific docs:** Use `migration-progress.json` to find `oldRef` for any `docId+field` → run a Convex mutation to re-patch with the Convex Id.
3. **Full rollback:** Re-patch all migrated refs back to their `oldRef` from `migration-progress.json`. Only viable before `--reap-convex`.
4. **After `--reap-convex`:** No rollback to Convex storage — blobs are deleted. R2 data is the authoritative copy. Convex has a snapshot backup feature; only option is restore from snapshot.

> **Rule:** Do not run `--reap-convex` until `--verify` exits with 0 errors.

---

## 12. Orphan sweep (daily cron, updated)

The `sweepOrphanedCatalogFiles` job is rewritten as a Convex **action** (needs `fetch` for R2 API calls). Logic:

1. Build referenced set: collect all `r2:` refs from `products`, `skus`, `categories`, `orders`.
2. Also collect legacy Convex Ids — pass those to `ctx.storage.delete` if unreferenced (during transition only; remove this branch after `--reap-convex`).
3. Paginate `r2.listObjects("public/")` and `r2.listObjects("receipts/")`.
4. Delete any R2 object whose key is not in the referenced set.

---

## 13. Free-tier safeguards (ongoing)

| Measure | Where |
|---|---|
| Reject files > 10 MB at upload | `ConvexStorageUpload.tsx` input validation |
| Reject non-image MIME types for product images | Same |
| Daily orphan sweep | `sweepJobs.ts` cron |
| Delete Convex blobs post-migration (`--reap-convex`) | Migration script |
| Monitor R2 usage dashboard weekly | Manual |

**Optional follow-ups (not in this plan — confirm before implementing):**
- Auto-delete payment receipts for `DELIVERED` orders older than 1 year.
- Delete `audit_logs` rows older than 90 days if Convex DB row count is also pressing limits.

---

## 14. Security notes

- The R2 `R2_SECRET_ACCESS_KEY` and `R2_ACCESS_KEY_ID` are stored only in the Convex dashboard as backend env vars. They are never sent to the browser.
- Presigned PUT URLs are single-use (TTL: 600 s). After upload the URL expires.
- Presigned GET URLs for receipts have TTL: 3600 s (1 hour). Each page load regenerates a fresh signed URL.
- Receipt objects under `receipts/*` are never publicly linked. Public bucket binding (if configured) serves only by exact key — unguessable UUID filenames provide the primary protection. For defense-in-depth, add a Worker filter in v1.5.
- `MIGRATION_TOKEN` is a separate secret used only by the migration script. It is set in the Convex dashboard and revoked after migration completes.
