"use client";

import { useState, type MouseEvent } from "react";
import { Link } from "@/navigation";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { useFavorites } from "@/lib/use-favorites";
import { Heart, ShoppingCart, Star, Zap } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@techworld/ui";

/** Ratings below this average are hidden on the card. */
const MIN_VISIBLE_RATING = 4;

interface ProductCardProps {
  product: {
    _id: Id<"products">;
    name_ar: string;
    name_en: string;
    description_ar?: string;
    description_en?: string;
    selling_price: number;
    compareAtPrice?: number;
    display_stock?: number;
    images: string[];
    thumbnail?: string | null;
    slug?: string;
    categoryName?: string;
    isFeatured?: boolean;
    ratingAverage?: number;
    reviewCount?: number;
    skus?: Array<{
      _id: Id<"skus">;
      price: number;
      compareAtPrice?: number;
      display_stock: number;
      isDefault?: boolean;
      variantName: string;
    }>;
  };
  /** Overrides the discount computed from the card's own prices (e.g. best variant offer). */
  discountPercent?: number;
}

export default function ProductCard({ product, discountPercent }: ProductCardProps) {
  const t = useTranslations("ProductCard");
  const locale = useLocale();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);
  const { isFavorite, toggle } = useFavorites();
  const [isAdding, setIsAdding] = useState(false);

  const defaultSku =
    product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const displayStock = defaultSku?.display_stock ?? product.display_stock ?? 0;
  const displayPrice = defaultSku?.price || product.selling_price;
  const isOutOfStock = displayStock <= 0;
  // The struck-through price follows whichever price is actually shown: a
  // variant-level offer must not be compared against the product root price.
  const compareAtPrice = defaultSku
    ? (defaultSku.compareAtPrice ?? (defaultSku.price === product.selling_price ? product.compareAtPrice : undefined))
    : product.compareAtPrice;
  const hasSalePrice = compareAtPrice !== undefined && compareAtPrice > displayPrice;
  const salePercent =
    discountPercent ??
    (hasSalePrice ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100) : 0);

  const reviewCount = product.reviewCount ?? 0;
  const ratingAverage = product.ratingAverage ?? 0;
  // Only surface ratings that help sell: no "no reviews" placeholder, nothing below 4 stars.
  const showRating = reviewCount > 0 && ratingAverage >= MIN_VISIBLE_RATING;
  const favorited = isFavorite(product._id);
  const name = locale === "en" ? product.name_en : product.name_ar;
  const imageSrc = product.thumbnail || product.images?.[0];

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!defaultSku || isAdding) return;
    setIsAdding(true);
    try {
      await addToCart({
        sessionId,
        productId: product._id,
        skuId: defaultSku._id,
        quantity: 1,
      });
      openCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(product._id).catch((err) => console.error("Failed to update favorites", err));
  };

  return (
    <Link
      href={`/products/${product.slug || product._id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]"
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-border bg-secondary">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-[1.04]",
              isOutOfStock && "opacity-60 grayscale-[40%]",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-label-muted text-xs font-semibold">
            {t("noImage")}
          </div>
        )}

        <div className="absolute top-2.5 flex flex-col items-start gap-1.5 ltr:left-2.5 rtl:right-2.5 sm:top-3 ltr:sm:left-3 rtl:sm:right-3">
          {product.isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm sm:px-2.5 sm:py-1">
              <Zap size={11} className="fill-primary" />
              {t("badges.featured")}
            </span>
          ) : null}
          {salePercent > 0 && !isOutOfStock ? (
            <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-white sm:py-1 sm:text-sm">
              -{salePercent.toLocaleString(locale)}%
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-pressed={favorited}
          aria-label={favorited ? t("favorite.remove") : t("favorite.add")}
          className="absolute top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur-sm transition-all hover:scale-105 hover:border-primary/40 active:scale-95 ltr:right-2.5 rtl:left-2.5 sm:top-3 sm:h-10 sm:w-10 ltr:sm:right-3 rtl:sm:left-3"
        >
          <Heart
            size={18}
            className={cn("transition-colors", favorited ? "fill-destructive text-destructive" : "")}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="mb-1 truncate text-[11px] font-semibold uppercase tracking-wider text-label-muted">
          {product.categoryName || t("placeholderCategory")}
        </span>

        <h3 className="mb-1.5 line-clamp-2 font-space-grotesk text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
          {name}
        </h3>

        <p className="mb-3 line-clamp-2 break-words text-xs leading-relaxed text-label-muted sm:text-sm">
          {locale === "en"
            ? product.description_en || t("placeholder")
            : product.description_ar || t("placeholder")}
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm">
          {showRating ? (
            <span
              className="inline-flex items-center gap-1"
              aria-label={t("rating.aria", { rating: ratingAverage })}
            >
              <Star size={15} className="fill-primary text-primary" />
              <span className="font-bold text-foreground">{ratingAverage.toLocaleString(locale)}</span>
              <span className="text-label-muted">{t("rating.reviews", { count: reviewCount })}</span>
            </span>
          ) : null}
          {showRating ? <span className="hidden h-4 w-px bg-border sm:block" aria-hidden /> : null}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              isOutOfStock ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isOutOfStock ? "bg-destructive" : "bg-emerald-500",
              )}
            />
            {isOutOfStock ? t("stock.outOfStock") : t("stock.inStock")}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="font-space-grotesk text-lg font-bold leading-none tracking-tight text-primary sm:text-2xl">
              {displayPrice.toLocaleString(locale)}{" "}
              <span className="text-xs font-semibold sm:text-sm">EGP</span>
            </span>
            {hasSalePrice ? (
              <s className="text-xs text-label-muted decoration-label-muted/60 sm:text-sm">
                {compareAtPrice.toLocaleString(locale)} EGP
              </s>
            ) : null}
          </div>

          <button
            type="button"
            disabled={isOutOfStock || isAdding}
            onClick={handleAddToCart}
            className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:text-sm"
          >
            <ShoppingCart size={16} />
            {isOutOfStock ? t("actions.outOfStock") : t("actions.add")}
          </button>
        </div>
      </div>
    </Link>
  );
}
