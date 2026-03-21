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
  const t = useTranslations('FilterDrawer');
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
      <div className="sticky top-24 space-y-8 rounded-[32px] border border-white/10 bg-zinc-950/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
            {t('desktop.badge')}
          </p>
          <h2 className="font-space-grotesk text-3xl font-black uppercase tracking-tight text-white leading-none">
            {t('desktop.title')}
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
          className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950 px-6 py-4 font-space-grotesk text-xs font-black uppercase tracking-[0.25em] text-white transition-all hover:border-[#ffc105]/40 hover:text-[#ffc105] shadow-xl active:scale-[0.98]"
        >
          <Funnel size={18} className="text-[#ffc105]" />
          {t('mobile.button')}
        </button>
      </div>

      {desktopPanel}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 lg:hidden animate-in fade-in duration-300">
          <button
            type="button"
            aria-label={t('mobile.closeAria')}
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[40px] border-t border-white/10 bg-zinc-950 px-8 pb-12 pt-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500">
            <div className="mb-8 flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                  {t('mobile.badge')}
                </p>
                <h2 className="font-space-grotesk text-3xl font-black uppercase tracking-tight text-white">
                  {t('mobile.title')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/10 p-3 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
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
              <FilterActions onApply={applyFilters} onClear={clearFilters} t={t} />
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
        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 block px-1">
          {t('labels.search')}
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/60 px-5 py-4 focus-within:border-[#ffc105]/30 transition-colors shadow-inner">
          <Search size={18} className="text-zinc-600" />
          <input
            value={draft.searchQuery}
            onChange={(event) => onChange("searchQuery", event.target.value)}
            placeholder={t('placeholders.search')}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-700 font-medium"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 block px-1">
          {t('labels.category')}
        </label>
        <div className="relative">
          <select
            value={draft.categoryId}
            onChange={(event) => onChange("categoryId", event.target.value)}
            disabled={Boolean(lockedCategoryId)}
            className="w-full rounded-2xl border border-white/5 bg-black/60 px-5 py-4 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-40 appearance-none shadow-inner"
          >
            <option value="">{t('options.allCategories')}</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id} className="bg-zinc-900">
                {locale === 'en' ? category.name_en : category.name_ar}
              </option>
            ))}
          </select>
          {!lockedCategoryId && (
            <div className="pointer-events-none absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-zinc-600">
              <SlidersHorizontal size={14} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 block px-1">
            {t('labels.minPrice')}
          </label>
          <div className="relative">
             <input
               value={draft.minPrice}
               onChange={(event) => onChange("minPrice", event.target.value)}
               inputMode="numeric"
               placeholder="0"
               className="w-full rounded-2xl border border-white/5 bg-black/60 px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-800 shadow-inner font-mono"
             />
             <span className="absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600">EGP</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 block px-1">
            {t('labels.maxPrice')}
          </label>
          <div className="relative">
             <input
               value={draft.maxPrice}
               onChange={(event) => onChange("maxPrice", event.target.value)}
               inputMode="numeric"
               placeholder={t('placeholders.maxPrice')}
               className="w-full rounded-2xl border border-white/5 bg-black/60 px-5 py-4 text-sm text-white outline-none placeholder:text-zinc-800 shadow-inner font-mono"
             />
             <span className="absolute ltr:right-5 rtl:left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-600">EGP</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 px-1">
          <SlidersHorizontal size={14} />
          {t('labels.sort')}
        </label>
        <select
          value={draft.sortOrder}
          onChange={(event) => onChange("sortOrder", event.target.value)}
          className="w-full rounded-2xl border border-white/5 bg-black/60 px-5 py-4 text-sm text-white outline-none appearance-none shadow-inner"
        >
          <option value="newest" className="bg-zinc-900">{t('options.sort.newest')}</option>
          <option value="price_asc" className="bg-zinc-900">{t('options.sort.price_asc')}</option>
          <option value="price_desc" className="bg-zinc-900">{t('options.sort.price_desc')}</option>
        </select>
      </div>
    </div>
  );
}

function FilterActions({
  onApply,
  onClear,
  t
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
        className="flex-1 rounded-2xl border border-white/10 px-6 py-4 font-space-grotesk text-xs font-black uppercase tracking-[0.25em] text-zinc-500 transition-all hover:border-white/20 hover:text-white hover:bg-white/5 active:scale-[0.98]"
      >
        {t('actions.clear')}
      </button>
      <button
        type="button"
        onClick={onApply}
        className="flex-1 rounded-2xl bg-[#ffc105] px-6 py-4 font-space-grotesk text-xs font-black uppercase tracking-[0.25em] text-black transition-all hover:bg-white shadow-[0_4px_20px_rgba(255,193,5,0.2)] active:scale-[0.98]"
      >
        {t('actions.apply')}
      </button>
    </div>
  );
}
