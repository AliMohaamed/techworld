import { MetadataRoute } from 'next';
import { api } from "@backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://techworld-store.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await fetchQuery(api.products.getSitemapData);

  const productEntries: MetadataRoute.Sitemap = (data.products || []).map((p) => ({
    url: `${BASE_URL}/products/${p.slug}`,
    lastModified: p.lastModified,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const categoryEntries: MetadataRoute.Sitemap = (data.categories || []).map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    lastModified: c.lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  // Support surfaces are static but high-intent; keep them discoverable.
  const supportEntries: MetadataRoute.Sitemap = [
    { path: 'support', priority: 0.6 },
    { path: 'shipping', priority: 0.5 },
    { path: 'returns', priority: 0.5 },
    { path: 'track', priority: 0.5 },
  ].flatMap(({ path, priority }) =>
    ['en', 'ar'].map((locale) => ({
      url: `${BASE_URL}/${locale}/${path}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority,
    }))
  );

  // Deals turn over daily, so they get their own crawl cadence.
  const dealsEntries: MetadataRoute.Sitemap = ['en', 'ar'].map((locale) => ({
    url: `${BASE_URL}/${locale}/deals`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...dealsEntries,
    ...supportEntries,
    ...categoryEntries,
    ...productEntries,
  ];
}
