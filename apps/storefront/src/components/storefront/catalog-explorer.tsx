"use client";

import { useEffect, useRef } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import FilterDrawer from "@/components/storefront/filter-drawer";
import ProductCard from "@/components/storefront/product-card";
import { useTranslations, useLocale } from "next-intl";
import { Loader2 } from "lucide-react";

type CatalogExplorerProps = {
  lockedCategoryId?: string;
};

export default function CatalogExplorer({
  lockedCategoryId,
}: CatalogExplorerProps) {
  const t = useTranslations("CatalogExplorer");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const searchQuery = searchParams.get("searchQuery") ?? undefined;
  const minPriceValue = searchParams.get("minPrice");
  const maxPriceValue = searchParams.get("maxPrice");
  const sortOrderValue = searchParams.get("sortOrder");
  const categoryId =
    lockedCategoryId ?? searchParams.get("categoryId") ?? undefined;

  const category = useQuery(
    api.categories.getCategoryById,
    lockedCategoryId ? { id: lockedCategoryId as Id<"categories"> } : "skip",
  );

  const minPrice =
    minPriceValue && !Number.isNaN(Number(minPriceValue))
      ? Number(minPriceValue)
      : undefined;
  const maxPrice =
    maxPriceValue && !Number.isNaN(Number(maxPriceValue))
      ? Number(maxPriceValue)
      : undefined;
  const sortOrder =
    sortOrderValue === "price_asc" ||
    sortOrderValue === "price_desc" ||
    sortOrderValue === "newest"
      ? sortOrderValue
      : undefined;

  const { results, status, loadMore } = usePaginatedQuery(
    api.products.searchAndFilter,
    {
      categoryId: categoryId ? (categoryId as Id<"categories">) : undefined,
      minPrice,
      maxPrice,
      sortOrder,
      searchQuery,
    },
    { initialNumItems: 12 },
  );

  useEffect(() => {
    if (status !== "CanLoadMore") return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore(12);
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [status, loadMore]);

  const recommendationResult = useQuery(
    api.products.getRecommendedProducts,
    results.length === 0 && status === "Exhausted" ? {} : "skip",
  );

  const heading = lockedCategoryId
    ? ((locale === "en" ? category?.name_en : category?.name_ar) ??
      t("locked.defaultHeading"))
    : t("global.heading");

  const eyebrow = lockedCategoryId ? t("locked.eyebrow") : t("global.eyebrow");

  const description = lockedCategoryId
    ? ((locale === "en"
        ? category?.description_en
        : category?.description_ar) ?? t("locked.defaultDescription"))
    : t("global.description");

  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-2xl border border-border bg-card/30 px-6 py-10 md:px-10 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent" />

          <div className="relative max-w-2xl space-y-4">
            <p className="text-xs font-bold tracking-wider text-primary uppercase">
              {eyebrow}
            </p>
            <h1 className="font-space-grotesk text-3xl font-bold tracking-tight text-foreground md:text-5xl md:leading-[1.1]">
              {heading}
            </h1>
            <p className="max-w-xl text-sm leading-7 text-label-muted md:text-base">
              {description}
            </p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <FilterDrawer lockedCategoryId={lockedCategoryId} />

          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 px-6 py-4 backdrop-blur-sm">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold tracking-wider text-label-muted uppercase">
                  {t("results.eyebrow")}
                </p>
                <p className="font-space-grotesk text-lg font-bold tracking-tight text-foreground">
                  {t("results.count", { count: results.length })}
                </p>
              </div>
              {searchQuery && (
                <div className="px-4 py-1.5 rounded-md bg-accent border border-border">
                  <p className="text-[11px] font-semibold tracking-wide text-label-muted uppercase">
                    {t("results.search", { query: searchQuery })}
                  </p>
                </div>
              )}
            </div>

            {results.length === 0 && status === "Exhausted" ? (
              <div className="space-y-10">
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-8 py-16 text-center">
                  <p className="text-[10px] font-semibold tracking-wider text-label-muted/40 uppercase">
                    {t("empty.eyebrow")}
                  </p>
                  <h2 className="mt-3 font-space-grotesk text-3xl font-bold tracking-tight text-foreground">
                    {t("empty.title")}
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-label-muted">
                    {t("empty.description")}
                  </p>
                </div>

                {recommendationResult?.products?.length ? (
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-0.5 w-8 bg-primary rounded-full" />
                      <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                        {t("recommended.eyebrow")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
                      {recommendationResult.products.map((product) => (
                        <ProductCard
                          key={product._id}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex query return type
                          product={product as any}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard key={product._id} product={product as any} // eslint-disable-line @typescript-eslint/no-explicit-any -- Convex query return type
                    />
                  ))}
                </div>

                <div className="flex justify-center pt-6" ref={loadMoreRef}>
                  {status === "LoadingMore" ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}