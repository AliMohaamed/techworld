"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, Input, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { ProductFormSheet } from "@/components/catalog/products/ProductFormSheet";
import { useTranslations, useLocale } from "next-intl";
import {
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  ArrowUpRight,
  BarChart3,
  Layers,
  Tag as TagIcon,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type AdminProduct = {
  _id: Id<"products">;
  categoryId: Id<"categories">;
  categoryName: string;
  isCategoryActive: boolean;
  publicationBlockedReason?: string | null;
  name_en: string;
  name_ar: string;
  slug?: string;
  description_en?: string;
  description_ar?: string;
  selling_price: number;
  compareAtPrice?: number;
  cogs?: number;
  status: "DRAFT" | "PUBLISHED";
  thumbnail?: string;
  images: string[];
  display_stock?: number;
  real_stock?: number;
  skus?: Array<{
    _id: Id<"skus">;
    variantName: string;
    variantAttributes?: { color?: string; size?: string; type?: string };
    real_stock: number;
    display_stock: number;
    price: number;
    compareAtPrice?: number;
    linkedImageId?: string;
    isDefault?: boolean;
  }>;
};

export default function AdminProductsPage() {
  const t = useTranslations("Catalog.products");
  const locale = useLocale();
  const products = useQuery(api.products.listAdminProducts) as
    | AdminProduct[]
    | undefined;
  const activeCategories = useQuery(api.categories.listActiveCategories);
  const updateProduct = useMutation(api.products.updateProduct);
  const publishProduct = useMutation(api.products.publishProduct);
  const unpublishProduct = useMutation(api.products.unpublishProduct);
  const updateSkuRealStock = useMutation(api.skus.updateSkuRealStock);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"products"> | null>(null);
  const [updatingSkuId, setUpdatingSkuId] = useState<Id<"skus"> | null>(null);
  const [displayDrafts, setDisplayDrafts] = useState<Record<string, string>>(
    {},
  );
  const [realDrafts, setRealDrafts] = useState<Record<string, string>>({});

  const adjustRealStock = async (
    skuId: Id<"skus">,
    currentStock: number,
    delta: number,
  ) => {
    const nextStock = Math.max(0, currentStock + delta);
    if (nextStock === currentStock) return;

    setUpdatingSkuId(skuId);
    try {
      await updateSkuRealStock({ skuId, real_stock: nextStock });
      toast.success(t("messages.realStockUpdated"));
    } catch (error: any) {
      toast.error(t("messages.stockUpdateFailed"), {
        description: error.message || t("messages.realStockFailed"),
      });
    } finally {
      setUpdatingSkuId(null);
    }
  };

  const editingProduct = useMemo(
    () => products?.find((product) => product._id === editingId) ?? null,
    [products, editingId],
  );

  const openCreateSheet = () => {
    setEditingId(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (productId: Id<"products">) => {
    setEditingId(productId);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setEditingId(null);
    setIsSheetOpen(false);
  };

  const saveDisplayStock = async (
    id: Id<"products">,
    fallbackValue: number | undefined,
  ) => {
    const nextValue = Number(displayDrafts[id] ?? fallbackValue ?? 0);
    setBusyId(id);
    try {
      await updateProduct({ id, display_stock: nextValue });
      toast.success(t("messages.displayStockUpdated"));
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : t("messages.displayStockFailed");
      toast.error(t("messages.stockUpdateFailed"), { description });
    } finally {
      setBusyId(null);
    }
  };

  const saveRealStock = async (
    id: Id<"products">,
    fallbackValue: number | undefined,
  ) => {
    const nextValue = Number(realDrafts[id] ?? fallbackValue ?? 0);
    setBusyId(id);
    try {
      await updateProduct({ id, real_stock: nextValue });
      toast.success(t("messages.realStockUpdated"));
    } catch (error) {
      const description =
        error instanceof Error ? error.message : t("messages.realStockFailed");
      toast.error(t("messages.stockUpdateFailed"), { description });
    } finally {
      setBusyId(null);
    }
  };

  const togglePublication = async (
    id: Id<"products">,
    status: "DRAFT" | "PUBLISHED",
  ) => {
    setBusyId(id);
    try {
      if (status === "PUBLISHED") {
        await unpublishProduct({ id });
        toast.success(t("messages.unpublishSuccess"));
      } else {
        await publishProduct({ id });
        toast.success(t("messages.publishSuccess"));
      }
    } catch (error) {
      const description =
        error instanceof Error
          ? error.message
          : t("messages.publicationFailed");
      toast.error(t("messages.publicationBlocked"), { description });
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
              <Package className="text-[#ffc105]" size={20} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                {t("badge")}
              </p>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight">
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
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tightest leading-none mt-1">
                {t("table.title")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-background px-5 py-2 text-[10px] font-black text-muted-foreground/60 font-mono tracking-widest uppercase  ">
              {products
                ? t("table.total", { count: products.length })
                : t("table.loading")}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/40 border-b border-border">
              <tr>
                <th className="sticky left-0 bg-card py-4 px-6 z-10">
                  {t("table.columns.product")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.category")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.pricing")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.variants")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.displayStock")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.realStock")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("table.columns.status")}
                </th>
                <th className="py-4 px-6 text-right whitespace-nowrap">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {products?.map((product) => (
                <tr
                  key={product._id}
                  className="group/row hover:bg-accent/20 transition-all align-top"
                >
                  <td className="sticky left-0 bg-card py-4 px-6 z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                    <div className="flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity" />
                      <p className="font-black text-foreground text-lg uppercase tracking-tightest leading-none">
                        {product.name_en}
                      </p>
                      <p
                        className="text-[10px] text-muted-foreground/40 font-mono tracking-widest mt-2 uppercase"
                        dir="rtl"
                      >
                        {product.name_ar}
                      </p>
                      <p className="mt-3 text-[9px] font-black text-[#ffc105] uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                        <Plus size={10} className="rotate-45" />{" "}
                        {product.slug ?? t("table.noSlug")}
                      </p>
                    </div>
                  </td>
                  <td className="py-6 px-4 align-middle">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-black text-[10px] text-foreground uppercase tracking-widest">
                        {product.categoryName}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest py-0.5 px-2 rounded-full w-fit",
                          product.isCategoryActive
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20",
                        )}
                      >
                        {product.isCategoryActive
                          ? t("table.activeCategory")
                          : t("table.inactiveCategory")}
                      </span>
                      {product.publicationBlockedReason && (
                        <p className="mt-1 text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle size={10} />{" "}
                          {product.publicationBlockedReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-4 align-middle">
                    <div className="flex flex-col">
                      <p className="font-black text-sm text-foreground tracking-tightest">
                        EGP {product.selling_price.toLocaleString(locale)}
                      </p>
                      {product.compareAtPrice ? (
                        <p className="mt-1 text-[10px] font-black text-muted-foreground/30 line-through tracking-widest">
                          EGP {product.compareAtPrice.toLocaleString(locale)}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-6 px-4 align-middle">
                    <div className="flex flex-col gap-1.5">
                      <p className="font-black text-[10px] text-foreground uppercase tracking-widest">
                        {t("table.variantsCount", {
                          count: product.skus?.length ?? 0,
                        })}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {product.skus?.slice(0, 3).map((sku) => (
                          <span
                            key={sku._id}
                            className="text-[8px] font-black border border-border bg-background px-1.5 py-0.5 rounded uppercase tracking-widest text-muted-foreground/60"
                          >
                            {sku.variantName}
                          </span>
                        )) || (
                          <span className="text-[8px] font-black border border-border bg-background px-1.5 py-0.5 rounded uppercase tracking-widest text-muted-foreground/30">
                            {t("table.defaultSkuOnly")}
                          </span>
                        )}
                        {(product.skus?.length ?? 0) > 3 && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 text-muted-foreground/30">
                            +{product.skus!.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-4 align-middle">
                    {product.skus && product.skus.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-black text-foreground tracking-tightest">
                          {product.skus
                            .reduce((s, sku) => s + sku.display_stock, 0)
                            .toLocaleString(locale)}
                        </p>
                        <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[.2em] leading-none">
                          {t("table.managedViaSkus")}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/input">
                        <Input
                          className="w-20 h-9 rounded-lg bg-background border-border text-xs font-black uppercase tracking-widest focus:ring-primary/10 transition-all text-center px-2"
                          type="number"
                          value={
                            displayDrafts[product._id] ??
                            String(product.display_stock ?? 0)
                          }
                          onChange={(event) =>
                            setDisplayDrafts((current) => ({
                              ...current,
                              [product._id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          className="h-9 w-9 p-0 rounded-lg border-border hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover/input:opacity-100"
                          disabled={busyId === product._id}
                          onClick={() =>
                            void saveDisplayStock(
                              product._id,
                              product.display_stock,
                            )
                          }
                        >
                          <CheckCircle2 size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="py-6 px-4 align-middle">
                    {product.skus && product.skus.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {product.skus.map((sku) => (
                          <div key={sku._id} className="flex items-center justify-between gap-3 min-w-[120px]">
                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest truncate max-w-[60px]">
                              {sku.variantName}
                            </span>
                            <div className="flex items-center bg-accent/30 rounded-lg p-0.5 border border-border/50">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                                disabled={updatingSkuId === sku._id || sku.real_stock <= 0}
                                onClick={() => void adjustRealStock(sku._id, sku.real_stock, -1)}
                              >
                                <Minus size={10} />
                              </Button>
                              <span className="text-[10px] font-black min-w-[24px] text-center font-mono">
                                {updatingSkuId === sku._id ? "..." : sku.real_stock}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500 transition-all"
                                disabled={updatingSkuId === sku._id}
                                onClick={() => void adjustRealStock(sku._id, sku.real_stock, 1)}
                              >
                                <Plus size={10} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/input">
                        <Input
                          className="w-20 h-9 rounded-lg bg-background border-border text-xs font-black uppercase tracking-widest focus:ring-primary/10 transition-all text-center px-2"
                          type="number"
                          value={
                            realDrafts[product._id] ??
                            String(product.real_stock ?? 0)
                          }
                          onChange={(event) =>
                            setRealDrafts((current) => ({
                              ...current,
                              [product._id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          className="h-9 w-9 p-0 rounded-lg border-border hover:bg-primary/10 hover:text-primary transition-all opacity-0 group-hover/input:opacity-100"
                          disabled={busyId === product._id}
                          onClick={() =>
                            void saveRealStock(product._id, product.real_stock)
                          }
                        >
                          <CheckCircle2 size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="py-6 px-4 align-middle">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all shadow-sm",
                        product.status === "PUBLISHED"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-border bg-background text-muted-foreground/40",
                      )}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          product.status === "PUBLISHED"
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-muted-foreground/40",
                        )}
                      />
                      {product.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 align-middle text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all"
                        onClick={() => openEditSheet(product._id)}
                      >
                        {t("actions.edit")}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        className={cn(
                          "rounded-xl h-10 px-5 text-[10px] font-black uppercase tracking-widest transition-all border-border shadow-sm   group/btn",
                          product.status === "PUBLISHED"
                            ? "text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                            : "text-emerald-500/40 hover:text-emerald-500 hover:bg-emerald-500/10",
                        )}
                        disabled={busyId === product._id}
                        onClick={() =>
                          void togglePublication(product._id, product.status)
                        }
                      >
                        {busyId === product._id
                          ? t("actions.updating")
                          : product.status === "PUBLISHED"
                            ? t("actions.unpublish")
                            : t("actions.publish")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products && (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffc105] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {t("table.loading")}
                    </p>
                  </td>
                </tr>
              )}
              {products?.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-20 text-center flex flex-col items-center gap-4"
                  >
                    <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
                      <Package size={32} className="text-muted-foreground/20" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/20">
                      {t("table.empty")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProductFormSheet
        open={isSheetOpen}
        onClose={closeSheet}
        categories={activeCategories?.categories ?? []}
        product={editingProduct}
        onSaved={(label) => toast.success(label)}
      />
    </main>
  );
}
