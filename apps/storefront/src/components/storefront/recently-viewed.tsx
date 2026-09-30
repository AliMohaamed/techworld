"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { History, X } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Link } from "@/navigation";
import { useRecentlyViewed } from "@/lib/recently-viewed";

/**
 * "Continue where you left off" strip for returning shoppers. History lives in
 * this browser only, so first-time visitors never see an empty section.
 */
export default function RecentlyViewed() {
  const t = useTranslations("RecentlyViewed");
  const locale = useLocale();
  const { ids, clear } = useRecentlyViewed();
  const products = useQuery(api.products.listByIds, ids.length > 0 ? { ids } : "skip");

  if (ids.length === 0 || !products || products.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-title" className="px-4 pb-2 pt-8 md:px-8 md:pt-10">
      <div className="container mx-auto rounded-3xl border border-border bg-card/60 p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <History size={17} />
            </span>
            <div>
              <h2 id="recently-viewed-title" className="font-space-grotesk text-base font-bold leading-tight text-foreground md:text-lg">
                {t("title")}
              </h2>
              <p className="text-xs text-label-muted">{t("description")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-label-muted transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={13} />
            {t("clear")}
          </button>
        </div>

        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-px-4 [scrollbar-width:none] md:-mx-6 md:gap-4 md:px-6 md:scroll-px-6 [&::-webkit-scrollbar]:hidden">
          {products.map((product) => {
            const name = locale === "en" ? product.name_en : product.name_ar;
            const sku = product.skus.find((s) => s.isDefault) ?? product.skus[0];
            const price = sku?.price || product.selling_price;
            const compareAt = sku?.compareAtPrice ?? product.compareAtPrice;
            const onSale = compareAt !== undefined && compareAt > price;
            const soldOut = !sku || sku.display_stock <= 0;
            const imageSrc = product.thumbnail || product.images[0];

            return (
              <li key={product._id} className="w-[9.5rem] shrink-0 snap-start md:w-44">
                <Link
                  href={`/products/${product.slug || product._id}`}
                  className="group flex h-full flex-col gap-2.5 rounded-2xl p-1.5 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={name}
                        fill
                        sizes="176px"
                        className={`object-contain transition-transform duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`}
                      />
                    ) : null}
                    {soldOut ? (
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
                        {t("soldOut")}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 px-1">
                    <p className="line-clamp-1 text-xs font-semibold text-foreground">{name}</p>
                    <p className="flex items-baseline gap-1.5 font-space-grotesk text-sm font-bold text-foreground">
                      <span className={onSale ? "text-destructive" : undefined}>
                        {price.toLocaleString(locale)}
                        <span className="text-[10px] font-semibold text-primary ltr:ml-0.5 rtl:mr-0.5">EGP</span>
                      </span>
                      {onSale ? (
                        <s className="text-[11px] font-medium text-label-muted">{compareAt.toLocaleString(locale)}</s>
                      ) : null}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
