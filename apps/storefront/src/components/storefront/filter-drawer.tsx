"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Funnel, Search, SlidersHorizontal, X } from "lucide-react";
import { api } from "@backend/convex/_generated/api";

type FilterDrawerProps = {
  lockedCategoryId?: string;
};

type DraftFilters = {
  searchQuery: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  sortOrder: string;
};

const getDraftFilters = (
  searchParams: ReturnType<typeof useSearchParams>,
  lockedCategoryId?: string,
): DraftFilters => ({
  searchQuery: searchParams.get("searchQuery") ?? "",
  categoryId: lockedCategoryId ?? searchParams.get("categoryId") ?? "",
  minPrice: searchParams.get("minPrice") ?? "",
  maxPrice: searchParams.get("maxPrice") ?? "",
  sortOrder: searchParams.get("sortOrder") ?? "newest",
});

export default function FilterDrawer({ lockedCategoryId }: FilterDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryResult = useQuery(api.categories.listActiveCategories);
  const categories = categoryResult?.categories ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFilters>(() =>
    getDraftFilters(searchParams, lockedCategoryId),
  );

  useEffect(() => {
    setDraft(getDraftFilters(searchParams, lockedCategoryId));
  }, [lockedCategoryId, searchParams]);

  const updateDraft = (key: keyof DraftFilters, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const pushFilters = (nextDraft: DraftFilters) => {
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value: string) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    };

    setOrDelete("searchQuery", nextDraft.searchQuery.trim());
    setOrDelete("minPrice", nextDraft.minPrice.trim());
    setOrDelete("maxPrice", nextDraft.maxPrice.trim());

    if (nextDraft.sortOrder && nextDraft.sortOrder !== "newest") {
      params.set("sortOrder", nextDraft.sortOrder);
    } else {
      params.delete("sortOrder");
    }

    if (lockedCategoryId) {
      params.set("categoryId", lockedCategoryId);
    } else {
      setOrDelete("categoryId", nextDraft.categoryId);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const applyFilters = () => {
    pushFilters(draft);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const cleared = {
      searchQuery: "",
      categoryId: lockedCategoryId ?? "",
      minPrice: "",
      maxPrice: "",
      sortOrder: "newest",
    };

    setDraft(cleared);
    pushFilters(cleared);
    setIsOpen(false);
  };

  const desktopPanel = (
    <div className="hidden lg:block">
      <div className="sticky top-24 space-y-6 rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 backdrop-blur">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ffc105]">
            Refine Catalog
          </p>
          <h2 className="font-space-grotesk text-2xl font-black uppercase tracking-tight text-white">
            Filters
          </h2>
        </div>
        <FilterFields
          categories={categories}
          draft={draft}
          lockedCategoryId={lockedCategoryId}
          onChange={updateDraft}
        />
        <FilterActions onApply={applyFilters} onClear={clearFilters} />
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-4 py-3 font-space-grotesk text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:border-[#ffc105]/40 hover:text-[#ffc105]"
        >
          <Funnel size={16} />
          Filters
        </button>
      </div>

      {desktopPanel}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-white/10 bg-zinc-950 px-5 pb-8 pt-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ffc105]">
                  Mobile Drawer
                </p>
                <h2 className="font-space-grotesk text-2xl font-black uppercase tracking-tight text-white">
                  Filter Products
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 p-2 text-zinc-400 transition-colors hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <FilterFields
              categories={categories}
              draft={draft}
              lockedCategoryId={lockedCategoryId}
              onChange={updateDraft}
            />
            <div className="mt-6">
              <FilterActions onApply={applyFilters} onClear={clearFilters} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterFields({
  categories,
  draft,
  lockedCategoryId,
  onChange,
}: {
  categories: {
    _id: string;
    name_en: string;
    name_ar: string;
  }[];
  draft: DraftFilters;
  lockedCategoryId?: string;
  onChange: (key: keyof DraftFilters, value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <label className="block space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Search
        </span>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
          <Search size={16} className="text-zinc-500" />
          <input
            value={draft.searchQuery}
            onChange={(event) => onChange("searchQuery", event.target.value)}
            placeholder="Search products"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </label>

      <label className="block space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Category
        </span>
        <select
          value={draft.categoryId}
          onChange={(event) => onChange("categoryId", event.target.value)}
          disabled={Boolean(lockedCategoryId)}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name_en}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            Min Price
          </span>
          <input
            value={draft.minPrice}
            onChange={(event) => onChange("minPrice", event.target.value)}
            inputMode="numeric"
            placeholder="0"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
            Max Price
          </span>
          <input
            value={draft.maxPrice}
            onChange={(event) => onChange("maxPrice", event.target.value)}
            inputMode="numeric"
            placeholder="Any"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          <SlidersHorizontal size={14} />
          Sort
        </span>
        <select
          value={draft.sortOrder}
          onChange={(event) => onChange("sortOrder", event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
        >
          <option value="newest">Newest arrivals</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
      </label>
    </div>
  );
}

function FilterActions({
  onApply,
  onClear,
}: {
  onApply: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClear}
        className="flex-1 rounded-2xl border border-white/10 px-4 py-3 font-space-grotesk text-xs font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
      >
        Clear
      </button>
      <button
        type="button"
        onClick={onApply}
        className="flex-1 rounded-2xl bg-[#ffc105] px-4 py-3 font-space-grotesk text-xs font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        Apply
      </button>
    </div>
  );
}




