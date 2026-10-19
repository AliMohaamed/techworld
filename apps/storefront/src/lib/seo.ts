import type { Metadata } from "next";

/**
 * Single source of truth for the public origin. Must be the production
 * canonical host (with www): Facebook scrapes og:url, so a host or path that
 * doesn't resolve to a 200 page breaks every share and ad preview.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://www.techworldegypt.com").replace(/\/+$/, "");

export const SITE_NAME = "TechWorld";
export const LOCALES = ["en", "ar"] as const;
export const DEFAULT_LOCALE = "en";
export type Locale = (typeof LOCALES)[number];

const OG_LOCALES: Record<Locale, string> = { en: "en_US", ar: "ar_EG" };

/** 1200x630 JPG used whenever a page has no image of its own. */
export const DEFAULT_OG_IMAGE = { url: `${SITE_URL}/og-default.jpg`, width: 1200, height: 630 };

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function absoluteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute URL of `path` (no locale, e.g. "/products/x" or "/") under `locale`. */
export function localizedUrl(locale: string, path = "/") {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return absoluteUrl(`/${locale}${clean}`);
}

type PageSeo = {
  locale: string;
  /** Path without the locale prefix, e.g. "/products/j36" or "/". */
  path: string;
  title?: string;
  description?: string;
  image?: { url: string; width?: number; height?: number; alt?: string };
};

/**
 * canonical + hreflang + Open Graph + Twitter metadata for one localized page.
 * Child metadata replaces (not merges) the parent's openGraph object, so every
 * page must spread this rather than relying on the root layout.
 */
export function pageMetadata({ locale, path, title, description, image }: PageSeo): Metadata {
  const ogLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const url = localizedUrl(ogLocale, path);
  const ogImage = image ?? DEFAULT_OG_IMAGE;

  return {
    alternates: {
      canonical: url,
      languages: {
        en: localizedUrl("en", path),
        ar: localizedUrl("ar", path),
        "x-default": localizedUrl(DEFAULT_LOCALE, path),
      },
    },
    openGraph: {
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALES[ogLocale],
      alternateLocale: LOCALES.filter((l) => l !== ogLocale).map((l) => OG_LOCALES[l]),
      // Next can only emit og:type values it knows, and "product" isn't one of them.
      type: "website",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      images: [ogImage.url],
    },
  };
}
