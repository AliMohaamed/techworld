"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  cn,
} from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useTranslations, useLocale } from "next-intl";
import { Percent, Tag, Layers } from "lucide-react";

export type OfferTarget = {
  _id: Id<"products">;
  name_en: string;
  name_ar: string;
  selling_price: number;
  compareAtPrice?: number;
  discountPercent: number;
  variantCount: number;
};

interface OfferFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single product edit, or null when running a bulk campaign. */
  product: OfferTarget | null;
  /** Products selected for a bulk campaign; ignored when `product` is set. */
  bulkTargets?: OfferTarget[];
}

const QUICK_PICKS = [10, 15, 20, 25, 30, 50];

export function OfferFormSheet({
  open,
  onOpenChange,
  product,
  bulkTargets = [],
}: OfferFormSheetProps) {
  const t = useTranslations("Marketing.offers");
  const locale = useLocale();
  const setOffer = useMutation(api.offers.setProductOffer);
  const bulkSetOffers = useMutation(api.offers.bulkSetOffers);

  const [discount, setDiscount] = useState<string>("20");
  const [applyToVariants, setApplyToVariants] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBulk = !product;

  useEffect(() => {
    if (!open) return;
    setDiscount(product?.discountPercent ? String(product.discountPercent) : "20");
    setApplyToVariants(true);
  }, [open, product]);

  const parsedDiscount = Number(discount);
  const isValidDiscount =
    Number.isFinite(parsedDiscount) && parsedDiscount > 0 && parsedDiscount < 100;

  // The anchor is the original price, so re-pricing a live offer never
  // compounds off the already-reduced price. Mirrors the backend.
  const anchor = useMemo(() => {
    if (!product) return 0;
    return product.compareAtPrice && product.compareAtPrice > product.selling_price
      ? product.compareAtPrice
      : product.selling_price;
  }, [product]);

  const previewPrice = isValidDiscount ? Math.round(anchor * (1 - parsedDiscount / 100)) : anchor;
  const previewSavings = Math.max(0, anchor - previewPrice);

  const handleSubmit = async () => {
    if (!isValidDiscount) {
      toast.error(t("messages.invalidDiscount"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (isBulk) {
        const result = await bulkSetOffers({
          productIds: bulkTargets.map((p) => p._id),
          discountPercent: parsedDiscount,
          applyToVariants,
        });
        toast.success(t("messages.bulkApplied", { count: result.appliedCount }));
        if (result.skipped.length > 0) {
          toast.warning(t("messages.bulkSkipped", { count: result.skipped.length }));
        }
      } else {
        await setOffer({
          productId: product._id,
          discountPercent: parsedDiscount,
          applyToVariants,
        });
        toast.success(t("messages.applied"));
      }
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("messages.operationFailed");
      toast.error(t("messages.operationFailed"), { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetName = product
    ? locale === "ar"
      ? product.name_ar
      : product.name_en
    : t("form.bulkTargets", { count: bulkTargets.length });

  const variantCount = product?.variantCount ?? bulkTargets.reduce((s, p) => s + p.variantCount, 0);

  return (
    <Sheet modal open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-l border-border bg-background p-0 transition-all"
      >
        <div className="flex h-full flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />

          <SheetHeader className="border-b border-border bg-card p-10 space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-1 w-6 bg-[#ffc105] rounded-full" />
              <p className="text-xs font-bold text-[#ffc105]">{t("form.badge")}</p>
            </div>
            <SheetTitle className="text-3xl font-bold text-foreground m-0 leading-tight">
              {isBulk ? t("form.bulkTitle") : t("form.title")}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
              {t("form.description")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-10 space-y-8 relative z-10">
            <div className="rounded-3xl border border-border bg-card p-6 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                <Tag size={12} />
                {t("form.target")}
              </div>
              <p className="text-lg font-black text-foreground leading-tight">{targetName}</p>
              {variantCount > 0 && (
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  <Layers size={12} />
                  {t("form.variantCount", { count: variantCount })}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground">
                {t("form.fields.discount")}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="h-14 rounded-2xl ltr:pr-12 rtl:pl-12 text-lg font-black"
                />
                <Percent
                  size={18}
                  className="absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4 text-muted-foreground/40"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_PICKS.map((pick) => (
                  <button
                    key={pick}
                    type="button"
                    onClick={() => setDiscount(String(pick))}
                    className={cn(
                      "rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                      Number(discount) === pick
                        ? "border-[#ffc105]/40 bg-[#ffc105]/10 text-[#ffc105]"
                        : "border-border text-muted-foreground/50 hover:border-[#ffc105]/20 hover:text-foreground",
                    )}
                  >
                    {pick}%
                  </button>
                ))}
              </div>
              {!isValidDiscount && discount !== "" && (
                <p className="text-[11px] font-bold text-destructive">
                  {t("messages.invalidDiscount")}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-3xl border border-border bg-card p-6">
              <input
                type="checkbox"
                checked={applyToVariants}
                onChange={(e) => setApplyToVariants(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[#ffc105]"
              />
              <span className="space-y-1">
                <span className="block text-xs font-bold text-foreground">
                  {t("form.fields.applyToVariants")}
                </span>
                <span className="block text-[11px] font-medium leading-relaxed text-muted-foreground/50">
                  {t("form.fields.applyToVariantsHint")}
                </span>
              </span>
            </label>

            {!isBulk && (
              <div className="rounded-3xl border border-[#ffc105]/20 bg-[#ffc105]/5 p-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffc105]">
                  {t("form.preview")}
                </p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-foreground">
                    EGP {previewPrice.toLocaleString(locale)}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground/40 line-through">
                    EGP {anchor.toLocaleString(locale)}
                  </span>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">
                  {t("form.saves", { amount: previewSavings.toLocaleString(locale) })}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-border bg-card p-10 flex gap-3 relative z-10">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              className="flex-1 h-14 rounded-2xl bg-foreground text-background hover:bg-[#ffc105] hover:text-black font-black uppercase tracking-widest text-[10px]"
              onClick={handleSubmit}
              disabled={isSubmitting || !isValidDiscount || (isBulk && bulkTargets.length === 0)}
            >
              {isSubmitting ? t("actions.applying") : t("actions.apply")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
