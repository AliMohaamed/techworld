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

  // Resolve default SKU for stock and cart purposes
  const defaultSku =
    product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const displayPrice = defaultSku?.price ?? product.selling_price;
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
      className="group relative block h-[500px] w-full overflow-hidden rounded-3xl border border-border bg-card/40 transition-all hover:border-[#ffc105]/20  "
    >
      <div className="absolute inset-0 z-0">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={locale === "en" ? product.name_en : product.name_ar}
            fill
            className="object-cover opacity-60 transition-transform duration-700 group-hover:rotate-1 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-secondary" />
        )}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="absolute inset-0 z-20 flex flex-col items-start justify-end space-y-4 p-8">
        <div className="flex items-center space-x-2 rounded-full bg-[#ffc105] px-3 py-1 scale-90 ltr:origin-left rtl:origin-right shadow-[0_0_15px_rgba(255,193,5,0.3)]">
          <Zap size={12} className="fill-black text-black" />
          <span className="text-[10px] font-black uppercase tracking-widest text-black leading-tight">
            {t("badges.featured")}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="font-space-grotesk text-2xl font-black uppercase tracking-tighter leading-none text-foreground lg:text-3xl">
            {locale === "en" ? product.name_en : product.name_ar}
          </h3>
          {locale === "en" && (
            <p className="font-arabic text-sm text-muted-foreground font-light">
              {product.name_ar}
            </p>
          )}
        </div>

        <p className="max-w-sm line-clamp-2 text-sm text-muted-foreground font-light leading-relaxed h-[2.8rem] overflow-hidden overflow-ellipsis">
          {locale === "en"
            ? product.description_en || t("placeholder")
            : product.description_ar || t("placeholder")}
        </p>

        <div className="w-full border-t border-border pt-4 flex items-center justify-between">
          <div>
            {hasSalePrice ? (
              <s className="mb-1 block font-space-grotesk text-sm font-bold text-muted-foreground/60">
                {product.compareAtPrice?.toLocaleString(locale)} EGP
              </s>
            ) : null}
            <span className="font-space-grotesk text-2xl font-black text-[#ffc105] tracking-tight">
              {displayPrice.toLocaleString(locale)} EGP
            </span>
          </div>
          <div className="flex items-center ltr:space-x-3 rtl:space-x-reverse space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/50 text-foreground transition-all group-hover:bg-[#ffc105] group-hover:text-black  ">
              <ArrowRight
                size={22}
                className={locale === "ar" ? "rotate-180" : ""}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!defaultSku || defaultSku.display_stock < 1}
              className="h-12 px-6 font-space-grotesk text-xs font-black uppercase tracking-widest rounded-2xl   hover:shadow-[#ffc105]/20 group/btn"
            >
              {defaultSku && defaultSku.display_stock > 0 ? (
                <>
                  <ShoppingCart
                    size={16}
                    className="ltr:mr-2 rtl:ml-2 group-hover/btn:scale-110 transition-transform"
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
