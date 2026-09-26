"use client";

import { useEffect, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { Funnel, SlidersHorizontal, X } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { useTranslations, useLocale } from "next-intl";
import { useCatalogParams } from "@/lib/use-catalog-params";

type FilterDrawerProps = {
  lockedCategoryId?: string;
  /** Mobile sheet visibility; the trigger lives in the catalog toolbar. */
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

// Search is not a drawer field: it's applied live by <CatalogSearch />.
type DraftFilters = {
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  sortOrder: string;
};

const getDraftFilters = (
  searchParams: ReadonlyURLSearchParams,
  lockedCategoryId?: string,
): DraftFilters => ({
  categoryId: lockedCategoryId ?? searchParams.get("categoryId") ?? "",
  minPrice: searchParams.get("minPrice") ?? "",
  maxPrice: searchParams.get("maxPrice") ?? "",
  sortOrder: searchParams.get("sortOrder") ?? "newest",
});

export function FilterDrawerTrigger({ onClick }: { onClick: () => void }) {
  const t = useTranslations("FilterDrawer");

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-xl border border-border bg-card px-4 font-space-grotesk text-xs font-bold text-foreground transition-all hover:border-primary/30 hover:text-primary active:scale-[0.98] sm:px-5 lg:hidden"
    >
      <Funnel size={16} className="text-primary" />
      {t("mobile.button")}
    </button>
  );
}

export default function FilterDrawer({
  lockedCategoryId,
  isOpen,
  onOpenChange,
}: FilterDrawerProps) {
  const t = useTranslations("FilterDrawer");
  const locale = useLocale();
  const { searchParams, update } = useCatalogParams();
  const categoryResult = useQuery(api.categories.listActiveCategories);
  const categories = categoryResult?.categories ?? [];
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
    update({
      categoryId: lockedCategoryId ?? nextDraft.categoryId,
      minPrice: nextDraft.minPrice,
      maxPrice: nextDraft.maxPrice,
      sortOrder: nextDraft.sortOrder !== "newest" ? nextDraft.sortOrder : undefined,
    });
  };

  const applyFilters = () => {
    pushFilters(draft);
    onOpenChange(false);
  };

  const clearFilters = () => {
    const cleared = {
      categoryId: lockedCategoryId ?? "",
      minPrice: "",
      maxPrice: "",
      sortOrder: "newest",
    };

    setDraft(cleared);
    pushFilters(cleared);
    onOpenChange(false);
  };

  const desktopPanel = (
    <div className="hidden lg:block">
      <div className="sticky top-24 space-y-6 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
        <div className="space-y-2">
          <p className="text-xs font-bold text-primary">
            {t("desktop.badge")}
          </p>
          <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground leading-none">
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
      {desktopPanel}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200">
          <button
            type="button"
            aria-label={t("mobile.closeAria")}
            className="absolute inset-0"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card px-6 pb-10 pt-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="mb-6 flex items-center justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-primary">
                  {t("mobile.badge")}
                </p>
                <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground">
                  {t("mobile.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-border p-2.5 text-label-muted transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={18} />
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
            <div className="mt-8">
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
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-label-muted block px-1 uppercase tracking-wider">{t("labels.category")}</label>
        <div className="relative">
          <select
            value={draft.categoryId}
            onChange={(event) => onChange("categoryId", event.target.value)}
            disabled={Boolean(lockedCategoryId)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-40 appearance-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
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
            <div className="pointer-events-none absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-label-muted/40">
              <SlidersHorizontal size={14} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-label-muted block px-1 uppercase tracking-wider">{t("labels.minPrice")}</label>
          <div className="relative">
            <input
              value={draft.minPrice}
              onChange={(event) => onChange("minPrice", event.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-label-muted/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 font-mono transition-all"
            />
            <span className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-label-muted/40">
              EGP
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-label-muted block px-1 uppercase tracking-wider">{t("labels.maxPrice")}</label>
          <div className="relative">
            <input
              value={draft.maxPrice}
              onChange={(event) => onChange("maxPrice", event.target.value)}
              inputMode="numeric"
              placeholder={t("placeholders.maxPrice")}
              className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none placeholder:text-label-muted/30 focus:border-primary/40 focus:ring-2 focus:ring-primary/10 font-mono transition-all"
            />
            <span className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-label-muted/40">
              EGP
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-label-muted px-1 uppercase tracking-wider">
          <SlidersHorizontal size={12} />
          {t("labels.sort")}
        </label>
        <div className="relative">
          <select
            value={draft.sortOrder}
            onChange={(event) => onChange("sortOrder", event.target.value)}
            className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none appearance-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
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
          <div className="pointer-events-none absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-label-muted/40">
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
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClear}
        className="flex-1 rounded-xl border border-border px-5 py-3.5 font-space-grotesk text-xs font-bold text-label-muted transition-all hover:border-foreground/20 hover:text-foreground hover:bg-accent active:scale-[0.98]"
      >
        {t("actions.clear")}
      </button>
      <button
        type="button"
        onClick={onApply}
        className="flex-1 rounded-xl bg-primary px-5 py-3.5 font-space-grotesk text-xs font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
      >
        {t("actions.apply")}
      </button>
    </div>
  );
}