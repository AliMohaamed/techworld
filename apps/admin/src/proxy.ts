import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar'],

  // Used when no locale matches
  defaultLocale: 'en',
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /_static (inside /public)
  // - all files with an extension, at any depth (e.g. /favicon.ico, /brand/tw-mark.png)
  matcher: ['/((?!api|_next|_static|_vercel|.*\\..*).*)']
};
