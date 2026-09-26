"use client";

import { useState } from "react";
import {
  PRODUCT_FEATURE_ICON_KEYS,
  ProductFeatureIcon,
  cn,
} from "@techworld/ui";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Grid picker over the fixed icon set shared with the storefront.
 * Collapsed by default so a long feature list stays scannable.
 */
export function FeatureIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  const t = useTranslations("Catalog.products.form.fields.features");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background px-4 transition-all hover:border-[#ffc105]/30"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/60 text-foreground">
            <ProductFeatureIcon icon={value} size={16} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">
            {isOpen ? t("hidePicker") : t("choosePicker")}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-muted-foreground/40 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto rounded-2xl border border-border bg-background p-4 sm:grid-cols-8">
          {PRODUCT_FEATURE_ICON_KEYS.map((key) => {
            const isSelected = key === value;

            return (
              <button
                key={key}
                type="button"
                title={key}
                aria-label={key}
                aria-pressed={isSelected}
                onClick={() => {
                  onChange(key);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-xl border transition-all",
                  isSelected
                    ? "border-[#ffc105]/50 bg-[#ffc105]/10 text-[#ffc105]"
                    : "border-transparent bg-accent/40 text-muted-foreground/60 hover:border-[#ffc105]/20 hover:text-foreground",
                )}
              >
                <ProductFeatureIcon icon={key} size={16} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
