"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { PromoCodeFormSheet } from "@/components/marketing/PromoCodeFormSheet";
import {
  Tag,
  Calendar,
  Users as UsersIcon,
  CheckCircle2,
  XCircle,
  Trash2,
  Power,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function PromoCodesPage() {
  const t = useTranslations("Marketing.promoCodes");
  const locale = useLocale();
  const promoCodes = useQuery(api.promoCodes.list);
  const toggleActive = useMutation(api.promoCodes.toggleActive);
  const removePromo = useMutation(api.promoCodes.remove);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"promo_codes"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"promo_codes"> | null>(null);

  const editingPromo = useMemo(
    () => promoCodes?.find((p) => p._id === editingId) ?? null,
    [promoCodes, editingId],
  );

  const openCreateSheet = () => {
    setEditingId(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (id: Id<"promo_codes">) => {
    setEditingId(id);
    setIsSheetOpen(true);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    setIsSheetOpen(nextOpen);
    if (!nextOpen) {
      setEditingId(null);
    }
  };

  const onToggle = async (id: Id<"promo_codes">, currentStatus: boolean) => {
    setBusyId(id);
    try {
      await toggleActive({ id, isActive: !currentStatus });
      toast.success(
        currentStatus ? t("messages.deactivated") : t("messages.activated"),
      );
    } catch (error) {
      toast.error(t("messages.updateFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: Id<"promo_codes">) => {
    if (!confirm(t("actions.confirmDelete"))) return;
    setBusyId(id);
    try {
      await removePromo({ id });
      toast.success(t("messages.deleteSuccess"));
    } catch (error) {
      toast.error(t("messages.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12  ">
        {/* Decorative background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Tag className="text-[#ffc105]" size={20} />
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
            onClick={openCreateSheet}
            className="rounded-2xl h-14 px-10 bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[10px]"
          >
            <Sparkles className="ltr:mr-3 rtl:ml-3 h-4 w-4" />
            {t("actions.create")}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[40px] border border-border bg-card   group transition-all hover:border-[#ffc105]/10">
        <div className="border-b border-border bg-accent/30 px-10 py-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-background px-5 py-2 text-[10px] font-black text-muted-foreground/60 font-mono tracking-widest uppercase  ">
              {promoCodes
                ? t("table.total", { count: promoCodes.length })
                : t("table.loading")}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/40 border-b border-border">
              <tr>
                <th className="sticky left-0 bg-card py-4 px-6 z-10">
                  {t("table.columns.code")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.typeValue")}
                </th>
                <th className="py-4 px-4">{t("table.columns.usage")}</th>
                <th className="py-4 px-4">{t("table.columns.expiration")}</th>
                <th className="py-4 px-4">{t("table.columns.status")}</th>
                <th className="py-4 px-6 text-right whitespace-nowrap">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {promoCodes?.map((promo) => {
                const isExpired =
                  promo.expiry_date && Date.now() > promo.expiry_date;
                const isLimitReached = promo.current_uses >= promo.max_uses;

                return (
                  <tr
                    key={promo._id}
                    className="group/row hover:bg-accent/20 transition-all"
                  >
                    <td className="sticky left-0 bg-card py-4 px-6 align-middle z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                          <Tag size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-lg text-foreground tracking-widest uppercase italic leading-none">
                            {promo.code}
                          </span>
                          <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[.3em] mt-2 italic  ">
                            Voucher Identifier
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-4 align-middle">
                      <p className="font-black text-base text-foreground tracking-tightest italic">
                        {promo.type === "fixed"
                          ? `EGP ${promo.value.toLocaleString(locale)}`
                          : promo.type === "percentage"
                            ? `${promo.value}%`
                            : t("table.types.freeShipping")}
                      </p>
                      {promo.type === "percentage" &&
                        promo.max_discount_amount && (
                          <p className="text-[9px] font-black text-[#ffc105] mt-2 uppercase tracking-widest italic">
                            {t("table.cappedAt", {
                              amount:
                                promo.max_discount_amount.toLocaleString(
                                  locale,
                                ),
                            })}
                          </p>
                        )}
                    </td>
                    <td className="py-6 px-4 align-middle">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <UsersIcon
                            size={12}
                            className="text-muted-foreground/30"
                          />
                          <span className="text-[10px] font-black text-foreground uppercase font-mono tracking-widest">
                            {promo.current_uses} / {promo.max_uses}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">
                          Consumption Rate
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent  ">
                        <div
                          className={cn(
                            "h-full transition-all duration-1000",
                            isLimitReached
                              ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                              : "bg-primary shadow-[0_0_10px_rgba(255,193,5,0.3)]",
                          )}
                          style={{
                            width: `${Math.min(100, (promo.current_uses / promo.max_uses) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="py-6 px-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        <Calendar
                          size={14}
                          className={cn(
                            isExpired
                              ? "text-destructive"
                              : "text-muted-foreground/30",
                          )}
                        />
                        <span
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest leading-none",
                            isExpired
                              ? "text-destructive italic"
                              : "text-muted-foreground/60",
                          )}
                        >
                          {promo.expiry_date
                            ? new Date(promo.expiry_date).toLocaleDateString(
                                locale,
                              )
                            : t("table.neverExpires")}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-4 align-middle">
                      {promo.isActive && !isExpired && !isLimitReached ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest shadow-sm shadow-emerald-500/5">
                          <CheckCircle2 size={12} /> {t("table.status.active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-4 py-2 text-[9px] font-black text-destructive uppercase tracking-widest shadow-sm shadow-destructive/5">
                          <AlertCircle size={12} />{" "}
                          {isExpired
                            ? t("table.status.expired")
                            : isLimitReached
                              ? t("table.status.full")
                              : t("table.status.inactive")}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all   italic"
                          onClick={() => openEditSheet(promo._id)}
                        >
                          {t("actions.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={cn(
                            "rounded-xl h-10 w-10 p-0 transition-all border-border shadow-sm   group/status",
                            promo.isActive
                              ? "text-[#ffc105]/40 hover:text-[#ffc105] hover:bg-[#ffc105]/10 hover:border-[#ffc105]/20"
                              : "text-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20",
                          )}
                          disabled={busyId === promo._id}
                          onClick={() => onToggle(promo._id, promo.isActive)}
                        >
                          <Power size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl h-10 w-10 p-0 text-destructive/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all  "
                          disabled={busyId === promo._id}
                          onClick={() => onDelete(promo._id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!promoCodes && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffc105] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {t("table.loading")}
                    </p>
                  </td>
                </tr>
              )}
              {promoCodes?.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-20 text-center flex flex-col items-center gap-4"
                  >
                    <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <Tag size={32} className="text-muted-foreground/20" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/20 italic">
                      {t("table.empty")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PromoCodeFormSheet
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        promoCode={editingPromo}
      />
    </main>
  );
}
