"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type CatalogParamKey =
  | "searchQuery"
  | "categoryId"
  | "minPrice"
  | "maxPrice"
  | "sortOrder";

export type CatalogParamPatch = Partial<Record<CatalogParamKey, string | undefined>>;

/**
 * Single source of truth for catalog filters: they live in the URL so results
 * are shareable and survive reloads. Empty values remove the param.
 */
export function useCatalogParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (patch: CatalogParamPatch, { replace = false }: { replace?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        const trimmed = value?.trim();
        if (trimmed) {
          params.set(key, trimmed);
        } else {
          params.delete(key);
        }
      }

      const queryString = params.toString();
      const href = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        if (replace) {
          router.replace(href, { scroll: false });
        } else {
          router.push(href, { scroll: false });
        }
      });
    },
    [pathname, router, searchParams],
  );

  return { searchParams, update, isPending };
}
