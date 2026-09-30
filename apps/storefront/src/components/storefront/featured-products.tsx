import type { Id } from "@backend/convex/_generated/dataModel";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { FeaturedProductsCarousel } from "./FeaturedProductsCarousel";

export type FeaturedProduct = {
  _id: Id<"products">;
  name_ar: string;
  name_en: string;
  selling_price: number;
  compareAtPrice?: number;
  display_stock?: number;
  thumbnail?: string | null;
  images: string[];
  description_en?: string;
  description_ar?: string;
  slug?: string;
  skus?: Array<{
    _id: Id<"skus">;
    price: number;
    compareAtPrice?: number;
    display_stock: number;
    isDefault?: boolean;
  }>;
  isFeatured?: boolean;
};

interface FeaturedProductsProps {
  products: FeaturedProduct[];
}

export default async function FeaturedProducts({ products }: FeaturedProductsProps) {
  const t = await getTranslations('FeaturedProducts');
  if (!products || products.length === 0) return null;

  return (
    <section id="featured" className="relative overflow-hidden bg-background px-4 py-16 md:px-8 md:py-24">
      {/* Soft brand glow to set the section apart from the plain catalogue sections around it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <div className="container relative mx-auto space-y-10 md:space-y-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Sparkles size={12} />
            {t('badge')}
          </span>
          <h2 className="font-space-grotesk text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {t('title')} <span className="text-primary">{t('accentTitle')}</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-label-muted md:text-base">
            {t('description')}
          </p>
        </div>

        <FeaturedProductsCarousel products={products} />
      </div>
    </section>
  );
}
