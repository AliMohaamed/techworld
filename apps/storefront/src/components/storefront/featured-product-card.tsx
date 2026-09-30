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
import { Heart, Loader2, ShoppingCart } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@techworld/ui";

interface FeaturedProductCardProps {
  product: {
    _id: Id<"products">;
    name_ar: string;
    name_en: string;
    selling_price: number;
    compareAtPrice?: number;
    display_stock?: number;
    thumbnail?: string | null;
    images: string[];
    slug?: string;
    skus?: Array<{
      _id: Id<"skus">;
      price: number;
      compareAtPrice?: number;
      display_stock: number;
      isDefault?: boolean;
    }>;
  };
}

// The product design carries its own name, so the card shows it uncropped and
// keeps the commerce details (price, offer, add to cart) beneath it.
export default function FeaturedProductCard({ product }: FeaturedProductCardProps) {
  const t = useTranslations("ProductCard");
  const locale = useLocale();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const addToCart = useMutation(api.cart.addToCart);
  const [isAdding, setIsAdding] = useState(false);

  const defaultSku = product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const displayPrice = defaultSku?.price || product.selling_price;
  const displayStock = defaultSku?.display_stock ?? product.display_stock ?? 0;
  const isOutOfStock = !defaultSku || displayStock <= 0;
  // Compare against the price actually shown: a variant offer must not use the product root price.
  const compareAtPrice = defaultSku
    ? (defaultSku.compareAtPrice ?? (defaultSku.price === product.selling_price ? product.compareAtPrice : undefined))
    : product.compareAtPrice;
  const hasSalePrice = compareAtPrice !== undefined && compareAtPrice > displayPrice;
  const salePercent = hasSalePrice ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100) : 0;

  const name = locale === "en" ? product.name_en : product.name_ar;
  const imageSrc = product.thumbnail || product.images?.[0];
  const favorited = isFavorite(product._id);

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!defaultSku || isAdding) return;
    setIsAdding(true);
    try {
      await addToCart({ sessionId, productId: product._id, skuId: defaultSku._id, quantity: 1 });
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
      aria-label={name}
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Stage: the design is shown in full, never cropped or overlaid. */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-secondary">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-1/4 h-1/2 rounded-full bg-primary/15 opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        />
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 80vw"
            className={cn(
              "object-contain transition-transform duration-700 ease-out group-hover:scale-[1.04]",
              isOutOfStock && "opacity-50 grayscale",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-label-muted">
            {t("noImage")}
          </div>
        )}

        {salePercent > 0 && !isOutOfStock ? (
          <span className="absolute top-3 rounded-full bg-destructive px-2.5 py-1 font-space-grotesk text-xs font-bold text-white shadow-lg shadow-destructive/30 ltr:left-3 rtl:right-3">
            -{salePercent.toLocaleString(locale)}%
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-pressed={favorited}
          aria-label={favorited ? t("favorite.remove") : t("favorite.add")}
          className={cn(
            "absolute top-3 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 ltr:right-3 rtl:left-3",
            // Stays out of the way of the design until the shopper engages with the card.
            !favorited && "md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
          )}
        >
          <Heart size={16} className={cn("transition-colors", favorited && "fill-destructive text-destructive")} />
        </button>

        {isOutOfStock ? (
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground backdrop-blur-md">
            {t("badges.soldOut")}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
        <div className="min-w-0">
          <p className="font-space-grotesk text-xl font-bold leading-none tracking-tight text-foreground">
            {displayPrice.toLocaleString(locale)}
            <span className="text-xs font-semibold text-primary ltr:ml-1 rtl:mr-1">EGP</span>
          </p>
          {hasSalePrice ? (
            <s className="mt-1 block text-xs text-label-muted decoration-destructive/50">
              {compareAtPrice.toLocaleString(locale)} EGP
            </s>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          aria-label={isOutOfStock ? t("actions.outOfStock") : t("actions.add")}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-label-muted disabled:shadow-none"
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
          <span>{isOutOfStock ? t("badges.soldOut") : t("actions.addSimple")}</span>
        </button>
      </div>
    </Link>
  );
}
