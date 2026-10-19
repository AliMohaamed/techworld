import { MetadataRoute } from 'next';

import { SITE_URL as BASE_URL } from '@/lib/seo';

// Checkout, success and favorites are kept out of the index with a noindex meta tag
// instead of a Disallow here: crawlers must be able to fetch a page to see its noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
