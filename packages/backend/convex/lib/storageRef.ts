import { Id } from "../_generated/dataModel";
import * as r2 from "./r2";

/**
 * Checks if a reference string is a Cloudflare R2 reference.
 */
export function isR2Ref(ref: string): boolean {
  return typeof ref === "string" && ref.startsWith("r2:");
}

/**
 * Extracts the raw R2 key from an R2 reference string.
 */
export function r2KeyFromRef(ref: string): string {
  if (!isR2Ref(ref)) {
    throw new Error(`Invalid R2 reference: ${ref}`);
  }
  return ref.slice(3);
}

/**
 * Resolves a storage reference (either R2 or legacy Convex ID) to a HTTP URL.
 * Public R2 refs ("r2:public/*") are resolved immediately via public base URL.
 * Private R2 refs ("r2:receipts/*") are signed with a 1-hour TTL.
 * Legacy refs fallback to ctx.storage.getUrl.
 */
export async function resolveRef(
  ctx: { storage: { getUrl(id: any): Promise<string | null> } },
  ref: string | null | undefined
): Promise<string | null> {
  if (!ref) {
    return null;
  }

  if (isR2Ref(ref)) {
    const key = r2KeyFromRef(ref);
    if (key.startsWith("public/")) {
      const baseUrl = process.env.R2_PUBLIC_BASE_URL;
      if (!baseUrl) {
        throw new Error("Missing R2_PUBLIC_BASE_URL environment variable");
      }
      const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBase}/${key}`;
    } else if (key.startsWith("receipts/")) {
      // Return a signed GET URL with a 1 hour expiry
      return await r2.presignGet(key, 3600);
    } else {
      throw new Error(`Unknown R2 bucket path prefix for key: ${key}`);
    }
  }

  // Fallback to legacy Convex storage URL
  try {
    return await ctx.storage.getUrl(ref as Id<"_storage">);
  } catch (error) {
    console.error(`Error resolving legacy storage ref ${ref}:`, error);
    return null;
  }
}
