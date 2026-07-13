# Convex → Cloudflare R2 Migration Runner Instructions

This runner script migrates all legacy Convex storage files to Cloudflare R2. It downloads each legacy reference from Convex, uploads it to R2, and updates the database record with the new `"r2:"` reference string. The migration is designed to run with **zero downtime**.

## Prerequisites

1. Set up your Cloudflare R2 bucket and configure environment variables in your Convex dashboard (Phase 0).
2. Deploy backend changes (Phases 1-5).
3. The script reads credentials from your local `.env.local` file (already fully populated in this workspace!).

## Running the Script

All commands should be executed from the project root directory.

### 1. Dry Run (Recommended First Step)
Check how many legacy files are pending migration across all tables without modifying anything:
```bash
npx ts-node scripts/migrate-convex-to-r2.ts --dry-run
```

### 2. Small Single-Table Test
Run the migration on a single table (e.g. `categories`) to confirm that uploads and database patches succeed:
```bash
npx ts-node scripts/migrate-convex-to-r2.ts --filter-table=categories
```
* Verify that objects now appear in your R2 dashboard under `public/categories/`.
* Confirm that thumbnails still render in your storefront/admin apps.

### 3. Full Migration
Run the script without flags to migrate all legacy files in `categories`, `skus`, `products`, and `orders`:
```bash
npx ts-node scripts/migrate-convex-to-r2.ts
```
* Any transient network failures are logged to `scripts/migration-errors.log`.
* The script is completely **idempotent** and can be run multiple times safely. It will resume exactly where it was stopped.

### 4. Verify R2 Integrity
Check that all successfully migrated references in `scripts/migration-progress.json` exist and are accessible on Cloudflare R2:
```bash
npx ts-node scripts/migrate-convex-to-r2.ts --verify
```
* Ensure it exits with **0 errors**.

### 5. Reap Convex Storage (Post-Migration Cleanup)
Only after `--verify` succeeds with **0 errors**, delete all migrated legacy files from Convex storage to free up space:
```bash
npx ts-node scripts/migrate-convex-to-r2.ts --reap-convex
```
