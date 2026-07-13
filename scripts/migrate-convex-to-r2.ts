import { ConvexClient } from "convex/browser";
import { AwsClient } from "aws4fetch";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { randomUUID } from "crypto";

// Load environment variables from root .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || "techworld-storage";
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
const MIGRATION_TOKEN = process.env.MIGRATION_TOKEN;

const PROGRESS_FILE = path.join(process.cwd(), "scripts/migration-progress.json");
const ERRORS_FILE = path.join(process.cwd(), "scripts/migration-errors.log");

interface ProgressEntry {
  docId: string;
  table: string;
  field: string;
  oldRef: string;
  newRef: string;
  status: "done" | "failed";
  migratedAt: number;
}

// Ensure R2 credentials and config are present
function validateConfig(requireR2 = true) {
  if (!CONVEX_URL) throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL");
  if (!MIGRATION_TOKEN) throw new Error("Missing MIGRATION_TOKEN");

  if (requireR2) {
    if (!R2_ACCOUNT_ID) throw new Error("Missing R2_ACCOUNT_ID");
    if (!R2_ACCESS_KEY_ID) throw new Error("Missing R2_ACCESS_KEY_ID");
    if (!R2_SECRET_ACCESS_KEY) throw new Error("Missing R2_SECRET_ACCESS_KEY");
  }
}

// Load migration progress
function loadProgress(): ProgressEntry[] {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    } catch {
      console.warn("Could not parse migration-progress.json, starting fresh.");
    }
  }
  return [];
}

// Save progress entry
function saveProgress(entry: ProgressEntry) {
  const progress = loadProgress();
  // Avoid duplicates
  const index = progress.findIndex(
    (p) => p.docId === entry.docId && p.field === entry.field && p.table === entry.table
  );
  if (index !== -1) {
    progress[index] = entry;
  } else {
    progress.push(entry);
  }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf-8");
}

// Log migration errors
function logError(message: string, error?: any) {
  const timestamp = new Date().toISOString();
  const errorMsg = `${timestamp} - ${message}${error ? ` - ${error.stack || JSON.stringify(error)}` : ""}\n`;
  fs.appendFileSync(ERRORS_FILE, errorMsg, "utf-8");
}

