"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import FilterDrawer from "@/components/storefront/filter-drawer";
import LoadMoreButton from "@/components/storefront/load-more-button";
import ProductCard from "@/components/storefront/product-card";

type CatalogExplorerProps = {
  lockedCategoryId?: string;
};

export default function CatalogExplorer({
  lockedCategoryId,
}: CatalogExplorerProps) {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("searchQuery") ?? undefined;
  const minPriceValue = searchParams.get("minPrice");
  const maxPriceValue = searchParams.get("maxPrice");
  const sortOrderValue = searchParams.get("sortOrder");
  const categoryId = lockedCategoryId ?? searchParams.get("categoryId") ?? undefined;
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
    ? category?.name_en ?? "Category"
    : "Catalog Explorer";
  const eyebrow = lockedCategoryId ? "Category Focus" : "Advanced Catalog";
  const description = lockedCategoryId
    ? category?.description_en ?? "This category route is locked to the selected collection."
    : "Search, filter, and page through the live storefront catalog without losing your place.";

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,#2b2b2b,transparent_50%),linear-gradient(180deg,#111111,#050505)] px-6 py-10 md:px-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ffc105]">
              {eyebrow}
            </p>
            <h1 className="font-space-grotesk text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
              {heading}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
              {description}
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <FilterDrawer lockedCategoryId={lockedCategoryId} />

          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-zinc-950/70 px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
                  Current Results
                </p>
                <p className="font-space-grotesk text-lg font-black uppercase tracking-tight text-white">
                  {results.length} products loaded
                </p>
              </div>
              {searchQuery && (
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Search: <span className="text-white">{searchQuery}</span>
                </p>
              )}
            </div>

            {results.length === 0 && status === "Exhausted" ? (
              <div className="space-y-8">
                <div className="rounded-[28px] border border-dashed border-white/10 bg-zinc-950/60 px-6 py-10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
                    Empty State
                  </p>
                  <h2 className="mt-3 font-space-grotesk text-3xl font-black uppercase tracking-tight text-white">
                    No products found
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                    Adjust the active filters or clear them to widen the catalog. Recommended products stay visible below so the page never dead-ends.
                  </p>
                </div>

                {recommendationResult?.products?.length ? (
                  <section className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ffc105]">
                      Recommended Products
                    </p>
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                      {recommendationResult.products.map((product) => (
                        <ProductCard key={product._id} product={product} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {results.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                <div className="flex justify-center">
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




