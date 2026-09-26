"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, Truck } from "lucide-react";

export type ShippingRate = {
  id: string;
  name_en: string;
  name_ar: string;
  shippingFee: number;
};

/**
 * Live shipping rates, sourced from the same `governorates` table checkout
 * charges from — so the published table can never drift from what customers pay.
 */
export default function ShippingRatesTable({ rates }: { rates: ShippingRate[] }) {
  const t = useTranslations("ShippingPage.rates");
  const locale = useLocale();
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return rates;
    return rates.filter(
      (rate) =>
        rate.name_en.toLowerCase().includes(needle) ||
        rate.name_ar.toLowerCase().includes(needle)
    );
  }, [rates, term]);

  const cheapest = useMemo(
    () => (rates.length ? Math.min(...rates.map((rate) => rate.shippingFee)) : 0),
    [rates]
  );

  if (!rates.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-label-muted">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-label-muted ltr:left-4 rtl:right-4"
        />
        <input
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="h-12 w-full rounded-xl border border-border bg-background text-sm text-foreground outline-none transition-all placeholder:text-label-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/20 ltr:pl-11 ltr:pr-4 rtl:pl-4 rtl:pr-11"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th
                  scope="col"
                  className="px-6 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-label-muted ltr:text-left rtl:text-right"
                >
                  {t("columns.destination")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-label-muted ltr:text-right rtl:text-left"
                >
                  {t("columns.fee")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((rate) => (
                <tr key={rate.id} className="transition-colors hover:bg-accent/40">
                  <th
                    scope="row"
                    className="px-6 py-4 font-medium text-foreground ltr:text-left rtl:text-right"
                  >
                    <span className="flex items-center gap-3">
                      {locale === "ar" ? rate.name_ar : rate.name_en}
                      {rate.shippingFee === cheapest && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                          {t("bestRate")}
                        </span>
                      )}
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-6 py-4 font-space-grotesk font-bold tracking-tight text-foreground ltr:text-right rtl:text-left">
                    {rate.shippingFee.toLocaleString(locale)}{" "}
                    <span className="text-xs text-primary">{t("currency")}</span>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-6 py-12 text-center text-sm text-label-muted"
                  >
                    {t("noMatches", { term: term.trim() })}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-start gap-2.5 text-xs leading-relaxed text-label-muted">
        <Truck size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        {t("footnote")}
      </p>
    </div>
  );
}
