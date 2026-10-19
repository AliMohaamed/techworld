#!/usr/bin/env node
/**
 * Crawls the sitemap as Facebook's scraper and checks every page's Open Graph
 * tags: page 200, og:url === requested URL, og:url itself 200, canonical
 * present, og:image 200 with an image content-type.
 *
 *   node scripts/check-og.mjs [origin] [--limit N]
 *   node scripts/check-og.mjs https://www.techworldegypt.com
 *   node scripts/check-og.mjs http://localhost:3000 --limit 20
 */

const args = process.argv.slice(2);
const origin = (args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a)) || "https://www.techworldegypt.com").replace(/\/+$/, "");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;
const UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const CONCURRENCY = 6;

const get = (url, method = "GET") =>
  fetch(url, { method, redirect: "manual", headers: { "User-Agent": UA } });

function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Reads <meta property|name=key content=...> regardless of attribute order. */
function metaContent(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name)="([^"]*)"/i)?.[1];
    if (name === key) return decode(tag.match(/\bcontent="([^"]*)"/i)?.[1] ?? "");
  }
  return null;
}

function canonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (/\brel="canonical"/i.test(tag)) return decode(tag.match(/\bhref="([^"]*)"/i)?.[1] ?? "");
  }
  return null;
}

const statusCache = new Map();
function statusOf(url) {
  if (!statusCache.has(url)) {
    statusCache.set(
      url,
      get(url).then(
        async (res) => {
          // Follow redirects for images only (the OG route may fall back to the default image).
          if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
            const next = await fetch(new URL(res.headers.get("location"), url), { headers: { "User-Agent": UA } });
            return { status: next.status, type: next.headers.get("content-type"), redirected: res.status };
          }
          return { status: res.status, type: res.headers.get("content-type") };
        },
        (err) => ({ status: 0, type: null, error: err.message }),
      ),
    );
  }
  return statusCache.get(url);
}

async function checkPage(url) {
  const problems = [];
  const warnings = [];
  const res = await get(url).catch((err) => ({ status: 0, error: err }));
  if (res.status !== 200) return { url, problems: [`page status ${res.status}${res.error ? ` (${res.error.message})` : ""}`] };

  const html = await res.text();
  const ogUrl = metaContent(html, "og:url");
  const ogImage = metaContent(html, "og:image");
  const canon = canonical(html);
  const title = metaContent(html, "og:title") ?? html.match(/<title>([^<]*)<\/title>/i)?.[1];

  // Scrapers read <head>; tags streamed into <body> may be ignored.
  const headEnd = html.indexOf("</head>");
  if (ogUrl && html.indexOf('property="og:url"') > headEnd) problems.push("og tags are outside <head>");

  if (!ogUrl) problems.push("missing og:url");
  else if (ogUrl !== url) problems.push(`og:url mismatch: ${ogUrl}`);
  else {
    const self = await get(ogUrl);
    if (self.status !== 200) problems.push(`og:url returns ${self.status}`);
  }

  if (!canon) problems.push("missing canonical");
  else if (canon !== url) problems.push(`canonical mismatch: ${canon}`);

  if (!ogImage) problems.push("missing og:image");
  else if (!ogImage.startsWith("https://") && !origin.startsWith("http://localhost")) problems.push(`og:image not https: ${ogImage}`);
  else {
    const img = await statusOf(ogImage);
    if (img.status !== 200) problems.push(`og:image status ${img.status}: ${ogImage}`);
    else if (!img.type?.startsWith("image/")) problems.push(`og:image content-type ${img.type}`);
    else if (/webp/i.test(img.type)) problems.push(`og:image is WebP: ${ogImage}`);
    else if (img.redirected && /\/og\//.test(ogImage)) warnings.push(`own image unavailable, served default OG image: ${ogImage}`);
  }

  if (/404: This page could not be found/i.test(title ?? "")) problems.push("title is the 404 page");

  return { url, problems, warnings };
}

async function main() {
  const sitemapRes = await get(`${origin}/sitemap.xml`);
  if (sitemapRes.status !== 200) throw new Error(`sitemap.xml returned ${sitemapRes.status}`);
  const xml = await sitemapRes.text();
  const urls = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1].trim())))].slice(0, limit);

  const foreign = urls.filter((u) => !u.startsWith(`${origin}/`) && u !== origin);
  if (foreign.length) {
    console.error(`✗ ${foreign.length} sitemap URLs are not on ${origin}, e.g. ${foreign[0]}`);
    console.error("  (NEXT_PUBLIC_STOREFRONT_URL doesn't match the host being checked)");
    process.exitCode = 1;
    return;
  }

  console.log(`Checking ${urls.length} URLs from ${origin}/sitemap.xml as "${UA}"\n`);
  const results = [];
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    results.push(...(await Promise.all(urls.slice(i, i + CONCURRENCY).map(checkPage))));
  }

  // Unprefixed legacy links must redirect, not 404.
  const sample = urls.find((u) => /\/(en|ar)\/products\//.test(u));
  if (sample) {
    const legacy = sample.replace(/\/(en|ar)\//, "/") + "?fbclid=test&utm_source=fb";
    const res = await get(legacy);
    const location = res.headers.get("location");
    const ok = res.status === 308 && location?.includes("/en/products/") && location.includes("fbclid=test");
    results.push({ url: `${legacy} (legacy redirect)`, problems: ok ? [] : [`expected 308 to /en/... with query, got ${res.status} ${location ?? ""}`] });
  }

  const failed = results.filter((r) => r.problems.length);
  for (const r of failed) console.log(`✗ ${r.url}\n    ${r.problems.join("\n    ")}`);
  for (const r of results.filter((r) => r.warnings?.length)) console.log(`! ${r.url}\n    ${r.warnings.join("\n    ")}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