// S3 PUT operation to R2
async function uploadToR2(aws: AwsClient, key: string, buffer: ArrayBuffer, contentType: string) {
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
  const response = await aws.fetch(url, {
    method: "PUT",
    body: buffer,
    headers: {
      "Content-Type": contentType,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`R2 Upload failed for ${key}: ${response.status} ${response.statusText} - ${text}`);
  }
}

// S3 HEAD operation to verify object exists
async function verifyR2Object(aws: AwsClient, key: string): Promise<boolean> {
  const url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
  const response = await aws.fetch(url, {
    method: "HEAD",
  });
  return response.ok;
}

// Get extension from mime type
function getExtension(mimeType: string): string {
  const parts = mimeType.split("/");
  let ext = parts[parts.length - 1] || "bin";
  if (ext === "jpeg") ext = "jpg";
  // Strip any extra metadata from mime parameter e.g. "image/webp; charset=utf-8"
  ext = ext.split(";")[0].trim();
  return ext;
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verifyMode = args.includes("--verify");
  const reapMode = args.includes("--reap-convex");

  const filterTableArg = args.find((a) => a.startsWith("--filter-table="));
  const filterTable = filterTableArg ? filterTableArg.split("=")[1] : undefined;

  console.log("=== Cloudflare R2 Storage Migration ===");
  console.log(`Modes: DryRun=${dryRun}, Verify=${verifyMode}, ReapConvex=${reapMode}`);
  if (filterTable) console.log(`Filtering by table: ${filterTable}`);

  validateConfig(!verifyMode && !reapMode);

  const convex = new ConvexClient(CONVEX_URL!);
  const aws = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });

  if (verifyMode) {
    console.log("\n--- Starting Verification ---");
    const progress = loadProgress();
    const successfulEntries = progress.filter((p) => p.status === "done");
    console.log(`Loaded ${successfulEntries.length} migrated entries from progress file.`);

    let errorCount = 0;
    for (const entry of successfulEntries) {
      const key = entry.newRef.slice(3); // Remove "r2:" prefix
      try {
        const exists = await verifyR2Object(aws, key);
        if (exists) {
          console.log(`✓ VERIFIED: ${entry.table}.${entry.field} (${entry.docId}) -> ${entry.newRef}`);
        } else {
          console.error(`✗ MISSING IN R2: ${entry.table}.${entry.field} (${entry.docId}) -> ${entry.newRef}`);
          errorCount++;
        }
      } catch (err: any) {
        console.error(`✗ ERROR VERIFYING: ${entry.table}.${entry.field} (${entry.docId}) -> ${entry.newRef}`, err.message);
        errorCount++;
      }
    }

    console.log(`\nVerification complete. Errors found: ${errorCount}`);
    process.exit(errorCount > 0 ? 1 : 0);
  }

  if (reapMode) {
    console.log("\n--- Starting Convex Storage Cleanup (Reap) ---");
    const progress = loadProgress();
    const successfulEntries = progress.filter((p) => p.status === "done");
    console.log(`Loaded ${successfulEntries.length} migrated entries to reap.`);

    let reapedCount = 0;
    let failedCount = 0;

    for (const entry of successfulEntries) {
      if (entry.oldRef.startsWith("r2:")) {
        console.log(`Skipping reap for already-R2 reference: ${entry.oldRef}`);
        continue;
      }
      try {
        console.log(`Reaping legacy Convex storage ID: ${entry.oldRef}...`);
        if (!dryRun) {
          await convex.mutation("migrations:deleteLegacyConvexFile" as any, {
            storageId: entry.oldRef,
            token: MIGRATION_TOKEN!,
          });
        }
        reapedCount++;
      } catch (err: any) {
        console.error(`Failed to reap Convex file ${entry.oldRef}:`, err.message);
        failedCount++;
      }
    }
    console.log(`Reap completed. Success: ${reapedCount}, Failed: ${failedCount}`);
    process.exit(0);
  }

  // Normal migration loop
  const tables = filterTable ? [filterTable] : ["categories", "skus", "products", "orders"];

  for (const table of tables) {
    console.log(`\n--- Migrating table: ${table} ---`);
    let cursor: string | null = null;
    let hasMore = true;
    let tableMigratedCount = 0;

    while (hasMore) {
      const result: any = await convex.query("migrations:listRefsToMigrate" as any, {
        table,
        cursor,
        token: MIGRATION_TOKEN!,
      });

      console.log(`Fetched ${result.refs.length} refs to migrate.`);

      // Process concurrently (up to 4 at a time)
      const batchSize = 4;
      for (let i = 0; i < result.refs.length; i += batchSize) {
        const batch = result.refs.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (row: any) => {
            const progress = loadProgress();
            const isCompleted = progress.some(
              (p) => p.docId === row.docId && p.field === row.field && p.table === table && p.status === "done"
            );
            if (isCompleted) {
              console.log(`Skipping already migrated: ${table}.${row.field} (${row.docId})`);
              return;
            }

            console.log(`Migrating: ${table}.${row.field} (${row.docId}) - OldRef: ${row.ref}`);

            if (dryRun) {
              console.log(`[DRY RUN] Would migrate file ${row.ref}`);
              return;
            }

            try {
              // 1. Get legacy Convex storage URL
              const urls = await convex.query("storage:getStorageUrls" as any, {
                storageIds: [row.ref],
              });
              const url = urls[row.ref];
              if (!url) {
                throw new Error(`Failed to resolve storage URL for ref ${row.ref}`);
              }

              // 2. Download file
              const res = await fetch(url);
              if (!res.ok) {
                throw new Error(`Failed to fetch file from URL: ${url}. Status: ${res.status}`);
              }

              const buffer = await res.arrayBuffer();
              const contentType = res.headers.get("Content-Type") || "application/octet-stream";

              // 3. Upload to R2
              const uuid = randomUUID();
              const ext = getExtension(contentType);
              
              let keyPrefix = "public/catalog";
              if (table === "categories") keyPrefix = "public/categories";
              if (table === "skus") keyPrefix = "public/skus";
              if (table === "orders") keyPrefix = "receipts";

              const key = `${keyPrefix}/${uuid}.${ext}`;
              await uploadToR2(aws, key, buffer, contentType);
              const newRef = `r2:${key}`;

              // 4. Patch database
              let mutationName = "migrations:patchProductRef";
              if (table === "skus") mutationName = "migrations:patchSkuRef";
              if (table === "categories") mutationName = "migrations:patchCategoryRef";
              if (table === "orders") mutationName = "migrations:patchOrderReceiptRef";

              await convex.mutation(mutationName as any, {
                docId: row.docId,
                field: row.field, // only used by products mutation
                newRef,
                token: MIGRATION_TOKEN!,
              });

              // 5. Save progress
              saveProgress({
                docId: row.docId,
                table,
                field: row.field,
                oldRef: row.ref,
                newRef,
                status: "done",
                migratedAt: Date.now(),
              });

              console.log(`✓ SUCCESS: Migrated ${table}.${row.field} (${row.docId}) -> ${newRef}`);
              tableMigratedCount++;
            } catch (err: any) {
              console.error(`✗ FAILED: ${table}.${row.field} (${row.docId}):`, err.message);
              logError(`Failed to migrate ${table}.${row.field} (${row.docId})`, err);
              saveProgress({
                docId: row.docId,
                table,
                field: row.field,
                oldRef: row.ref,
                newRef: "",
                status: "failed",
                migratedAt: Date.now(),
              });
            }
          })
        );
      }

      cursor = result.nextCursor;
      hasMore = !result.isDone;
    }

    console.log(`Table ${table} migration completed. Migrated ${tableMigratedCount} files.`);
  }

  console.log("\nMigration script run complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal error in migration script:", err);
  logError("Fatal error in migration script", err);
  process.exit(1);
});
