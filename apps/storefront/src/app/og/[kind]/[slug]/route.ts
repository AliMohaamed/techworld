import { NextResponse } from "next/server";
import sharp from "sharp";
import { api } from "@backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { DEFAULT_OG_IMAGE, OG_IMAGE_SIZE } from "@/lib/seo";

export const runtime = "nodejs";

type Params = { params: Promise<{ kind: string; slug: string }> };

const FETCH_TIMEOUT_MS = 5_000;
/** Source photos are compressed at upload; anything bigger is not a catalog image. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Downloads `url`, giving up after the timeout or once the body passes the size cap. */
async function fetchImage(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok || !res.body) throw new Error(`source image returned ${res.status}`);

  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_IMAGE_BYTES) {
    await res.body.cancel();
    throw new Error(`source image is ${declared} bytes`);
  }

  // content-length can be missing or wrong, so enforce the cap while streaming too.
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    size += part.value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error(`source image exceeds ${MAX_IMAGE_BYTES} bytes`);
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks);
}

async function sourceImageUrl(kind: string, slug: string) {
  if (kind === "product") {
    const product = await fetchQuery(api.products.getBySlug, { slug });
    return product?.thumbnail || product?.images?.[0];
  }
  if (kind === "category") {
    // listActiveCategories already resolves storage refs to public URLs.
    const result = await fetchQuery(api.categories.listActiveCategories);
    return result?.categories.find((c) => c.slug === slug)?.thumbnailUrl ?? undefined;
  }
  return undefined;
}

/**
 * Facebook doesn't reliably render the WebP photos stored on the CDN, so this
 * re-encodes the product/category image as a 1200x630 JPG (letterboxed on
 * white). Anything missing falls back to the site-wide default OG image.
 */
export async function GET(_request: Request, { params }: Params) {
  const { kind, slug } = await params;

  try {
    const src = await sourceImageUrl(kind, slug);
    if (src) {
      const jpg = await sharp(await fetchImage(src))
        .resize(OG_IMAGE_SIZE.width, OG_IMAGE_SIZE.height, { fit: "contain", background: "#ffffff" })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();

      return new NextResponse(new Uint8Array(jpg), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }
  } catch (error) {
    console.error(`OG image failed for ${kind}/${slug}:`, error);
  }

  return NextResponse.redirect(DEFAULT_OG_IMAGE.url, 307);
}
