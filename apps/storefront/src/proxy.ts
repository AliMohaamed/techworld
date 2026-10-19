import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/seo';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: [...LOCALES],

  // Used when no locale matches
  defaultLocale: DEFAULT_LOCALE
});

const LOCALE_PREFIX = new RegExp(`^/(${LOCALES.join('|')})(/|$)`);

export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Old or shared links without a locale (e.g. /products/x?fbclid=...) used to 404,
  // which is what Facebook showed in previews. Send them permanently to the default
  // locale, keeping the query string. "/" stays with next-intl's locale detection.
  if (pathname !== '/' && !LOCALE_PREFIX.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  return intlMiddleware(request);
}

export const config = {
  // Everything except API routes, Next internals, OG image routes, the maintenance
  // page and files with an extension (sitemap.xml, robots.txt, images, ...).
  // Prefixes end in "/" (or "$") so pages like /apple-watch still get redirected.
  matcher: ['/((?!api/|api$|_next/|_vercel/|og/|maintenance$|.*\\..*).*)']
};
