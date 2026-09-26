"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ChevronRight, Heart, Minus, Plus, ShoppingBag, Truck, ShieldCheck, Zap } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { DynamicProductGallery } from "@/components/storefront/DynamicProductGallery";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { StarRating } from "@/components/storefront/star-rating";
import { useFavorites } from "@/lib/use-favorites";
import { RelatedProducts, ColorSwatch, getColorDisplayName, ProductFeatures, cn } from "@techworld/ui";
import { useTranslations, useLocale } from "next-intl";

const MAX_QUANTITY = 10;

type ProductSku = {
  _id: Id<"skus">;
  variantName: string;
  variantAttributes?: {
    color?: string;
    size?: string;
    type?: string;
    colorCode?: string;
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
  const router = useRouter();
  const addItemsToCart = useMutation(api.cart.addItemsToCart);
  const product = useQuery(api.products.getBySlug, slug ? { slug: slug as string } : "skip");
  const [selectedSkuId, setSelectedSkuId] = useState<Id<"skus"> | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [unitOverrides, setUnitOverrides] = useState<Record<number, Id<"skus">>>({});
  const [isAdding, setIsAdding] = useState(false);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const defaultSkuId = product?.skus?.find((sku: ProductSku) => sku.isDefault)?._id ?? product?.skus?.[0]?._id;
  if (selectedSkuId === undefined && defaultSkuId !== undefined) {
    setSelectedSkuId(defaultSkuId);
  } else if (selectedSkuId !== undefined && !product?.skus?.length) {
    setSelectedSkuId(undefined);
  }

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
  const variantOptions: ProductSku[] = product?.skus ?? [];

  // The list the shopper picks from: colorways when the product is colour-based,
  // otherwise the raw variant list.
  const hasColorways = variantColorOptions.length > 0;
  const pickerOptions: ProductSku[] = hasColorways ? variantColorOptions : variantOptions;
  const allowsPerUnitChoice = pickerOptions.length > 1;

  const optionById = useMemo(() => {
    const map = new Map<Id<"skus">, ProductSku>();
    for (const sku of variantOptions) {
      map.set(sku._id, sku);
    }
    return map;
  }, [variantOptions]);

  // Total units purchasable: across every option when variants can be mixed,
  // otherwise just the selected one.
  const totalAvailable = allowsPerUnitChoice
    ? pickerOptions.reduce((sum, sku) => sum + Math.max(0, sku.display_stock), 0)
    : Math.max(0, selectedVariant?.display_stock ?? 0);
  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, totalAvailable));
  const effectiveQuantity = Math.min(quantity, maxQuantity);

  // Assign a SKU to every unit, falling back to the next option with remaining
  // stock so the shopper can never allocate more units than a variant covers.
  const unitSkuIds = useMemo(() => {
    const counts = new Map<Id<"skus">, number>();
    const result: Id<"skus">[] = [];
    const capacityOf = (skuId: Id<"skus"> | undefined) =>
      skuId ? Math.max(0, optionById.get(skuId)?.display_stock ?? 0) : 0;

    for (let index = 0; index < effectiveQuantity; index += 1) {
      const preferred = index === 0 ? selectedSkuId : unitOverrides[index] ?? selectedSkuId;
      let chosen = preferred;
      if (!chosen || (counts.get(chosen) ?? 0) >= capacityOf(chosen)) {
        chosen =
          pickerOptions.find((sku) => (counts.get(sku._id) ?? 0) < Math.max(0, sku.display_stock))?._id ?? preferred;
      }
      if (!chosen) break;
      counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
      result.push(chosen);
    }

    return result;
  }, [effectiveQuantity, optionById, pickerOptions, selectedSkuId, unitOverrides]);

  const unitCounts = useMemo(() => {
    const counts = new Map<Id<"skus">, number>();
    for (const skuId of unitSkuIds) {
      counts.set(skuId, (counts.get(skuId) ?? 0) + 1);
    }
    return counts;
  }, [unitSkuIds]);

  const galleryImages = product
    ? uniqueImages([selectedVariant?.linkedImageId, product.thumbnail, ...(product.images ?? [])])
    : [];
  const displayPrice = selectedVariant?.price || product?.selling_price || 0;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice;
  const hasSalePrice = compareAtPrice !== undefined && compareAtPrice > displayPrice;
  const availableUnits = selectedVariant?.display_stock ?? 0;
  const totalPrice = unitSkuIds.reduce(
    (sum, skuId) => sum + (optionById.get(skuId)?.price || displayPrice),
    0,
  );

  const handleVariantSelect = (skuId: Id<"skus">, linkedImage?: string) => {
    setSelectedSkuId(skuId);
    setSelectedImage(linkedImage ?? product?.thumbnail ?? product?.images?.[0]);
  };

  const handleUnitSelect = (index: number, skuId: Id<"skus">) => {
    if (index === 0) {
      const option = optionById.get(skuId);
      handleVariantSelect(skuId, option?.linkedImageId ?? product?.thumbnail ?? product?.images?.[0]);
      return;
    }
    setUnitOverrides((previous) => ({ ...previous, [index]: skuId }));
  };

  const handleQuantityChange = (next: number) => {
    setQuantity(Math.max(1, Math.min(maxQuantity, next)));
  };

  const handleAddToCart = async (mode: "cart" | "buyNow" = "cart") => {
    if (!product || unitSkuIds.length === 0 || isAdding) return;
    const items = Array.from(unitCounts.entries()).map(([skuId, unitQuantity]) => ({
      skuId,
      quantity: unitQuantity,
    }));

    setIsAdding(true);
    try {
      await addItemsToCart({
        sessionId,
        productId: product._id,
        items,
      });
      setQuantity(1);
      setUnitOverrides({});
      if (mode === "buyNow") {
        router.push("/checkout");
      } else {
        openCart();
      }
    } catch (err) {
      console.error("Failed to add to cart", err);
    } finally {
      setIsAdding(false);
    }
  };

  if (product === undefined) {
    return (
      <div className="container mx-auto animate-pulse p-4 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-muted" />
          <div className="space-y-6">
            <div className="h-12 w-3/4 rounded-xl bg-muted" />
            <div className="h-8 w-1/4 rounded-xl bg-muted" />
            <div className="h-32 w-full rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center bg-background">
        <h1 className="font-space-grotesk text-4xl font-black uppercase text-foreground tracking-tight">{t('notFound.title')}</h1>
        <p className="mt-4 text-muted-foreground font-light max-w-md leading-relaxed">{t('notFound.description')}</p>
        <Link href="/" className="mt-10 font-space-grotesk text-xs font-black uppercase text-primary border border-primary/20 px-8 py-3 rounded-lg hover:bg-primary/10 transition-all">
          {t('notFound.backToStore')}
        </Link>
      </div>
    );
  }

  const isOutOfStock = availableUnits <= 0;
  const isUnavailable = !product.isCategoryActive;
  const statusLabel = isUnavailable ? t('status.unavailable') : isOutOfStock ? t('status.soldOut') : undefined;
  const isPurchasable = !isOutOfStock && !isUnavailable && unitSkuIds.length > 0;
  const showUnitPicker = allowsPerUnitChoice && effectiveQuantity > 1 && isPurchasable;

  return (
    <div className="min-h-screen bg-background pb-24 transition-colors">
      <nav className="container mx-auto p-4 md:p-8 text-[10px] font-black uppercase text-label-muted">
        <div className="flex items-center ltr:space-x-4 rtl:space-x-reverse space-x-4 flex-wrap gap-y-2">
          <Link href="/" className="transition-colors hover:text-foreground">{t('breadcrumb.store')}</Link>
          <ChevronRight size={14} className={locale === 'ar' ? 'rotate-180' : ''} />
          <Link
            href={`/categories/${product.categorySlug || product.categoryId}`}
            className="truncate transition-colors hover:text-foreground max-w-[150px] md:max-w-none"
          >
            {(locale === 'en' ? product.categoryName_en : product.categoryName_ar) || t('breadcrumb.category')}
          </Link>
          <ChevronRight size={14} className={locale === 'ar' ? 'rotate-180' : ''} />
          <span className="truncate text-label-muted font-medium max-w-[200px] md:max-w-none">{locale === 'en' ? product.name_en : product.name_ar}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:gap-16 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-24">
            <DynamicProductGallery
              name={locale === 'en' ? product.name_en : product.name_ar}
              images={galleryImages}
              selectedImage={selectedImage}
              onSelectImage={setSelectedImage}
              statusLabel={statusLabel}
            />
          </div>

          <div className="flex flex-col">
            <header className="mb-10 space-y-4">
              {/* <div className="inline-flex items-center space-x-2 bg-accent border border-border rounded-full px-4 py-2 w-fit">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ffc105] shadow-[0_0_10px_rgba(255,193,5,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">{t('features.authentic')}</span>
              </div> */}
              <h1 className="font-space-grotesk text-4xl font-black leading-[1.1] text-foreground md:text-6xl lg:text-7xl uppercase tracking-tightest">
                {product.name_en}
              </h1>
              <p className="ltr:text-right rtl:text-right font-arabic text-2xl leading-relaxed text-primary font-light">{product.name_ar}</p>
              <a href="#reviews" className="inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-80">
                <StarRating value={product.ratingAverage} size={16} />
                {product.reviewCount > 0 ? (
                  <span className="font-bold text-foreground">{product.ratingAverage.toLocaleString(locale)}</span>
                ) : null}
                <span className="text-label-muted">{t('reviews.reviewCount', { count: product.reviewCount })}</span>
              </a>
            </header>

            <div className="mb-10 flex flex-wrap items-center gap-8 border-b border-border pb-10">
              <div className="flex items-center gap-4">
                <span className="font-space-grotesk text-5xl font-black tracking-tightest text-foreground">
                  {displayPrice.toLocaleString(locale)} <span className="text-2xl text-primary">{t('pricing.currency')}</span>
                </span>
                {hasSalePrice ? (
                  <s className="font-space-grotesk text-xl font-bold text-label-muted/30 decoration-destructive/40">
                    {compareAtPrice.toLocaleString(locale)}
                  </s>
                ) : null}
              </div>
              {/* <div className={`flex items-center gap-2 rounded-full px-4 py-2 border ${isOutOfStock ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-[#ffc105]/20 bg-[#ffc105]/5 text-[#ffc105]"}`}>
                <Zap size={14} className={isOutOfStock ? "text-destructive" : "text-[#ffc105]"} />
                <span className="font-space-grotesk text-xs font-black uppercase leading-none">
                  {t('pricing.unitsLeft', { count: availableUnits })}
                </span>
              </div> */}
            </div>

            {variantColorOptions.length > 0 ? (
              <div className="mb-8 space-y-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground/30 shadow-sm">{t('variants.colorways')}</p>
                <div className="flex flex-wrap gap-4">
                  {variantColorOptions.map((sku: ProductSku) => {
                    const colorRaw = sku.variantAttributes?.color ?? sku.variantName;
                    const color = getColorDisplayName(colorRaw, locale);
                    const colorValue = sku.variantAttributes?.colorCode || sku.variantAttributes?.color || sku.variantName;
                    const isActive = sku._id === selectedVariant?._id;
                    return (
                      <button
                        key={sku._id}
                        type="button"
                        onClick={() => {
                          handleVariantSelect(sku._id, sku.linkedImageId ?? product.thumbnail ?? product.images?.[0]);
                        }}
                        className={`flex items-center gap-3.5 rounded-xl border px-5 py-4 text-left transition-all ${isActive
                          ? "border-primary bg-primary/10 text-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}
                      >
                        <ColorSwatch
                          color={colorValue}
                          fallbackName={sku.variantName}
                          size="md"
                          selected={isActive}
                        />
                        <span className="text-xs font-black uppercase tracking-tight">{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : variantOptions.length > 1 ? (
              <div className="mb-8 space-y-4">
                <p className="text-[10px] font-black uppercase text-muted-foreground/40 shadow-sm">{t('variants.variants')}</p>
                <div className="flex flex-wrap gap-4">
                  {variantOptions.map((sku: ProductSku) => {
                    const isActive = sku._id === selectedVariant?._id;
                    const colorValue = sku.variantAttributes?.colorCode || sku.variantAttributes?.color || sku.variantName;
                    return (
                      <button
                        key={sku._id}
                        type="button"
                        onClick={() => {
                          handleVariantSelect(sku._id, sku.linkedImageId ?? product.thumbnail ?? product.images?.[0]);
                        }}
                        className={`flex items-center gap-2.5 rounded-xl border px-5 py-3.5 text-xs font-black uppercase transition-all ${isActive
                          ? "border-primary bg-primary/10 text-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"
                          }`}
                      >
                        <ColorSwatch
                          color={colorValue}
                          fallbackName={sku.variantName}
                          size="xs"
                          selected={isActive}
                        />
                        <span>{getColorDisplayName(sku.variantName, locale)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}



            <div className="mb-12 space-y-6">
              {locale === "ar" ? (
                <p className="font-arabic text-lg md:text-xl leading-relaxed text-label-muted font-medium">
                  {product.description_ar}
                </p>
              ) : (
                <p className="text-sm md:text-base leading-8 text-label-muted font-medium">{product.description_en}</p>
              )}

              {/* Optional benefits grid; renders nothing when the product has no features. */}
              <ProductFeatures
                features={product.features}
                locale={locale}
                className="border-t border-border pt-8"
              />
            </div>

            <div className="mt-auto space-y-8">
              <div className="flex flex-wrap items-center gap-5">
                <span className="font-space-grotesk text-sm font-black uppercase tracking-tight text-foreground">
                  {t('quantity.label')}
                </span>
                <div className="flex items-center rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    aria-label={t('quantity.decrease')}
                    disabled={!isPurchasable || effectiveQuantity <= 1}
                    onClick={() => handleQuantityChange(effectiveQuantity - 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                  >
                    <Minus size={16} />
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-[3rem] text-center font-space-grotesk text-lg font-black text-foreground"
                  >
                    {effectiveQuantity.toLocaleString(locale)}
                  </span>
                  <button
                    type="button"
                    aria-label={t('quantity.increase')}
                    disabled={!isPurchasable || effectiveQuantity >= maxQuantity}
                    onClick={() => handleQuantityChange(effectiveQuantity + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {isPurchasable && effectiveQuantity >= maxQuantity ? (
                  <span className="text-[10px] font-black uppercase text-label-muted">
                    {t('quantity.maxReached', { count: maxQuantity })}
                  </span>
                ) : null}
              </div>

              {showUnitPicker ? (
                <div className="space-y-4 rounded-2xl border border-border bg-accent/20 p-6">
                  <p className="text-[10px] font-black uppercase text-label-muted">
                    {hasColorways ? t('unitSelection.colorTitle') : t('unitSelection.variantTitle')}
                  </p>
                  <div className="space-y-3">
                    {unitSkuIds.map((unitSkuId, index) => (
                      <div
                        key={`unit-${index}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-[4.5rem] text-[10px] font-black uppercase text-muted-foreground">
                          {t('unitSelection.item', { index: index + 1 })}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {pickerOptions.map((sku: ProductSku) => {
                            const isActive = sku._id === unitSkuId;
                            const otherUnitsUsing = (unitCounts.get(sku._id) ?? 0) - (isActive ? 1 : 0);
                            const isExhausted = otherUnitsUsing >= Math.max(0, sku.display_stock);
                            const label = getColorDisplayName(sku.variantAttributes?.color ?? sku.variantName, locale);
                            const colorValue =
                              sku.variantAttributes?.colorCode || sku.variantAttributes?.color || sku.variantName;
                            return (
                              <button
                                key={`${index}-${sku._id}`}
                                type="button"
                                disabled={isExhausted && !isActive}
                                onClick={() => handleUnitSelect(index, sku._id)}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-tight transition-all disabled:cursor-not-allowed disabled:opacity-30 ${isActive
                                  ? "border-primary bg-primary/10 text-foreground"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                                  }`}
                              >
                                <ColorSwatch
                                  color={colorValue}
                                  fallbackName={sku.variantName}
                                  size="xs"
                                  selected={isActive}
                                />
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {effectiveQuantity > 1 ? (
                <div className="flex items-center justify-between border-t border-border pt-6">
                  <span className="text-[10px] font-black uppercase text-label-muted">{t('pricing.total')}</span>
                  <span className="font-space-grotesk text-2xl font-black tracking-tightest text-foreground">
                    {totalPrice.toLocaleString(locale)} <span className="text-base text-primary">{t('pricing.currency')}</span>
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-[1fr_auto] gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <button
                  type="button"
                  disabled={!isPurchasable || isAdding}
                  onClick={() => handleAddToCart("cart")}
                  className="group relative flex items-center justify-center gap-4 rounded-xl bg-primary py-5 font-space-grotesk text-lg font-black uppercase text-primary-foreground transition-all hover:brightness-110 active:scale-[0.97] disabled:grayscale disabled:opacity-30"
                >
                  <ShoppingBag size={24} className="group-hover:scale-110 transition-transform" />
                  {effectiveQuantity > 1
                    ? t('actions.addCountToCart', { count: effectiveQuantity })
                    : t('actions.addToCart')}
                </button>
                <button
                  type="button"
                  disabled={!isPurchasable || isAdding}
                  onClick={() => handleAddToCart("buyNow")}
                  className="group relative order-3 col-span-2 flex items-center justify-center gap-4 rounded-xl border border-border bg-card py-5 font-space-grotesk text-lg font-black uppercase text-foreground transition-all hover:border-primary/50 active:scale-[0.97] disabled:grayscale disabled:opacity-30 sm:order-none sm:col-span-1"
                >
                  <Zap size={24} className="text-primary group-hover:scale-110 transition-transform" />
                  {t('actions.buyNow')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleFavorite(product._id).catch((err) => console.error("Failed to update favorites", err));
                  }}
                  aria-pressed={isFavorite(product._id)}
                  aria-label={isFavorite(product._id) ? t('favorite.remove') : t('favorite.add')}
                  title={isFavorite(product._id) ? t('favorite.remove') : t('favorite.add')}
                  className={cn(
                    "flex w-16 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95",
                    isFavorite(product._id)
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-border bg-card text-foreground hover:border-primary/40",
                  )}
                >
                  <Heart size={24} className={isFavorite(product._id) ? "fill-destructive" : ""} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-5 rounded-2xl border border-border bg-accent/20 p-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Truck size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-label-muted leading-relaxed">{t('features.shipping')}</span>
                </div>
                <div className="flex items-center gap-5 rounded-2xl border border-border bg-accent/20 p-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase text-label-muted leading-relaxed">{t('features.cod')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 mt-24">
        <ProductReviews productId={product._id} />
      </div>

      <div className="container mx-auto px-4 md:px-8 mt-24">
        <RelatedProducts products={product.related_products || []} />
      </div>
    </div>
  );
}
