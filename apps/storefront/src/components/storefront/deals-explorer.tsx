"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import ProductCard from "@/components/storefront/product-card";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Flame, Tag } from "lucide-react";

type SortOption = "discount_desc" | "price_asc" | "price_desc" | "newest";

const SORT_OPTIONS: SortOption[] = ["discount_desc", "price_asc", "price_desc", "newest"];

export default function DealsExplorer() {
  const t = useTranslations("DealsPage");
  const locale = useLocale();

  const [sort, setSort] = useState<SortOption>("discount_desc");
  const [categoryId, setCategoryId] = useState<Id<"categories"> | undefined>(undefined);

  const data = useQuery(api.offers.listDeals, { sort, categoryId });

  const isLoading = data === undefined;
  const items = data?.items ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Flame size={16} className="text-primary" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-label-muted">
            {isLoading
              ? t("filters.loading")
              : t("filters.resultCount", { count: data.total })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="deals-sort" className="sr-only">
            {t("filters.sortLabel")}
          </label>
          <select
            id="deals-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="h-11 rounded-xl border border-border bg-background px-4 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary/50"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`filters.sort.${option}` as never)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isLoading && data.categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryId(undefined)}
            className={`rounded-full border px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
              categoryId === undefined
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-label-muted hover:border-primary/20 hover:text-foreground"
            }`}
          >
            {t("filters.allCategories")}
          </button>
          {data.categories.map((category) => (
            <button
              key={category._id}
              type="button"
              onClick={() => setCategoryId(category._id)}
              className={`rounded-full border px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${
                categoryId === category._id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-label-muted hover:border-primary/20 hover:text-foreground"
              }`}
            >
              {locale === "ar" ? category.name_ar : category.name_en}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Tag size={28} className="text-label-muted" />
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-label-muted">
            {t("empty.title")}
          </p>
          <p className="max-w-sm text-sm font-medium text-label-muted">{t("empty.description")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <div key={product._id} className="flex flex-col">
              <ProductCard product={product} discountPercent={product.discountPercent} />
              {product.inStock && (
                <p className="mt-2 text-center text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  {t("card.savings", { amount: product.savings.toLocaleString(locale) })}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
