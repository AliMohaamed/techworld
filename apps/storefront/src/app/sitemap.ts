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

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...categoryEntries,
    ...productEntries,
  ];
}
