import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, Sparkle } from "lucide-react";
import { Link } from "@/navigation";
import FeaturedProductCard from "./featured-product-card";
import { ProductRail } from "./product-rail";
import type { FeaturedProduct } from "./featured-products";

interface NewArrivalsProps {
  products: FeaturedProduct[];
}

/** Bento layout needs one spotlight plus a full 2×2 grid beside it. */
const BENTO_SIZE = 5;

export default async function NewArrivals({ products }: NewArrivalsProps) {
  const t = await getTranslations("NewArrivals");
  const locale = await getLocale();
  if (products.length === 0) return null;

  const header = (
    <div className="space-y-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
        <Sparkle size={12} className="fill-current" />
        {t("badge")}
      </span>
      <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground md:text-4xl">
        {t("title")} <span className="text-primary">{t("accentTitle")}</span>
      </h2>
    </div>
  );

  const viewAll = (
    <Link
      href="/products?sortOrder=newest"
      className="group inline-flex items-center gap-2 text-label-muted transition-colors hover:text-foreground"
    >
      <span className="text-xs font-semibold">{t("viewAll")}</span>
      <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100" />
    </Link>
  );

  const [spotlight, ...rest] = products;
  const useBento = products.length >= BENTO_SIZE;

  return (
    <section id="new-arrivals" className="bg-background px-4 py-16 md:px-8 md:py-20">
      <div className="container mx-auto space-y-8 md:space-y-10">
        {/* Mobile and small tablets always get the swipeable rail. */}
        <div className={useBento ? "lg:hidden" : undefined}>
          <ProductRail products={products} header={header} />
          <div className="mt-6 flex justify-center md:justify-start">{viewAll}</div>
        </div>

        {useBento ? (
          <div className="hidden space-y-10 lg:block">
            <div className="flex items-end justify-between gap-4">
              {header}
              {viewAll}
            </div>

            <div className="grid grid-cols-4 gap-6">
              <SpotlightCard product={spotlight} locale={locale} label={t("spotlight.label")} cta={t("spotlight.cta")} />
              {rest.slice(0, BENTO_SIZE - 1).map((product) => (
                <FeaturedProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SpotlightCard({
  product,
  locale,
  label,
  cta,
}: {
  product: FeaturedProduct;
  locale: string;
  label: string;
  cta: string;
}) {
  const name = locale === "en" ? product.name_en : product.name_ar;
  const description = locale === "en" ? product.description_en : product.description_ar;
  const defaultSku = product.skus?.find((sku) => sku.isDefault) ?? product.skus?.[0];
  const price = defaultSku?.price || product.selling_price;
  const imageSrc = product.thumbnail || product.images?.[0];

  return (
    <Link
      href={`/products/${product.slug || product._id}`}
      className="group relative col-span-2 row-span-2 flex flex-col overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-secondary">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[15%] top-[20%] h-[55%] rounded-full bg-primary/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-70"
        />
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name}
            fill
            sizes="50vw"
            className="object-contain p-6 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : null}
        <span className="absolute top-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-background ltr:left-4 rtl:right-4">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          {label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-6 px-3 pb-2 pt-5">
        <div className="min-w-0 space-y-1.5">
          <h3 className="font-space-grotesk text-2xl font-bold leading-tight tracking-tight text-foreground">{name}</h3>
          {description ? <p className="line-clamp-2 max-w-md text-sm leading-relaxed text-label-muted">{description}</p> : null}
          <p className="pt-1 font-space-grotesk text-xl font-bold text-foreground">
            {price.toLocaleString(locale)}
            <span className="text-xs font-semibold text-primary ltr:ml-1 rtl:mr-1">EGP</span>
          </p>
        </div>
        <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition-transform group-hover:scale-[1.03] ltr:pl-5 ltr:pr-2 rtl:pl-2 rtl:pr-5">
          {cta}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:rotate-45 rtl:-scale-x-100">
            <ArrowUpRight size={16} />
          </span>
        </span>
      </div>
    </Link>
  );
}
