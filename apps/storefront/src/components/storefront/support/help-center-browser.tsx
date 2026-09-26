"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import FaqAccordion, { FaqItem } from "./faq-accordion";

export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  faqs: { question: string; answer: string }[];
};

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "") // strip Arabic diacritics
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/ة/g, "ه");
}

/**
 * Category-filtered, searchable FAQ browser. Search spans every category so a
 * question is reachable without knowing which bucket it was filed under.
 */
export default function HelpCenterBrowser({
  categories,
}: {
  categories: HelpCategory[];
}) {
  const t = useTranslations("HelpCenter.browser");
  const [term, setTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const isSearching = term.trim().length > 0;

  const results = useMemo(() => {
    const needle = normalise(term.trim());

    const scoped = categories.filter(
      (category) =>
        isSearching || activeCategory === "all" || category.id === activeCategory
    );

    return scoped
      .map((category) => ({
        ...category,
        items: category.faqs
          .map((faq, index) => ({
            id: `${category.id}-${index}`,
            question: faq.question,
            answer: faq.answer,
          }))
          .filter(
            (faq) =>
              !needle ||
              normalise(faq.question).includes(needle) ||
              normalise(faq.answer).includes(needle)
          ) satisfies FaqItem[],
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, term, activeCategory, isSearching]);

  const matchCount = results.reduce(
    (total, category) => total + category.items.length,
    0
  );

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="relative">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-label-muted ltr:left-5 rtl:right-5"
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("label")}
            aria-describedby="help-search-status"
            className="h-16 w-full rounded-2xl border border-border bg-card text-base text-foreground shadow-sm outline-none transition-all placeholder:text-label-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20 ltr:pl-14 ltr:pr-14 rtl:pl-14 rtl:pr-14"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label={t("clear")}
              className="absolute top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-label-muted transition-colors hover:bg-accent hover:text-foreground ltr:right-3 rtl:left-3"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <p
          id="help-search-status"
          aria-live="polite"
          className="text-xs font-medium text-label-muted"
        >
          {isSearching
            ? t("resultsCount", { count: matchCount, term: term.trim() })
            : t("browseHint")}
        </p>

        {!isSearching && (
          <div
            role="tablist"
            aria-label={t("categoriesLabel")}
            className="flex flex-wrap gap-2"
          >
            {[{ id: "all", title: t("allCategories") }, ...categories].map(
              (category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "rounded-full border px-5 py-2.5 font-space-grotesk text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-label-muted hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {category.title}
                  </button>
                );
              }
            )}
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <Search size={32} className="text-label-muted/40" aria-hidden="true" />
          <h3 className="font-space-grotesk text-lg font-black uppercase tracking-tightest text-foreground">
            {t("noResultsTitle")}
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-label-muted">
            {t("noResultsBody")}
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {results.map((category) => (
            <section key={category.id} aria-labelledby={`help-${category.id}`} className="space-y-5">
              <div className="space-y-2">
                <h3
                  id={`help-${category.id}`}
                  className="font-space-grotesk text-lg font-black uppercase tracking-tightest text-foreground md:text-2xl"
                >
                  {category.title}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-label-muted">
                  {category.description}
                </p>
              </div>
              <FaqAccordion
                /* Remount on a new query so search hits open expanded. */
                key={`${category.id}:${term.trim()}`}
                items={category.items}
                defaultOpenIndex={isSearching ? 0 : -1}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
