import { ConvexClient } from "convex/browser";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = new ConvexClient(CONVEX_URL!);
  
  const result = await client.query("migrations:listRefsToMigrate" as any, {
    table: "categories",
    cursor: null,
    token: process.env.MIGRATION_TOKEN!,
  });
  
  console.log("Query Result:", JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
