"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import type { Doc } from "@backend/convex/_generated/dataModel";
import { useTranslations } from "next-intl";

const promoSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code too long")
    .transform((v) => v.toUpperCase()),
  type: z.enum(["fixed", "percentage", "free_shipping"]),
  value: z.coerce.number().min(0, "Value cannot be negative"),
  max_discount_amount: z.coerce.number().optional().nullable(),
  max_uses: z.coerce.number().min(1, "At least 1 use required"),
  expiry_date: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type PromoFormValues = z.infer<typeof promoSchema>;

interface PromoCodeFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promoCode: Doc<"promo_codes"> | null;
}

export function PromoCodeFormSheet({
  open,
  onOpenChange,
  promoCode,
}: PromoCodeFormSheetProps) {
  const t = useTranslations("Marketing.promoCodes");
  const createPromo = useMutation(api.promoCodes.create);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormValues>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: 0,
      max_uses: 100,
      isActive: true,
    },
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (!open) return;
    if (promoCode) {
      reset({
        code: promoCode.code,
        type: promoCode.type,
        value: promoCode.value,
        max_discount_amount: promoCode.max_discount_amount || null,
        max_uses: promoCode.max_uses,
        isActive: promoCode.isActive,
        expiry_date: promoCode.expiry_date
          ? new Date(promoCode.expiry_date).toISOString().split("T")[0]
          : "",
      });
    } else {
      reset({
        code: "",
        type: "percentage",
        value: 0,
        max_uses: 100,
        isActive: true,
        expiry_date: "",
      });
    }
  }, [promoCode, reset, open]);

  const onSubmit = async (data: PromoFormValues) => {
    try {
      const expiry_date_ms = data.expiry_date
        ? new Date(data.expiry_date).getTime()
        : undefined;

      if (promoCode) {
        toast.info(t("messages.updateNotImplemented"));
        return;
      }

      await createPromo({
        code: data.code,
        type: data.type,
        value: data.value,
        max_discount_amount: data.max_discount_amount || undefined,
        max_uses: data.max_uses,
        expiry_date: expiry_date_ms,
        isActive: data.isActive,
      });

      toast.success(t("messages.createSuccess"));
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.submissionFailed");
      toast.error(t("messages.operationFailed"), { description: message });
    }
  };

  return (
    <Sheet modal open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md border-l border-border bg-background p-0   transition-all"
      >
        <div className="flex h-full flex-col relative overflow-hidden">
          {/* Decorative background for light mode */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />

          <SheetHeader className="border-b border-border bg-card p-10 space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-1 w-6 bg-[#ffc105] rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                {t("form.badge")}
              </p>
            </div>
            <SheetTitle className="text-3xl font-black uppercase tracking-tightest text-foreground m-0 leading-tight italic">
              {promoCode ? t("form.editTitle") : t("form.createTitle")}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground/60 font-medium leading-relaxed">
              {t("form.description")}
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto p-10 space-y-8 relative z-10 scrollbar-hide"
          >
            <div className="space-y-6 rounded-[32px] border border-border bg-card p-8   group transition-all hover:border-[#ffc105]/20">
              <div className="space-y-3">
                <Label
                  htmlFor="promo-code"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.code")}
                </Label>
                <Input
                  id="promo-code"
                  placeholder={t("form.placeholders.code")}
                  className="rounded-xl font-mono text-xl font-black tracking-widest border-border bg-background h-14 focus:border-[#ffc105]/40 focus:ring-[#ffc105]/10 uppercase transition-all"
                  {...register("code")}
                />
                {errors.code && (
                  <p className="text-[10px] font-black text-destructive uppercase tracking-widest mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="promo-type"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.type")}
                </Label>
                <div className="relative">
                  <select
                    id="promo-type"
                    className="w-full rounded-xl border border-border bg-background px-5 py-4 text-sm font-black uppercase tracking-widest text-foreground transition-all outline-none hover:border-border/80 focus:border-[#ffc105] appearance-none cursor-pointer shadow-sm"
                    {...register("type")}
                  >
                    <option value="percentage">
                      {t("form.types.percentage")}
                    </option>
                    <option value="fixed">{t("form.types.fixed")}</option>
                    <option value="free_shipping">
                      {t("form.types.freeShipping")}
                    </option>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/30">
                    ▼
                  </div>
                </div>
              </div>

              {selectedType !== "free_shipping" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label
                    htmlFor="promo-value"
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                  >
                    {selectedType === "percentage"
                      ? t("form.fields.percentageValue")
                      : t("form.fields.fixedValue")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="promo-value"
                      type="number"
                      placeholder={t("form.placeholders.value")}
                      className="rounded-xl border-border bg-background h-12 text-sm font-black tracking-tightest pl-5"
                      {...register("value")}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40">
                      {selectedType === "percentage" ? "%" : "EGP"}
                    </div>
                  </div>
                  {errors.value && (
                    <p className="text-[10px] font-black text-destructive uppercase tracking-widest mt-1">
                      {errors.value.message}
                    </p>
                  )}
                </div>
              )}

              {selectedType === "percentage" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label
                    htmlFor="promo-max-discount"
                    className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                  >
                    {t("form.fields.maxDiscount")}
                  </Label>
                  <Input
                    id="promo-max-discount"
                    type="number"
                    placeholder={t("form.placeholders.maxDiscount")}
                    className="rounded-xl border-border bg-background h-12 text-sm font-black tracking-tightest"
                    {...register("max_discount_amount")}
                  />
                </div>
              )}
            </div>

            <div className="space-y-6 rounded-[32px] border border-border bg-card p-8   group transition-all hover:border-[#ffc105]/20">
              <div className="space-y-3">
                <Label
                  htmlFor="promo-max-uses"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.maxUses")}
                </Label>
                <Input
                  id="promo-max-uses"
                  type="number"
                  placeholder={t("form.placeholders.maxUses")}
                  className="rounded-xl border-border bg-background h-12 text-sm font-black tracking-tightest"
                  {...register("max_uses")}
                />
                {errors.max_uses && (
                  <p className="text-[10px] font-black text-destructive uppercase tracking-widest mt-1">
                    {errors.max_uses.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="promo-expiry-date"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.expiryDate")}
                </Label>
                <Input
                  id="promo-expiry-date"
                  type="date"
                  className="rounded-xl border-border bg-background h-12 text-sm font-black tracking-widest uppercase cursor-pointer"
                  {...register("expiry_date")}
                />
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-destructive/10 bg-destructive/5 p-5 text-[10px] font-black uppercase tracking-[0.2em] text-destructive/60 leading-relaxed italic shadow-sm">
              <span className="shrink-0 text-lg">⚠️</span>
              <span>{t("form.fields.bundleOverlap")}</span>
            </div>
          </form>

          <div className="border-t border-border bg-card p-10 relative z-20  ">
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-border hover:bg-accent transition-all"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                {t("form.buttons.cancel")}
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] bg-[#ffc105] text-black hover:bg-foreground hover:text-background transition-all   shadow-[#ffc105]/10"
                type="submit"
                onClick={() => handleSubmit(onSubmit)()}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? t("form.buttons.saving")
                  : promoCode
                    ? t("form.buttons.update")
                    : t("form.buttons.create")}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
