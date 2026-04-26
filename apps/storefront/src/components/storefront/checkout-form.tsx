"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ChevronRight, ShieldCheck, Loader2 } from "lucide-react";
import { useRouter } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import { PromoCodeInput } from "@techworld/ui";
import type { Id } from "@backend/convex/_generated/dataModel";

export default function CheckoutForm() {
  const t = useTranslations('CheckoutForm');
  const locale = useLocale();
  const router = useRouter();
  const { sessionId } = useSession();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    governorateId: "" as Id<"governorates"> | "",
    address: "",
    promoCode: ""
  });

  const governorates = useQuery(api.governorates.listActiveGovernorates);
  const cart = useQuery(api.cart.getCart, {
    sessionId,
    promoCode: formData.promoCode || undefined
  });
  const placeOrder = useMutation(api.cart.placeOrderFromSession);

  const selectedGov = useMemo(() =>
    governorates?.find(g => g._id === formData.governorateId),
    [governorates, formData.governorateId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || isSubmitting || !formData.governorateId) return;

    setIsSubmitting(true);
    try {
      const shortCode = await placeOrder({
        sessionId,
        customerName: formData.fullName,
        customerPhone: formData.phone,
        governorateId: formData.governorateId as Id<"governorates">,
        customerAddress: formData.address,
        promoCode: formData.promoCode || undefined
      });

      router.push(`/success?code=${shortCode}`);
    } catch (error) {
      console.error("Order failed:", error);
      alert(t('errors.placeOrderFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (governorates && governorates.length === 0) {
    return (
      <div className="rounded-[32px] border border-destructive/20 bg-destructive/5 p-10 text-center  ">
        <p className="text-destructive font-bold text-xs leading-relaxed">{t('errors.noGovernorates')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Shipping Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffc105] text-sm font-bold text-black shadow-[0_4px_15px_rgba(255,193,5,0.3)]">1</div>
            <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground">{t('shipping')}</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground block px-1 uppercase">{t('labels.fullName')}</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder={t('labels.fullName')}
                  className="w-full rounded-2xl border border-border bg-card p-5 text-foreground placeholder:text-muted-foreground/30 focus:border-[#ffc105]/30 focus:outline-none transition-all   font-medium"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground block px-1 uppercase">{t('labels.phone')}</label>
              <div className="relative">
                <input
                  required
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  className="w-full rounded-2xl border border-border bg-card p-5 text-foreground placeholder:text-muted-foreground/30 focus:border-[#ffc105]/30 focus:outline-none transition-all   font-mono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground block px-1 uppercase">{t('labels.governorate')}</label>
              <div className="relative">
                <select
                  required
                  className="w-full rounded-2xl border border-border bg-card p-5 text-foreground focus:border-[#ffc105]/30 focus:outline-none appearance-none transition-all   font-medium"
                  value={formData.governorateId}
                  onChange={(e) => setFormData({ ...formData, governorateId: e.target.value as Id<"governorates"> })}
                >
                  <option value="" disabled className="text-muted-foreground">{t('labels.governorate')}</option>
                  {governorates?.map((gov) => (
                    <option key={gov._id} value={gov._id} className="bg-card text-foreground">
                      {locale === 'en' ? gov.name_en : gov.name_ar} ({gov.shippingFee.toLocaleString(locale)} EGP)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute ltr:right-6 rtl:left-6 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <ChevronRight size={18} className="rotate-90" />
                </div>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-muted-foreground block px-1 uppercase">{t('labels.address')}</label>
              <textarea
                required
                placeholder={t('labels.address')}
                className="min-h-[150px] w-full rounded-3xl border border-border bg-card p-6 text-foreground placeholder:text-muted-foreground/30 focus:border-[#ffc105]/30 focus:outline-none transition-all   resize-none font-medium leading-relaxed"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-sm font-bold text-foreground border border-border">2</div>
            <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground">{t('promo.label')}</h2>
          </div>
          <PromoCodeInput
            onApply={(code) => setFormData({ ...formData, promoCode: code })}
            onRemove={() => setFormData({ ...formData, promoCode: "" })}
            appliedCode={formData.promoCode}
            error={cart?.promoError}
            discountAmount={cart?.promoDiscount}
            promoType={cart?.promoType}
            placeholder={t('promo.placeholder')}
            applyLabel={t('promo.apply')}
            appliedLabel={t('promo.applied')}
            removeLabel={t('promo.remove')}
            freeShippingLabel={t('summary.freeShipping')}
          />
        </div>

        {/* Summary Recap Desktop */}
        <div className="rounded-[40px] border border-border bg-card/50 p-10 space-y-6   backdrop-blur-sm">
          <div className="flex justify-between items-center pb-6 border-b border-border">
            <span className="text-muted-foreground text-xs font-bold uppercase">{t('summary.subtotal')}</span>
            <span className="text-foreground font-space-grotesk font-bold tracking-tight">{(cart?.subtotal || 0).toLocaleString(locale)} <span className="text-xs text-[#ffc105]">EGP</span></span>
          </div>

          {cart?.promoType === "free_shipping" ? (
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-500">
              <span className="text-xs font-bold uppercase">{t('summary.discount')}</span>
              <span className="font-space-grotesk font-bold tracking-tight text-[10px] bg-emerald-500/10 px-2 py-1 rounded uppercase">{t('summary.freeShipping')}</span>
            </div>
          ) : cart?.promoDiscount ? (
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-500">
              <span className="text-xs font-bold uppercase">{t('summary.discount')}</span>
              <span className="font-space-grotesk font-bold tracking-tight">-{cart.promoDiscount.toLocaleString(locale)} <span className="text-xs">EGP</span></span>
            </div>
          ) : null}

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs font-bold uppercase">{t('summary.shipping')}</span>
            <span className="text-foreground font-space-grotesk font-bold tracking-tight">
              {!formData.governorateId ? (
                <span className="text-muted-foreground italic text-[10px] lowercase tracking-wide font-medium">{t('errors.selectGovernorate')}</span>
              ) : selectedGov ? (
                cart?.promoType === "free_shipping" ? (
                  <span className="text-emerald-500 flex items-center gap-2">
                    <span className="line-through text-muted-foreground opacity-50">{selectedGov.shippingFee.toLocaleString(locale)}</span>
                    <span className="text-[10px] uppercase font-black bg-emerald-500/10 px-2 py-0.5 rounded">{t('summary.freeShipping')}</span>
                  </span>
                ) : (
                  <>{selectedGov.shippingFee.toLocaleString(locale)} <span className="text-xs text-[#ffc105]">EGP</span></>
                )
              ) : (
                <span className="text-muted-foreground text-xs font-bold tracking-wide uppercase">{t('summary.loading')}</span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center pt-8 border-t border-border">
            <span className="text-foreground text-sm font-bold uppercase">{t('summary.total')}</span>
            <span className="text-[#ffc105] font-space-grotesk text-4xl font-bold tracking-tightest">
              {((cart?.total || 0) + (cart?.promoType === "free_shipping" ? 0 : (selectedGov?.shippingFee || 0))).toLocaleString(locale)} <span className="text-lg">EGP</span>
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <button
            disabled={isSubmitting || !cart}
            type="submit"
            className="group relative flex w-full items-center justify-center gap-4 rounded-2xl bg-[#ffc105] py-6 font-space-grotesk text-xl font-bold text-black transition-all hover:bg-foreground hover:text-background active:scale-[0.98] disabled:opacity-30 disabled:grayscale shadow-[0_10px_30px_rgba(255,193,5,0.2)]"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={28} />
            ) : (
              <>
                {t('actions.confirm')}
                <ChevronRight size={24} className={`transition-transform group-hover:translate-x-1 ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-3 text-muted-foreground px-4 py-3 bg-secondary/20 rounded-xl border border-border">
            <ShieldCheck size={18} className="text-emerald-500" />
            <p className="text-[11px] font-bold leading-relaxed text-center uppercase">
              {t('notice')}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
