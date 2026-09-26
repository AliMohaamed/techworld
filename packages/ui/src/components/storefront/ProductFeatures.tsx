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
    <ul className={cn("grid gap-x-8 gap-y-6 sm:grid-cols-2", className)}>
      {visible.map((feature, index) => {
        const title = isArabic ? feature.title_ar : feature.title_en;
        const subtitle = isArabic ? feature.subtitle_ar : feature.subtitle_en;

        return (
          <li key={`${feature.icon}-${index}`} className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/40 text-foreground transition-colors">
              <ProductFeatureIcon icon={feature.icon} />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-bold leading-snug text-foreground">{title}</span>
              {subtitle?.trim() ? (
                <span className="mt-1 block text-sm leading-snug text-label-muted">{subtitle}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
