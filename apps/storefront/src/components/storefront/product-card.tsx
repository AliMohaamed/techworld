"use client";

import type { MouseEvent } from "react";
import { Link } from "@/navigation";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingCart } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

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
    slug?: string;
    categoryName?: string;
    skus?: Array<{
      _id: Id<"skus">;
      price: number;
      display_stock: number;
      isDefault?: boolean;
      variantName: string;
    }>;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations("ProductCard");
  const locale = useLocale();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);

  const defaultSku =
    product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const displayStock = defaultSku?.display_stock ?? product.display_stock ?? 0;
  const displayPrice = defaultSku?.price || product.selling_price;
  const isOutOfStock = displayStock <= 0;
  const hasSalePrice =
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > displayPrice;

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!defaultSku) return;
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
    }
  };

  return (
    <Link
      href={`/products/${product.slug || product._id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-card border border-border transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99]"
    >
      <div className="relative aspect-square w-full overflow-hidden border-b border-border bg-secondary">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={locale === "en" ? product.name_en : product.name_ar}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-label-muted text-xs font-semibold">
            {t("noImage")}
          </div>
        )}

        {hasSalePrice && !isOutOfStock ? (
          <div className="absolute ltr:left-3 rtl:right-3 top-3 rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
            {t("badges.sale")}
          </div>
        ) : null}

        {isOutOfStock ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
            <span className="rounded-lg bg-destructive/15 border border-destructive/30 px-4 py-2 text-xs font-bold text-destructive">
              {t("badges.soldOut")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="mb-1 text-[11px] font-semibold text-primary/70 uppercase tracking-wider truncate">
          {product.categoryName || t("placeholderCategory")}
        </span>

        <h3 className="mb-2 line-clamp-2 font-space-grotesk text-sm sm:text-base font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
          {locale === "en" ? product.name_en : product.name_ar}
        </h3>

        <p className="hidden sm:block mb-4 line-clamp-2 text-sm leading-relaxed text-label-muted">
          {locale === "en"
            ? product.description_en || t("placeholder")
            : product.description_ar || t("placeholder")}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {hasSalePrice ? (
              <s className="text-xs text-label-muted line-through decoration-destructive/40">
                {product.compareAtPrice?.toLocaleString(locale)}{" "}
                <span className="text-[10px]">EGP</span>
              </s>
            ) : null}
            <span className="font-space-grotesk text-base sm:text-lg font-bold tracking-tight text-foreground leading-none">
              {displayPrice.toLocaleString(locale)}{" "}
              <span className="text-xs text-primary font-semibold">EGP</span>
            </span>
          </div>

          <button
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="flex h-9 w-9 sm:h-10 sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-primary sm:px-4 font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ShoppingCart size={15} className="sm:hidden fill-primary-foreground/10" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold">
              <ShoppingCart size={14} className="fill-primary-foreground/10" />
              {t("actions.add")}
            </span>
          </button>
        </div>
      </div>
    </Link>
  );
}