"use client";

import { cn } from "../../lib/utils";
import { getProductFeatureIcon, type ProductFeature } from "../../lib/product-feature-icons";

/**
 * Renders an icon by its registry key. Declared at module scope so React never
 * sees a component identity that changes between renders.
 */
export function ProductFeatureIcon({
  icon,
  size = 20,
  className,
}: {
  icon: string | undefined;
  size?: number;
  className?: string;
}) {
  const Icon = getProductFeatureIcon(icon);
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden="true" />;
}

type ProductFeaturesProps = {
  features?: ProductFeature[] | null;
  locale: string;
  className?: string;
};

/**
 * Optional benefits grid shown under a product's description.
 * Renders nothing when the product has no features, so the section stays opt-in.
 */
export function ProductFeatures({ features, locale, className }: ProductFeaturesProps) {
  const isArabic = locale === "ar";

  const visible = (features ?? []).filter((feature) => {
    const title = isArabic ? feature.title_ar : feature.title_en;
    return Boolean(title?.trim());
  });

  if (visible.length === 0) return null;

  return (
    <ul className={cn("grid grid-cols-2 gap-x-3.5 gap-y-5 sm:gap-x-8 sm:gap-y-6", className)}>
      {visible.map((feature, index) => {
        const title = isArabic ? feature.title_ar : feature.title_en;
        const subtitle = isArabic ? feature.subtitle_ar : feature.subtitle_en;

        return (
          <li key={`${feature.icon}-${index}`} className="flex items-start gap-2.5 sm:gap-4">
            <span className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/40 text-foreground transition-colors">
              <ProductFeatureIcon icon={feature.icon} className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-xs sm:text-sm font-bold leading-snug text-foreground">{title}</span>
              {subtitle?.trim() ? (
                <span className="mt-0.5 sm:mt-1 block text-[11px] sm:text-xs leading-snug text-label-muted">{subtitle}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
