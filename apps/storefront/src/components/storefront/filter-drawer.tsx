"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Funnel, Search, SlidersHorizontal, X } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { useTranslations, useLocale } from "next-intl";

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
  const t = useTranslations("FilterDrawer");
  const locale = useLocale();
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
      <div className="sticky top-24 space-y-8 rounded-[32px] border border-border bg-card/60 p-8   backdrop-blur-xl transition-colors">
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#ffc105]">
            {t("desktop.badge")}
          </p>
          <h2 className="font-space-grotesk text-3xl font-bold tracking-tight text-foreground leading-none">
            {t("desktop.title")}
          </h2>
        </div>
        <FilterFields
          categories={categories}
          draft={draft}
          lockedCategoryId={lockedCategoryId}
          onChange={updateDraft}
          t={t}
          locale={locale}
        />
        <FilterActions onApply={applyFilters} onClear={clearFilters} t={t} />
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 font-space-grotesk text-xs font-bold text-foreground transition-all hover:border-[#ffc105]/40 hover:text-[#ffc105]   active:scale-[0.98]"
        >
          <Funnel size={18} className="text-[#ffc105]" />
          {t("mobile.button")}
        </button>
      </div>

      {desktopPanel}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md lg:hidden animate-in fade-in duration-300">
          <button
            type="button"
            aria-label={t("mobile.closeAria")}
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[40px] border-t border-border bg-card px-8 pb-12 pt-8 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500">
            <div className="mb-8 flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold text-[#ffc105]">
                  {t("mobile.badge")}
                </p>
                <h2 className="font-space-grotesk text-3xl font-bold tracking-tight text-foreground">
                  {t("mobile.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-border p-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            <FilterFields
              categories={categories}
              draft={draft}
              lockedCategoryId={lockedCategoryId}
              onChange={updateDraft}
              t={t}
              locale={locale}
            />
            <div className="mt-10">
              <FilterActions
                onApply={applyFilters}
                onClear={clearFilters}
                t={t}
              />
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
  t,
  locale,
}: {
  categories: {
    _id: string;
    name_en: string;
    name_ar: string;
  }[];
  draft: DraftFilters;
  lockedCategoryId?: string;
  onChange: (key: keyof DraftFilters, value: string) => void;
  t: any;
  locale: string;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground/60 block px-1 uppercase">
          {t("labels.search")}
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 focus-within:border-[#ffc105]/30 transition-colors  ">
          <Search size={18} className="text-muted-foreground/50" />
          <input
            value={draft.searchQuery}
            onChange={(event) => onChange("searchQuery", event.target.value)}
            placeholder={t("placeholders.search")}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/30 font-medium"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground/60 block px-1 uppercase">
          {t("labels.category")}
        </label>
        <div className="relative">
          <select
            value={draft.categoryId}
            onChange={(event) => onChange("categoryId", event.target.value)}
            disabled={Boolean(lockedCategoryId)}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-40 appearance-none   transition-colors"
          >
            <option value="" className="bg-card">
              {t("options.allCategories")}
            </option>
            {categories.map((category) => (
              <option
                key={category._id}
                value={category._id}
                className="bg-card text-foreground"
              >
                {locale === "en" ? category.name_en : category.name_ar}
              </option>
            ))}
          </select>
          {!lockedCategoryId && (
            <div className="pointer-events-none absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              <SlidersHorizontal size={14} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground/60 block px-1 uppercase">
            {t("labels.minPrice")}
          </label>
          <div className="relative">
            <input
              value={draft.minPrice}
              onChange={(event) => onChange("minPrice", event.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/30   font-mono transition-colors"
            />
            <span className="absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/40">
              EGP
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground/60 block px-1 uppercase">
            {t("labels.maxPrice")}
          </label>
          <div className="relative">
            <input
              value={draft.maxPrice}
              onChange={(event) => onChange("maxPrice", event.target.value)}
              inputMode="numeric"
              placeholder={t("placeholders.maxPrice")}
              className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/30   font-mono transition-colors"
            />
            <span className="absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/40">
              EGP
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60 px-1 uppercase">
          <SlidersHorizontal size={14} />
          {t("labels.sort")}
        </label>
        <div className="relative">
          <select
            value={draft.sortOrder}
            onChange={(event) => onChange("sortOrder", event.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground outline-none appearance-none   transition-colors"
          >
            <option value="newest" className="bg-card">
              {t("options.sort.newest")}
            </option>
            <option value="price_asc" className="bg-card">
              {t("options.sort.price_asc")}
            </option>
            <option value="price_desc" className="bg-card">
              {t("options.sort.price_desc")}
            </option>
          </select>
          <div className="pointer-events-none absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            <SlidersHorizontal size={14} className="rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterActions({
  onApply,
  onClear,
  t,
}: {
  onApply: () => void;
  onClear: () => void;
  t: any;
}) {
  return (
    <div className="flex gap-4">
      <button
        type="button"
        onClick={onClear}
        className="flex-1 rounded-2xl border border-border px-6 py-4 font-space-grotesk text-xs font-bold text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground hover:bg-accent active:scale-[0.98]"
      >
        {t("actions.clear")}
      </button>
      <button
        type="button"
        onClick={onApply}
        className="flex-1 rounded-2xl bg-[#ffc105] px-6 py-4 font-space-grotesk text-xs font-bold text-black transition-all hover:bg-foreground hover:text-background shadow-[0_4px_20px_rgba(255,193,5,0.2)] active:scale-[0.98]"
      >
        {t("actions.apply")}
      </button>
    </div>
  );
}
