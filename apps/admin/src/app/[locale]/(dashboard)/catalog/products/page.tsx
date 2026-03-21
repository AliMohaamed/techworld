"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, Input, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { ProductFormSheet } from "@/components/catalog/products/ProductFormSheet";
import { useTranslations, useLocale } from "next-intl";

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
  // display_stock and real_stock are optional on the root — advanced products store them on SKUs.
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
  const t = useTranslations('Catalog.products');
  const locale = useLocale();
  const products = useQuery(api.products.listAdminProducts) as AdminProduct[] | undefined;
  const activeCategories = useQuery(api.categories.listActiveCategories);
  const updateProduct = useMutation(api.products.updateProduct);
  const publishProduct = useMutation(api.products.publishProduct);
  const unpublishProduct = useMutation(api.products.unpublishProduct);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"products"> | null>(null);
  const [displayDrafts, setDisplayDrafts] = useState<Record<string, string>>({});
  const [realDrafts, setRealDrafts] = useState<Record<string, string>>({});

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

  const saveDisplayStock = async (id: Id<"products">, fallbackValue: number | undefined) => {
    const nextValue = Number(displayDrafts[id] ?? fallbackValue ?? 0);
    setBusyId(id);
    try {
      await updateProduct({ id, display_stock: nextValue });
      toast.success(t('messages.displayStockUpdated'));
    } catch (error) {
      const description = error instanceof Error ? error.message : t('messages.displayStockFailed');
      toast.error(t('messages.stockUpdateFailed'), { description });
    } finally {
      setBusyId(null);
    }
  };

  const saveRealStock = async (id: Id<"products">, fallbackValue: number | undefined) => {
    const nextValue = Number(realDrafts[id] ?? fallbackValue ?? 0);
    setBusyId(id);
    try {
      await updateProduct({ id, real_stock: nextValue });
      toast.success(t('messages.realStockUpdated'));
    } catch (error) {
      const description = error instanceof Error ? error.message : t('messages.realStockFailed');
      toast.error(t('messages.stockUpdateFailed'), { description });
    } finally {
      setBusyId(null);
    }
  };

  const togglePublication = async (id: Id<"products">, status: "DRAFT" | "PUBLISHED") => {
    setBusyId(id);
    try {
      if (status === "PUBLISHED") {
        await unpublishProduct({ id });
        toast.success(t('messages.unpublishSuccess'));
      } else {
        await publishProduct({ id });
        toast.success(t('messages.publishSuccess'));
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : t('messages.publicationFailed');
      toast.error(t('messages.publicationBlocked'), { description });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-primary">{t('badge')}</p>
            <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
              {t('title')}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              {t('description')}
            </p>
          </div>
          <Button type="button" onClick={openCreateSheet}>
            {t('actions.create')}
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/5 bg-[#24201a] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('table.badge')}</p>
            <h2 className="mt-2 text-xl font-semibold text-white uppercase tracking-tight">{t('table.title')}</h2>
          </div>
          <span className="rounded-full border border-white/5 px-3 py-1 text-xs text-zinc-300">
            {products ? t('table.total', { count: products.length }) : t('table.loading')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="sticky left-0 bg-[#24201a] pb-3 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">{t('table.columns.product')}</th>
                <th className="pb-3 pr-4">{t('table.columns.category')}</th>
                <th className="pb-3 pr-4">{t('table.columns.pricing')}</th>
                <th className="pb-3 pr-4">{t('table.columns.variants')}</th>
                <th className="pb-3 pr-4">{t('table.columns.displayStock')}</th>
                <th className="pb-3 pr-4">{t('table.columns.realStock')}</th>
                <th className="pb-3 pr-4">{t('table.columns.status')}</th>
                <th className="pb-3">{t('table.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product._id} className="border-t border-white/5 align-top">
                  <td className="sticky left-0 bg-[#24201a] py-4 max-lg:py-5 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <p className="font-medium text-white">{product.name_en}</p>
                    <p className="text-xs text-zinc-500" dir="rtl">{product.name_ar}</p>
                    <p className="mt-1 text-xs text-zinc-500">/{product.slug ?? t('table.noSlug')}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p>{product.categoryName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {product.isCategoryActive ? t('table.activeCategory') : t('table.inactiveCategory')}
                    </p>
                    {product.publicationBlockedReason ? (
                      <p className="mt-2 text-xs text-amber-300">{product.publicationBlockedReason}</p>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4">
                    <p>EGP {product.selling_price.toLocaleString(locale)}</p>
                    {product.compareAtPrice ? (
                      <p className="mt-1 text-xs text-zinc-500 line-through">EGP {product.compareAtPrice.toLocaleString(locale)}</p>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4">
                    <p>{t('table.variantsCount', { count: product.skus?.length ?? 0 })}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {product.skus?.map((sku) => sku.variantName).join(", ") || t('table.defaultSkuOnly')}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    {product.skus && product.skus.length > 0 ? (
                      // Advanced product: show aggregated SKU display_stock
                      <div className="space-y-1">
                        <p className="text-sm text-white">
                          {t('table.total', { count: product.skus.reduce((s, sku) => s + sku.display_stock, 0) })}
                        </p>
                        <p className="text-xs text-zinc-500">{t('table.managedViaSkus')}</p>
                      </div>
                    ) : (
                      // Simple product: legacy inline edit
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-24"
                          type="number"
                          value={displayDrafts[product._id] ?? String(product.display_stock ?? 0)}
                          onChange={(event) =>
                            setDisplayDrafts((current) => ({ ...current, [product._id]: event.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          disabled={busyId === product._id}
                          onClick={() => void saveDisplayStock(product._id, product.display_stock)}
                        >
                          {t('actions.save')}
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    {product.skus && product.skus.length > 0 ? (
                      // Advanced product: show aggregated SKU real_stock
                      <div className="space-y-1">
                        <p className="text-sm text-white">
                          {t('table.total', { count: product.skus.reduce((s, sku) => s + sku.real_stock, 0) })}
                        </p>
                        <p className="text-xs text-zinc-500">{t('table.managedViaSkus')}</p>
                      </div>
                    ) : (
                      // Simple product: legacy inline edit
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-24"
                          type="number"
                          value={realDrafts[product._id] ?? String(product.real_stock ?? 0)}
                          onChange={(event) =>
                            setRealDrafts((current) => ({ ...current, [product._id]: event.target.value }))
                          }
                        />
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          disabled={busyId === product._id}
                          onClick={() => void saveRealStock(product._id, product.real_stock)}
                        >
                          {t('actions.save')}
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        product.status === "PUBLISHED"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/5 bg-white/5 text-zinc-300"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" type="button" variant="outline" onClick={() => openEditSheet(product._id)}>
                        {t('actions.edit')}
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        disabled={busyId === product._id}
                        onClick={() => void togglePublication(product._id, product.status)}
                      >
                        {busyId === product._id
                          ? t('actions.updating')
                          : product.status === "PUBLISHED"
                            ? t('actions.unpublish')
                            : t('actions.publish')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {products?.length === 0 ? (
                <tr>
                  <td className="py-8 text-zinc-500" colSpan={8}>
                    {t('table.empty')}
                  </td>
                </tr>
              ) : null}
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
