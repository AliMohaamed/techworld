import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://techworld-store.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/checkout',
          '/checkout-success',
          '/api/',
          '/_next/',
          '/orders/', // Private order status pages
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
