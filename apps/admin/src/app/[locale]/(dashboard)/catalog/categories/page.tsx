"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { CategoryFormSheet } from "@/components/catalog/categories/CategoryFormSheet";
import { useTranslations, useLocale } from "next-intl";
import {
  Layers,
  Plus,
  Sparkles,
  CheckCircle2,
  XCircle,
  Power,
  BarChart3,
  Tag as TagIcon,
  Search,
} from "lucide-react";

export default function AdminCategoriesPage() {
  const t = useTranslations("Catalog.categories");
  const locale = useLocale();
  const categories = useQuery(api.categories.listCategoriesForAdmin);
  const toggleCategoryStatus = useMutation(api.categories.toggleCategoryStatus);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"categories"> | null>(null);

  const editingCategory = useMemo(
    () => categories?.find((category) => category._id === editingId) ?? null,
    [categories, editingId],
  );

  const openCreateSheet = () => {
    setEditingId(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (categoryId: Id<"categories">) => {
    setEditingId(categoryId);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setEditingId(null);
    setIsSheetOpen(false);
  };

  const toggleStatus = async (id: Id<"categories">) => {
    setBusyId(id);
    try {
      const result = await toggleCategoryStatus({ id });
      toast.success(
        result.isActive ? t("messages.activated") : t("messages.deactivated"),
      );
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Status update failed.";
      toast.error(t("messages.updateFailed"), { description });
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
              <Layers className="text-[#ffc105]" size={20} />
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
            <Plus className="ltr:mr-3 rtl:ml-3 h-4 w-4" />
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
              {categories
                ? t("table.total", { count: categories.length })
                : t("table.loading")}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/40 border-b border-border">
              <tr>
                <th className="sticky left-0 bg-card py-6 px-10 z-10">
                  {t("table.columns.name")}
                </th>
                <th className="py-6 px-6 whitespace-nowrap">
                  {t("table.columns.slug")}
                </th>
                <th className="py-6 px-6 whitespace-nowrap">
                  {t("table.columns.products")}
                </th>
                <th className="py-6 px-6 whitespace-nowrap">
                  {t("table.columns.status")}
                </th>
                <th className="py-6 px-10 text-right whitespace-nowrap">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {categories?.map((category) => (
                <tr
                  key={category._id}
                  className="group/row hover:bg-accent/20 transition-all"
                >
                  <td className="sticky left-0 bg-card py-10 px-10 z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                    <div className="flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity" />
                      <p className="font-black text-foreground text-lg uppercase tracking-tightest leading-none italic">
                        {category.name_en}
                      </p>
                      <p
                        className="text-[10px] text-muted-foreground/40 font-mono tracking-widest mt-2 uppercase italic   w-fit"
                        dir="rtl"
                      >
                        {category.name_ar}
                      </p>
                    </div>
                  </td>
                  <td className="py-10 px-6 align-middle font-black text-[10px] uppercase tracking-widest text-[#ffc105]/60 italic">
                    /{category.slug}
                  </td>
                  <td className="py-10 px-6 align-middle">
                    <div className="flex items-center gap-2.5">
                      <TagIcon size={12} className="text-muted-foreground/30" />
                      <span className="font-black text-sm text-foreground tracking-tightest">
                        {category.productCount}
                      </span>
                      <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest italic leading-none">
                        {t("table.products")}
                      </span>
                    </div>
                  </td>
                  <td className="py-10 px-6 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                        category.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-destructive/20 bg-destructive/10 text-destructive",
                      )}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          category.isActive
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                        )}
                      />
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-10 px-10 align-middle text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all   italic"
                        onClick={() => openEditSheet(category._id)}
                      >
                        {t("actions.edit")}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        className={cn(
                          "rounded-xl h-10 w-10 p-0 transition-all border-border shadow-sm   group/status",
                          category.isActive
                            ? "text-[#ffc105]/40 hover:text-[#ffc105] hover:bg-[#ffc105]/10 hover:border-[#ffc105]/20"
                            : "text-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20",
                        )}
                        disabled={busyId === category._id}
                        onClick={() => void toggleStatus(category._id)}
                      >
                        <Power size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!categories && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffc105] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {t("table.loading")}
                    </p>
                  </td>
                </tr>
              )}
              {categories?.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-20 text-center flex flex-col items-center gap-4"
                  >
                    <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <Layers size={32} className="text-muted-foreground/20" />
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

      <CategoryFormSheet
        open={isSheetOpen}
        onClose={closeSheet}
        category={editingCategory}
      />
    </main>
  );
}
