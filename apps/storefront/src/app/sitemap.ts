import { MetadataRoute } from 'next';
import { api } from "@backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { LOCALES, localizedUrl } from '@/lib/seo';

type Entry = Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>;

/** One entry per locale for `path`, each listing its en/ar hreflang siblings. */
function localizedEntries(path: string, entry: Entry): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(LOCALES.map((locale) => [locale, localizedUrl(locale, path)]));
  return LOCALES.map((locale) => ({
    url: localizedUrl(locale, path),
    alternates: { languages },
    ...entry,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchQuery(api.products.getSitemapData);

  const productEntries: MetadataRoute.Sitemap = (data.products || []).flatMap((p) =>
    localizedEntries(`/products/${p.slug}`, {
      lastModified: p.lastModified,
      changeFrequency: 'daily',
      priority: 0.7,
    })
  );

  const categoryEntries: MetadataRoute.Sitemap = (data.categories || []).flatMap((c) =>
    localizedEntries(`/categories/${c.slug}`, {
      lastModified: c.lastModified,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  );

  // Support surfaces are static but high-intent; keep them discoverable.
  const supportEntries: MetadataRoute.Sitemap = [
    { path: 'support', priority: 0.6 },
    { path: 'shipping', priority: 0.5 },
    { path: 'returns', priority: 0.5 },
    { path: 'track', priority: 0.5 },
    { path: 'privacy', priority: 0.3 },
  ].flatMap(({ path, priority }) =>
    localizedEntries(`/${path}`, {
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority,
    })
  );

  // Deals turn over daily, so they get their own crawl cadence.
  const dealsEntries = localizedEntries('/deals', {
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  });

  return [
    ...localizedEntries('/', {
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    }),
    ...dealsEntries,
    ...supportEntries,
    ...categoryEntries,
    ...productEntries,
  ];
}
