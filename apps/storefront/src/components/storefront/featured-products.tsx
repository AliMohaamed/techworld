import type { Id } from "@backend/convex/_generated/dataModel";
import { getTranslations } from "next-intl/server";
import { FeaturedProductsCarousel } from "./FeaturedProductsCarousel";

type FeaturedProduct = {
  _id: Id<"products">;
  name_ar: string;
  name_en: string;
  selling_price: number;
  compareAtPrice?: number;
  display_stock?: number;
  images: string[];
  description_en?: string;
  slug?: string;
  skus?: Array<{
    _id: Id<"skus">;
    price: number;
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
    <section id="featured" className="bg-background px-4 py-20 md:px-8">
      <div className="container mx-auto space-y-10">
        <div className="flex flex-col justify-between gap-5 border-b border-border pb-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-1 w-6 bg-primary rounded-full" />
              <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">{t('badge')}</span>
            </div>
            <h2 className="font-space-grotesk text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {t('title')} <span className="text-label-muted/20">{t('accentTitle')}</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-label-muted">
            {t('description')}
          </p>
        </div>

        <FeaturedProductsCarousel products={products} />
      </div>
    </section>
  );
}