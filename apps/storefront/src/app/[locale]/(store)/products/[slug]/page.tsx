"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ChevronRight, ShoppingBag, Truck, ShieldCheck, Zap } from "lucide-react";
import { Link } from "@/navigation";
import { DynamicProductGallery } from "@/components/storefront/DynamicProductGallery";
import { RelatedProducts } from "@techworld/ui";
import { useTranslations, useLocale } from "next-intl";

type ProductSku = {
  _id: Id<"skus">;
  variantName: string;
  variantAttributes?: {
    color?: string;
    size?: string;
    type?: string;
  };
  real_stock: number;
  display_stock: number;
  price: number;
  compareAtPrice?: number;
  linkedImageId?: string;
  isDefault?: boolean;
};

function uniqueImages(images: Array<string | undefined>) {
  return images.filter((image, index, array): image is string => Boolean(image) && array.indexOf(image) === index);
}

function normalizeColorLabel(color: string) {
  return color.trim().toLowerCase();
}

export default function ProductDetailPage() {
  const t = useTranslations('ProductDetail');
  const locale = useLocale();
  const { slug } = useParams();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);
  const product = useQuery(api.products.getBySlug, slug ? { slug: slug as string } : "skip");
  const [selectedSkuId, setSelectedSkuId] = useState<Id<"skus"> | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!product?.skus?.length) {
      setSelectedSkuId(undefined);
      return;
    }

    const nextSku = product.skus.find((sku: ProductSku) => sku.isDefault) ?? product.skus[0];
    setSelectedSkuId(nextSku?._id);
  }, [product]);

  const selectedVariant = product?.skus?.find((sku: ProductSku) => sku._id === selectedSkuId) ?? product?.skus?.[0];
  const variantColorOptions =
    product?.skus?.filter(
      (sku: ProductSku, index: number, list: ProductSku[]) => {
        const color = sku.variantAttributes?.color?.trim();
        if (!color) {
          return false;
        }

        return list.findIndex((candidate) => normalizeColorLabel(candidate.variantAttributes?.color ?? "") === normalizeColorLabel(color)) === index;
      },
    ) ?? [];
  const variantOptions = product?.skus ?? [];

  const activeImage = selectedImage ?? selectedVariant?.linkedImageId ?? product?.thumbnail ?? product?.images?.[0];
  const galleryImages = product
    ? uniqueImages([selectedVariant?.linkedImageId, product.thumbnail, ...(product.images ?? [])])
    : [];
  const displayPrice = selectedVariant?.price ?? product?.selling_price ?? 0;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice;
  const hasSalePrice = compareAtPrice !== undefined && compareAtPrice > displayPrice;
  const availableUnits = selectedVariant?.display_stock ?? 0;

  useEffect(() => {
    setSelectedImage(activeImage);
  }, [activeImage, selectedSkuId]);

  const handleAddToCart = async () => {
    if (!product) return;
    const skuId = selectedSkuId ?? selectedVariant?._id;
    if (!skuId) return;
    try {
      await addToCart({
        sessionId,
        productId: product._id,
        skuId,
        quantity: 1,
      });
      openCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
  };

  if (product === undefined) {
    return (
      <div className="container mx-auto animate-pulse p-4 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-[32px] bg-zinc-900 shadow-inner" />
          <div className="space-y-6">
            <div className="h-12 w-3/4 rounded-xl bg-zinc-900" />
            <div className="h-8 w-1/4 rounded-xl bg-zinc-900" />
            <div className="h-32 w-full rounded-2xl bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center bg-black">
        <h1 className="font-space-grotesk text-4xl font-black uppercase text-white tracking-tight">{t('notFound.title')}</h1>
        <p className="mt-4 text-zinc-500 font-light max-w-md leading-relaxed">{t('notFound.description')}</p>
        <Link href="/" className="mt-10 font-space-grotesk text-xs font-black uppercase tracking-[0.3em] text-[#ffc105] border border-[#ffc105]/20 px-8 py-3 rounded-full hover:bg-[#ffc105]/10 transition-all">
          {t('notFound.backToStore')}
        </Link>
      </div>
    );
  }

  const isOutOfStock = availableUnits <= 0;
  const isUnavailable = !product.isCategoryActive;
  const statusLabel = isUnavailable ? t('status.unavailable') : isOutOfStock ? t('status.soldOut') : undefined;

  return (
    <div className="min-h-screen bg-black pb-24">
      <nav className="container mx-auto p-4 md:p-8 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
        <div className="flex items-center ltr:space-x-4 rtl:space-x-reverse space-x-4 flex-wrap gap-y-2">
          <Link href="/" className="transition-colors hover:text-white">{t('breadcrumb.store')}</Link>
          <ChevronRight size={14} className={locale === 'ar' ? 'rotate-180' : ''} />
          <Link
            href={`/categories/${product.categorySlug || product.categoryId}`}
            className="truncate transition-colors hover:text-white max-w-[150px] md:max-w-none"
          >
            {(locale === 'en' ? product.categoryName_en : product.categoryName_ar) || t('breadcrumb.category')}
          </Link>
          <ChevronRight size={14} className={locale === 'ar' ? 'rotate-180' : ''} />
          <span className="truncate text-zinc-400 font-medium max-w-[200px] md:max-w-none">{locale === 'en' ? product.name_en : product.name_ar}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <DynamicProductGallery
            name={locale === 'en' ? product.name_en : product.name_ar}
            images={galleryImages}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
            statusLabel={statusLabel}
          />

          <div className="flex flex-col">
            <header className="mb-10 space-y-4">
              <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 w-fit">
                 <div className="h-1.5 w-1.5 rounded-full bg-[#ffc105] shadow-[0_0_10px_rgba(255,193,5,0.5)]" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">{t('features.authentic')}</span>
              </div>
              <h1 className="font-space-grotesk text-4xl font-black leading-[1.1] text-white md:text-6xl lg:text-7xl uppercase tracking-tight">
                {product.name_en}
              </h1>
              <p className="ltr:text-right rtl:text-right font-arabic text-2xl leading-relaxed text-[#ffc105] font-light shadow-sm">{product.name_ar}</p>
            </header>

            <div className="mb-10 flex flex-wrap items-center gap-8 border-b border-white/5 pb-10">
              <div className="flex items-center gap-4">
                <span className="font-space-grotesk text-5xl font-black tracking-tightest text-white">
                  {displayPrice.toLocaleString(locale)} <span className="text-2xl text-[#ffc105]">{t('pricing.currency')}</span>
                </span>
                {hasSalePrice ? (
                  <s className="font-space-grotesk text-xl font-bold text-zinc-600 decoration-red-900/40">
                    {compareAtPrice.toLocaleString(locale)}
                  </s>
                ) : null}
              </div>
              <div className={`flex items-center gap-2 rounded-full px-4 py-2 border ${isOutOfStock ? "border-red-500/20 bg-red-500/5 text-red-500" : "border-[#ffc105]/20 bg-[#ffc105]/5 text-[#ffc105]"}`}>
                 <Zap size={14} className={isOutOfStock ? "text-red-500" : "text-[#ffc105]"} />
                 <span className="font-space-grotesk text-xs font-black uppercase tracking-widest leading-none">
                   {t('pricing.unitsLeft', { count: availableUnits })}
                 </span>
              </div>
            </div>

            {variantColorOptions.length > 0 ? (
              <div className="mb-8 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 shadow-sm">{t('variants.colorways')}</p>
                <div className="flex flex-wrap gap-4">
                  {variantColorOptions.map((sku: ProductSku) => {
                    const color = sku.variantAttributes?.color ?? sku.variantName;
                    const isActive = sku._id === selectedVariant?._id;
                    return (
                      <button
                        key={sku._id}
                        type="button"
                        onClick={() => {
                          setSelectedSkuId(sku._id);
                          setSelectedImage(sku.linkedImageId ?? product.thumbnail ?? product.images?.[0]);
                        }}
                        className={`flex items-center gap-4 rounded-2xl border px-6 py-4 text-left transition-all shadow-inner ${
                          isActive
                            ? "border-[#ffc105] bg-[#ffc105]/10 text-white shadow-[0_0_20px_rgba(255,193,5,0.1)]"
                            : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <span className="h-4 w-4 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: color }} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : variantOptions.length > 1 ? (
              <div className="mb-8 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 shadow-sm">{t('variants.variants')}</p>
                <div className="flex flex-wrap gap-4">
                  {variantOptions.map((sku: ProductSku) => {
                    const isActive = sku._id === selectedVariant?._id;
                    return (
                      <button
                        key={sku._id}
                        type="button"
                        onClick={() => {
                          setSelectedSkuId(sku._id);
                          setSelectedImage(sku.linkedImageId ?? product.thumbnail ?? product.images?.[0]);
                        }}
                        className={`rounded-2xl border px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all shadow-inner ${
                          isActive
                            ? "border-[#ffc105] bg-[#ffc105]/10 text-white shadow-[0_0_20px_rgba(255,193,5,0.1)]"
                            : "border-white/5 bg-zinc-950 text-zinc-500 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {sku.variantName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedVariant && (product?.skus?.length ?? 0) > 1 ? (
              <div className="mb-10 rounded-[32px] border border-white/5 bg-zinc-950/70 p-8 shadow-inner backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4">{t('variants.selected')}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="rounded-full border border-[#ffc105]/20 bg-[#ffc105]/5 px-5 py-2 text-[#ffc105] font-black uppercase tracking-widest">{selectedVariant.variantName}</span>
                  {selectedVariant.variantAttributes?.size ? (
                    <span className="rounded-full border border-white/10 px-5 py-2 text-zinc-400 font-bold uppercase tracking-widest">{t('variants.size', { size: selectedVariant.variantAttributes.size })}</span>
                  ) : null}
                  {selectedVariant.variantAttributes?.type ? (
                    <span className="rounded-full border border-white/10 px-5 py-2 text-zinc-400 font-bold uppercase tracking-widest">{t('variants.type', { type: selectedVariant.variantAttributes.type })}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mb-12 space-y-6">
              <p className="text-sm md:text-base leading-8 text-zinc-400 font-light">{product.description_en}</p>
              <div className="border-t border-white/5 pt-8 ltr:text-right rtl:text-right">
                <p className="font-arabic text-xl md:text-2xl leading-relaxed text-zinc-500 font-light italic">
                  {product.description_ar}
                </p>
              </div>
            </div>

            <div className="mt-auto space-y-8">
              <button
                disabled={isOutOfStock || isUnavailable}
                onClick={handleAddToCart}
                className="group relative flex w-full items-center justify-center gap-4 overflow-hidden rounded-2xl bg-[#ffc105] py-6 font-space-grotesk text-xl font-black uppercase tracking-[0.3em] text-black transition-all hover:bg-white active:scale-[0.97] disabled:grayscale disabled:opacity-30 shadow-[0_10px_30px_rgba(255,193,5,0.2)]"
              >
                <ShoppingBag size={24} className="group-hover:scale-110 transition-transform" />
                {t('actions.addToCart')}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-5 rounded-3xl border border-white/5 bg-zinc-900/30 p-6 shadow-sm backdrop-blur-sm">
                  <div className="h-12 w-12 rounded-2xl bg-[#ffc105]/10 flex items-center justify-center text-[#ffc105]">
                     <Truck size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 leading-relaxed">{t('features.shipping')}</span>
                </div>
                <div className="flex items-center gap-5 rounded-3xl border border-white/5 bg-zinc-900/30 p-6 shadow-sm backdrop-blur-sm">
                  <div className="h-12 w-12 rounded-2xl bg-[#ffc105]/10 flex items-center justify-center text-[#ffc105]">
                     <ShieldCheck size={24} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 leading-relaxed">{t('features.cod')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 mt-24">
        <RelatedProducts products={product.related_products || []} />
      </div>
    </div>
  );
}
