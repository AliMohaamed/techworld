"use client";

import type { MouseEvent } from "react";
import { Link } from "@/navigation";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ArrowRight, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@techworld/ui";
import { useTranslations, useLocale } from "next-intl";

interface FeaturedProductCardProps {
  product: {
    _id: Id<"products">;
    name_ar: string;
    name_en: string;
    selling_price: number;
    compareAtPrice?: number;
    display_stock?: number;
    images: string[];
    description_ar?: string;
    description_en?: string;
    slug?: string;
    skus?: Array<{
      _id: Id<"skus">;
      price: number;
      display_stock: number;
      isDefault?: boolean;
    }>;
  };
}

export default function FeaturedProductCard({
  product,
}: FeaturedProductCardProps) {
  const t = useTranslations("ProductCard");
  const locale = useLocale();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);

  const defaultSku =
    product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const displayPrice = defaultSku?.price || product.selling_price;
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
      className="group relative block h-[400px] sm:h-[500px] w-full overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 active:scale-[0.99]"
    >
      <div className="absolute inset-0 z-0">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={locale === "en" ? product.name_en : product.name_ar}
            fill
            className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent" />
      </div>

      <div className="absolute inset-0 z-20 flex flex-col items-start justify-end p-5 sm:p-8">
        <div className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 shadow-sm">
          <Zap size={10} className="fill-primary-foreground text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground leading-tight uppercase tracking-wider">
            {t("badges.featured")}
          </span>
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="font-space-grotesk text-xl sm:text-2xl font-bold tracking-tight leading-none text-white">
            {locale === "en" ? product.name_en : product.name_ar}
          </h3>
          {locale === "en" && (
            <p className="text-sm text-white/60 font-normal">
              {product.name_ar}
            </p>
          )}
        </div>

        <p className="mt-2 max-w-sm line-clamp-2 text-sm text-white/70 font-normal leading-relaxed">
          {locale === "en"
            ? product.description_en || t("placeholder")
            : product.description_ar || t("placeholder")}
        </p>

        <div className="w-full border-t border-white/10 pt-4 mt-auto flex items-center justify-between">
          <div>
            {hasSalePrice ? (
              <s className="mb-0.5 block font-space-grotesk text-sm font-semibold text-white/40">
                {product.compareAtPrice?.toLocaleString(locale)} EGP
              </s>
            ) : null}
            <span className="font-space-grotesk text-xl sm:text-2xl font-bold text-primary tracking-tight">
              {displayPrice.toLocaleString(locale)} EGP
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 rtl:gap-2 rtl:sm:gap-3">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition-all group-hover:bg-primary group-hover:text-primary-foreground">
              <ArrowRight
                size={20}
                className={locale === "ar" ? "rotate-180" : ""}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!defaultSku || defaultSku.display_stock < 1}
              className="h-10 px-4 font-space-grotesk text-xs font-bold rounded-xl"
            >
              {defaultSku && defaultSku.display_stock > 0 ? (
                <>
                  <ShoppingCart
                    size={14}
                    className="ltr:mr-1.5 rtl:ml-1.5"
                  />
                  <span>{t("actions.addSimple")}</span>
                </>
              ) : (
                <span>{t("actions.outOfStock")}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}