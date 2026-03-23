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

  // Resolve the default SKU for stock display and cart purposes
  const defaultSku =
    product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const displayStock = defaultSku?.display_stock ?? product.display_stock ?? 0;
  const displayPrice = defaultSku?.price ?? product.selling_price;
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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card transition-all hover:-translate-y-1 hover:  hover:shadow-black/20 dark:hover:shadow-black/50 border border-border active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl border-b border-border bg-secondary">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={locale === "en" ? product.name_en : product.name_ar}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
            {t("noImage")}
          </div>
        )}

        {hasSalePrice && !isOutOfStock ? (
          <div className="absolute ltr:left-4 rtl:right-4 top-4 rounded-full bg-[#ffc105] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-black  ">
            {t("badges.sale")}
          </div>
        ) : null}

        {isOutOfStock ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-[4px] animate-in fade-in duration-500">
            <span className="rounded-xl bg-red-600/20 border border-red-600/50 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
              {t("badges.soldOut")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <span className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#ffc105]/80">
          {product.categoryName || t("placeholderCategory")}
        </span>

        <h3 className="mb-2 line-clamp-1 font-space-grotesk text-[1.4rem] font-black leading-tight text-foreground uppercase tracking-tighter group-hover:text-[#ffc105] transition-colors">
          {locale === "en" ? product.name_en : product.name_ar}
        </h3>

        <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-muted-foreground font-light">
          {locale === "en"
            ? product.description_en || t("placeholder")
            : product.name_ar}
        </p>

        <div className="mt-auto flex items-center gap-4">
          <div className="flex shrink-0 flex-col">
            {hasSalePrice ? (
              <s className="mb-0.5 font-space-grotesk text-sm font-bold tracking-tight text-muted-foreground decoration-red-900/50">
                {product.compareAtPrice?.toLocaleString(locale)}{" "}
                <span className="text-[10px]">EGP</span>
              </s>
            ) : null}
            <span className="font-space-grotesk text-[1.6rem] font-black tracking-tightest text-foreground">
              {displayPrice.toLocaleString(locale)}{" "}
              <span className="text-lg text-[#ffc105]">EGP</span>
            </span>
          </div>

          <button
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#ffc105] px-4 font-black text-black transition-all hover:bg-white active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-30   hover:shadow-[#ffc105]/20"
          >
            <ShoppingCart size={20} className="shrink-0 fill-black/5" />
            <span className="whitespace-nowrap uppercase tracking-widest text-xs">
              {t("actions.add")}
            </span>
          </button>
        </div>
      </div>
    </Link>
  );
}
