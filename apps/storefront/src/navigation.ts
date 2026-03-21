import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'ar'] as const;
export const localePrefix = 'always'; // or 'as-needed'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation({ locales, localePrefix });
