"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import FilterDrawer from "@/components/storefront/filter-drawer";
import LoadMoreButton from "@/components/storefront/load-more-button";
import ProductCard from "@/components/storefront/product-card";
import { useTranslations, useLocale } from "next-intl";

type CatalogExplorerProps = {
  lockedCategoryId?: string;
};

export default function CatalogExplorer({
  lockedCategoryId,
}: CatalogExplorerProps) {
  const t = useTranslations("CatalogExplorer");
  const locale = useLocale();
  const searchParams = useSearchParams();
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
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="overflow-hidden rounded-[32px] border border-border bg-card/30 dark:bg-[radial-gradient(circle_at_top,#2b2b2b,transparent_50%),linear-gradient(180deg,#111111,#050505)] px-6 py-12 md:px-12   relative">
          {/* Light mode decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden" />

          <div className="relative max-w-3xl space-y-6">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
              {eyebrow}
            </p>
            <h1 className="font-space-grotesk text-4xl font-black uppercase tracking-tight text-foreground md:text-6xl md:leading-[1.1]">
              {heading}
            </h1>
            <p className="max-w-2xl text-sm leading-8 text-muted-foreground md:text-lg font-light">
              {description}
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <FilterDrawer lockedCategoryId={lockedCategoryId} />

          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] border border-border bg-secondary/50 ltr:px-8 rtl:px-8 py-5   backdrop-blur-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/50">
                  {t("results.eyebrow")}
                </p>
                <p className="font-space-grotesk text-xl font-black uppercase tracking-tight text-foreground">
                  {t("results.count", { count: results.length })}
                </p>
              </div>
              {searchQuery && (
                <div className="px-5 py-2 rounded-full bg-accent border border-border">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {t("results.search", { query: searchQuery })}
                  </p>
                </div>
              )}
            </div>

            {results.length === 0 && status === "Exhausted" ? (
              <div className="space-y-12">
                <div className="rounded-[32px] border border-dashed border-border bg-secondary/30 px-8 py-16 text-center  ">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/40">
                    {t("empty.eyebrow")}
                  </p>
                  <h2 className="mt-4 font-space-grotesk text-4xl font-black uppercase tracking-tight text-foreground">
                    {t("empty.title")}
                  </h2>
                  <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-muted-foreground font-light">
                    {t("empty.description")}
                  </p>
                </div>

                {recommendationResult?.products?.length ? (
                  <section className="space-y-8">
                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                      <div className="h-0.5 w-12 bg-[#ffc105]" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                        {t("recommended.eyebrow")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-4">
                      {recommendationResult.products.map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product as any}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard key={product._id} product={product as any} />
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  {status === "LoadingMore" || status === "CanLoadMore" ? (
                    <LoadMoreButton
                      disabled={status === "LoadingMore"}
                      onClick={() => {
                        loadMore(12);
                      }}
                    />
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
