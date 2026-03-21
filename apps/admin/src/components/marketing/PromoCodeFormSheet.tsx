"use client";

import { useEffect, useState } from "react";
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
  cn
} from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Doc, Id } from "@backend/convex/_generated/dataModel";

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
  onClose: () => void;
  promoCode: Doc<"promo_codes"> | null;
}

export function PromoCodeFormSheet({ open, onClose, promoCode }: PromoCodeFormSheetProps) {
  const createPromo = useMutation(api.promoCodes.create);
  // Manual Update logic if needed, but the current convex backend for promo only has toggle/CRUD
  // For now we'll implement create and assume update can be added if needed, or simple CRUD cycle.
  // Actually, toggleActive is there, but full update isn't. I'll stick to create for now as per minimal spec.
  // For now, we will add an update mutation call if we find it in the API.

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
        // Since we don't have an 'update' mutation yet, we'll prompt for deletion/re-creation or just skip for now.
        // For the sake of US1 (Phase 10), we will focus on creation.
        toast.info("Update logic not yet implemented in backend. Delete and re-create for now.");
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

      toast.success("Promo code created successfully");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed";
      toast.error("Operation failed", { description: message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>

      <SheetContent side="right" className="w-full max-w-md border-l border-white/10 bg-[#1a1814] p-0 shadow-2xl">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/5 bg-[#24201a] p-8 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary">Marketing Config</p>
            <SheetTitle className="text-2xl font-semibold uppercase tracking-tight text-white m-0">
              {promoCode ? "Edit Promo Code" : "New Promo Code"}
            </SheetTitle>
            <SheetDescription className="text-sm text-zinc-500">
              Setup discounts, limits, and expiration.
            </SheetDescription>
          </SheetHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="space-y-4 rounded-3xl border border-white/5 bg-white/[0.02] p-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-zinc-500">Promo Code String</Label>
                  <Input 
                    placeholder="e.g. FLASH20" 
                    className="font-mono text-lg font-bold tracking-widest border-white/10 focus:border-primary"
                    {...register("code")} 
                  />
                  {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-zinc-500">Discount Type</Label>
                  <select 
                    className="w-full rounded-xl border border-white/10 bg-[#2a261f] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all outline-none hover:border-white/20 focus:border-primary"
                    {...register("type")}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (EGP)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                {selectedType !== "free_shipping" && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">
                       {selectedType === "percentage" ? "Percentage Value" : "Discount Amount (EGP)"}
                    </Label>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      className="border-white/10 focus:border-primary"
                      {...register("value")} 
                    />
                    {errors.value && <p className="text-xs text-red-400">{errors.value.message}</p>}
                  </div>
                )}

                {selectedType === "percentage" && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-zinc-500">Max Discount Cap (EGP)</Label>
                    <Input 
                      type="number" 
                      placeholder="Optional limit" 
                      className="border-white/10 focus:border-primary"
                      {...register("max_discount_amount")} 
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-3xl border border-white/5 bg-white/[0.03] p-6">
                 <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-zinc-500">Max Usage Limit</Label>
                  <Input 
                    type="number" 
                    className="border-white/10 focus:border-primary"
                    {...register("max_uses")} 
                  />
                  {errors.max_uses && <p className="text-xs text-red-400">{errors.max_uses.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-zinc-500">Expiry Date</Label>
                  <Input 
                    type="date" 
                    className="border-white/10 focus:border-primary"
                    {...register("expiry_date")} 
                  />
                </div>
              </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-zinc-400">
                <span>The system strictly prevents bundle overlap for all promo codes.</span>
              </div>

              <div className="border-t border-white/5 bg-[#24201a] p-8 -mx-8 -mb-8 mt-auto">
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" type="button" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button className="flex-1" type="submit" disabled={isSubmitting}>
                     {isSubmitting ? "Creating..." : promoCode ? "Save Changes" : "Create Promo Code"}
                  </Button>
                </div>
              </div>
            </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
