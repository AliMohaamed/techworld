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
  SheetDescription
} from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Doc } from "@backend/convex/_generated/dataModel";
import { useTranslations } from "next-intl";

const promoSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(20, "Code too long").transform(v => v.toUpperCase()),
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

export function PromoCodeFormSheet({ open, onOpenChange, promoCode }: PromoCodeFormSheetProps) {
  const t = useTranslations('Marketing.promoCodes');
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
          ? new Date(promoCode.expiry_date).toISOString().split('T')[0] 
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
      const expiry_date_ms = data.expiry_date ? new Date(data.expiry_date).getTime() : undefined;
      
      if (promoCode) {
        toast.info(t('messages.updateNotImplemented'));
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

      toast.success(t('messages.createSuccess'));
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.submissionFailed');
      toast.error(t('messages.operationFailed'), { description: message });
    }
  };

  return (
    <Sheet modal open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md border-l border-white/10 bg-[#1a1814] p-0 shadow-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/5 bg-[#24201a] p-8 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary">{t('form.badge')}</p>
            <SheetTitle className="text-2xl font-semibold uppercase tracking-tight text-white m-0 leading-tight">
              {promoCode ? t('form.editTitle') : t('form.createTitle')}
            </SheetTitle>
            <SheetDescription className="text-sm text-zinc-500">
              {t('form.description')}
            </SheetDescription>
          </SheetHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="space-y-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                <div className="space-y-2">
                  <Label htmlFor="promo-code" className="text-xs uppercase tracking-widest text-zinc-500">{t('form.fields.code')}</Label>
                  <Input 
                    id="promo-code"
                    placeholder={t('form.placeholders.code')} 
                    className="font-mono text-lg font-bold tracking-widest border-white/10 focus:border-primary"
                    {...register("code")} 
                  />
                  {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promo-type" className="text-xs uppercase tracking-widest text-zinc-500">{t('form.fields.type')}</Label>
                  <select 
                    id="promo-type"
                    className="w-full rounded-xl border border-white/10 bg-[#2a261f] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all outline-none hover:border-white/20 focus:border-primary appearance-none"
                    {...register("type")}
                  >
                    <option value="percentage">{t('form.types.percentage')}</option>
                    <option value="fixed">{t('form.types.fixed')}</option>
                    <option value="free_shipping">{t('form.types.freeShipping')}</option>
                  </select>
                </div>

                {selectedType !== "free_shipping" && (
                  <div className="space-y-2">
                    <Label htmlFor="promo-value" className="text-xs uppercase tracking-widest text-zinc-500">
                       {selectedType === "percentage" ? t('form.fields.percentageValue') : t('form.fields.fixedValue')}
                    </Label>
                    <Input 
                      id="promo-value"
                      type="number" 
                      placeholder={t('form.placeholders.value')} 
                      className="border-white/10 focus:border-primary"
                      {...register("value")} 
                    />
                    {errors.value && <p className="text-xs text-red-400">{errors.value.message}</p>}
                  </div>
                )}

                {selectedType === "percentage" && (
                  <div className="space-y-2">
                    <Label htmlFor="promo-max-discount" className="text-xs uppercase tracking-widest text-zinc-500">{t('form.fields.maxDiscount')}</Label>
                    <Input 
                      id="promo-max-discount"
                      type="number" 
                      placeholder={t('form.placeholders.maxDiscount')} 
                      className="border-white/10 focus:border-primary"
                      {...register("max_discount_amount")} 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-3xl border border-white/5 bg-white/[0.03] p-6">
                 <div className="space-y-2">
                  <Label htmlFor="promo-max-uses" className="text-xs uppercase tracking-widest text-zinc-500">{t('form.fields.maxUses')}</Label>
                  <Input 
                    id="promo-max-uses"
                    type="number" 
                    placeholder={t('form.placeholders.maxUses')}
                    className="border-white/10 focus:border-primary"
                    {...register("max_uses")} 
                  />
                  {errors.max_uses && <p className="text-xs text-red-400">{errors.max_uses.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promo-expiry-date" className="text-xs uppercase tracking-widest text-zinc-500">{t('form.fields.expiryDate')}</Label>
                  <Input 
                    id="promo-expiry-date"
                    type="date" 
                    className="border-white/10 focus:border-primary"
                    {...register("expiry_date")} 
                  />
                </div>
              </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-400 leading-relaxed italic">
                <span>{t('form.fields.bundleOverlap')}</span>
              </div>

              <div className="border-t border-white/5 bg-[#24201a] p-8 -mx-8 -mb-8 mt-auto">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" type="button" onClick={() => onOpenChange(false)}>
                    {t('form.buttons.cancel')}
                  </Button>
                  <Button className="flex-1" type="submit" disabled={isSubmitting}>
                     {isSubmitting ? t('form.buttons.saving') : promoCode ? t('form.buttons.update') : t('form.buttons.create')}
                  </Button>
                </div>
              </div>
            </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
