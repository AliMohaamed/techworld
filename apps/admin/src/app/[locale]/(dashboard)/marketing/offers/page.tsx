"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, Input, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { OfferFormSheet, type OfferTarget } from "@/components/marketing/OfferFormSheet";
import {
  BadgePercent,
  Flame,
  Search,
  Sparkles,
  TrendingDown,
  XCircle,
  Package,
  EyeOff,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

type OfferRow = {
  _id: Id<"products">;
  name_en: string;
  name_ar: string;
  slug?: string;
  status: "DRAFT" | "PUBLISHED";
  selling_price: number;
  compareAtPrice?: number;
  thumbnail?: string;
  categoryName_en: string;
  categoryName_ar: string;
  categoryActive: boolean;
  discountPercent: number;
  savings: number;
  variantCount: number;
  discountedVariantCount: number;
  totalDisplayStock: number;
  isOnOffer: boolean;
};

type Filter = "all" | "active" | "inactive";

export default function OffersPage() {
  const t = useTranslations("Marketing.offers");
  const locale = useLocale();
  const data = useQuery(api.offers.listOffersAdmin, {});
  const clearOffer = useMutation(api.offers.clearProductOffer);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<Id<"products">>>(new Set());
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [busyId, setBusyId] = useState<Id<"products"> | null>(null);

  const stats = data?.stats;

  const visibleRows = useMemo(() => {
    const rows = (data?.rows ?? []) as OfferRow[];
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "active" && !row.isOnOffer) return false;
      if (filter === "inactive" && row.isOnOffer) return false;
      if (!term) return true;
      return (
        row.name_en.toLowerCase().includes(term) ||
        row.name_ar.toLowerCase().includes(term) ||
        (row.slug ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, filter, search]);

  const selectedRows = useMemo(
    () => visibleRows.filter((row) => selected.has(row._id)),
    [visibleRows, selected],
  );

  const toOfferTarget = (row: OfferRow): OfferTarget => ({
    _id: row._id,
    name_en: row.name_en,
    name_ar: row.name_ar,
    selling_price: row.selling_price,
    compareAtPrice: row.compareAtPrice,
    discountPercent: row.discountPercent,
    variantCount: row.variantCount,
  });

  const toggleSelected = (id: Id<"products">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allSelected = visibleRows.length > 0 && visibleRows.every((r) => selected.has(r._id));
    setSelected(allSelected ? new Set() : new Set(visibleRows.map((r) => r._id)));
  };

  const openEdit = (row: OfferRow) => {
    setEditing(row);
    setIsBulkOpen(false);
    setIsSheetOpen(true);
  };

  const openBulk = () => {
    setEditing(null);
    setIsBulkOpen(true);
    setIsSheetOpen(true);
  };

  const handleSheetOpenChange = (next: boolean) => {
    setIsSheetOpen(next);
    if (!next) {
      setEditing(null);
      if (isBulkOpen) setSelected(new Set());
      setIsBulkOpen(false);
    }
  };

  const onClear = async (row: OfferRow) => {
    if (!confirm(t("actions.confirmClear"))) return;
    setBusyId(row._id);
    try {
      await clearOffer({ productId: row._id });
      toast.success(t("messages.cleared"));
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.operationFailed");
      toast.error(t("messages.operationFailed"), { description: message });
    } finally {
      setBusyId(null);
    }
  };

  const statCards = [
    { key: "activeOffers", value: stats?.activeOffers ?? 0, icon: BadgePercent },
    { key: "liveOffers", value: stats?.liveOffers ?? 0, icon: Sparkles },
    { key: "deepestDiscount", value: `${stats?.deepestDiscount ?? 0}%`, icon: Flame },
    { key: "averageDiscount", value: `${stats?.averageDiscount ?? 0}%`, icon: TrendingDown },
  ];

  return (
    <main className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BadgePercent className="text-[#ffc105]" size={20} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                {t("badge")}
              </p>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight italic">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/60">
              {t("description")}
            </p>
          </div>
          <Button
            type="button"
            onClick={openBulk}
            disabled={selectedRows.length === 0}
            className="rounded-2xl h-14 px-10 bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all font-black uppercase tracking-[0.2em] text-[10px] disabled:opacity-40"
          >
            <Sparkles className="ltr:mr-3 rtl:ml-3 h-4 w-4" />
            {t("actions.bulkApply", { count: selectedRows.length })}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="rounded-[32px] border border-border bg-card p-8 transition-all hover:border-[#ffc105]/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                  {t(`stats.${card.key}` as never)}
                </p>
                <Icon size={16} className="text-[#ffc105]" />
              </div>
              <p className="mt-4 text-4xl font-black tracking-tightest text-foreground italic">
                {typeof card.value === "number" ? card.value.toLocaleString(locale) : card.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[40px] border border-border bg-card">
        <div className="border-b border-border bg-accent/30 px-10 py-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-6 w-1 bg-[#ffc105] rounded-full" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                {t("table.badge")}
              </p>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tightest italic leading-none mt-1">
                {t("table.title")}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4 text-muted-foreground/30"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("table.searchPlaceholder")}
                className="h-11 w-56 rounded-2xl ltr:pl-11 rtl:pr-11 text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-background p-1">
              {(["all", "active", "inactive"] as Filter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === option
                      ? "bg-[#ffc105]/10 text-[#ffc105]"
                      : "text-muted-foreground/40 hover:text-foreground",
                  )}
                >
                  {t(`table.filters.${option}` as never)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/40 border-b border-border">
              <tr>
                <th className="py-4 px-6 w-12">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#ffc105]"
                    aria-label={t("table.selectAll")}
                    checked={
                      visibleRows.length > 0 && visibleRows.every((r) => selected.has(r._id))
                    }
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="py-4 px-4">{t("table.columns.product")}</th>
                <th className="py-4 px-4 whitespace-nowrap">{t("table.columns.pricing")}</th>
                <th className="py-4 px-4">{t("table.columns.discount")}</th>
                <th className="py-4 px-4">{t("table.columns.visibility")}</th>
                <th className="py-4 px-6 text-right whitespace-nowrap">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {visibleRows.map((row) => {
                const anchor =
                  row.compareAtPrice && row.compareAtPrice > row.selling_price
                    ? row.compareAtPrice
                    : row.selling_price;
                const isLive = row.status === "PUBLISHED" && row.categoryActive;

                return (
                  <tr key={row._id} className="group/row hover:bg-accent/20 transition-all">
                    <td className="py-4 px-6 align-middle">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#ffc105]"
                        aria-label={row.name_en}
                        checked={selected.has(row._id)}
                        onChange={() => toggleSelected(row._id)}
                      />
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-accent/40">
                          {row.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.thumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package size={16} className="text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-black text-foreground leading-tight">
                            {locale === "ar" ? row.name_ar : row.name_en}
                          </span>
                          <span className="mt-1 text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                            {locale === "ar" ? row.categoryName_ar : row.categoryName_en}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <p className="text-base font-black text-foreground tracking-tightest">
                        EGP {row.selling_price.toLocaleString(locale)}
                      </p>
                      {row.isOnOffer && (
                        <p className="text-[10px] font-bold text-muted-foreground/40 line-through">
                          EGP {anchor.toLocaleString(locale)}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 align-middle">
                      {row.isOnOffer ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-2 rounded-full border border-[#ffc105]/20 bg-[#ffc105]/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#ffc105]">
                            <Flame size={12} /> {row.discountPercent}%
                          </span>
                          {row.variantCount > 0 && (
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
                              {t("table.variantsOnOffer", {
                                discounted: row.discountedVariantCount,
                                total: row.variantCount,
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/25">
                          {t("table.noOffer")}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 align-middle">
                      {isLive ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                          {t("table.visibility.live")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/40 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          <EyeOff size={12} />
                          {row.status !== "PUBLISHED"
                            ? t("table.visibility.draft")
                            : t("table.visibility.categoryInactive")}
                        </span>
                      )}
                      {row.totalDisplayStock <= 0 && (
                        <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-destructive">
                          {t("table.outOfStock")}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all italic"
                          onClick={() => openEdit(row)}
                        >
                          {row.isOnOffer ? t("actions.edit") : t("actions.start")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl h-10 w-10 p-0 text-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-all disabled:opacity-20"
                          disabled={!row.isOnOffer || busyId === row._id}
                          onClick={() => onClear(row)}
                          aria-label={t("actions.clear")}
                        >
                          <XCircle size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!data && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffc105] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {t("table.loading")}
                    </p>
                  </td>
                </tr>
              )}

              {data && visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <BadgePercent size={32} className="text-muted-foreground/20" />
                    </div>
                    <p className="mt-4 text-sm font-black uppercase tracking-widest text-muted-foreground/20 italic">
                      {t("table.empty")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OfferFormSheet
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        product={editing ? toOfferTarget(editing) : null}
        bulkTargets={isBulkOpen ? selectedRows.map(toOfferTarget) : []}
      />
    </main>
  );
}
