"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
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
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-10 text-center">
        <p className="text-destructive font-semibold text-sm leading-relaxed">{t('errors.noGovernorates')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              1
            </div>
            <h2 className="font-space-grotesk text-xl font-bold tracking-tight text-foreground">{t('shipping')}</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-label-muted block uppercase tracking-wider">{t('labels.fullName')}</label>
              <input
                required
                type="text"
                placeholder={t('labels.fullName')}
                className="w-full rounded-xl border border-border bg-card p-4 text-foreground text-sm placeholder:text-label-muted/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-label-muted block uppercase tracking-wider">{t('labels.phone')}</label>
              <input
                required
                type="tel"
                placeholder="01xxxxxxxxx"
                className="w-full rounded-xl border border-border bg-card p-4 text-foreground text-sm placeholder:text-label-muted/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all font-mono"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-label-muted block uppercase tracking-wider">{t('labels.governorate')}</label>
              <div className="relative">
                <select
                  required
                  className="w-full rounded-xl border border-border bg-card p-4 text-foreground text-sm focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none transition-all font-medium"
                  value={formData.governorateId}
                  onChange={(e) => setFormData({ ...formData, governorateId: e.target.value as Id<"governorates"> })}
                >
                  <option value="" disabled className="text-label-muted">{t('labels.governorate')}</option>
                  {governorates?.map((gov) => (
                    <option key={gov._id} value={gov._id} className="bg-card text-foreground">
                      {locale === 'en' ? gov.name_en : gov.name_ar} ({gov.shippingFee.toLocaleString(locale)} EGP)
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-label-muted">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[11px] font-semibold text-label-muted block uppercase tracking-wider">{t('labels.address')}</label>
              <textarea
                required
                placeholder={t('labels.address')}
                className="min-h-[130px] w-full rounded-xl border border-border bg-card p-4 text-foreground text-sm placeholder:text-label-muted/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none font-medium leading-relaxed"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-secondary text-sm font-bold text-foreground">2</div>
            <h2 className="font-space-grotesk text-xl font-bold tracking-tight text-foreground">{t('promo.label')}</h2>
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

        <div className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8 space-y-5 backdrop-blur-sm">
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <span className="text-label-muted text-xs font-semibold uppercase tracking-wider">{t('summary.subtotal')}</span>
            <span className="text-foreground font-space-grotesk font-bold tracking-tight">{(cart?.subtotal || 0).toLocaleString(locale)} <span className="text-xs text-primary">EGP</span></span>
          </div>

          {cart?.promoType === "free_shipping" ? (
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('summary.discount')}</span>
              <span className="font-space-grotesk font-bold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded uppercase">{t('summary.freeShipping')}</span>
            </div>
          ) : cart?.promoDiscount ? (
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <span className="text-xs font-semibold uppercase tracking-wider">{t('summary.discount')}</span>
              <span className="font-space-grotesk font-bold tracking-tight">-{cart.promoDiscount.toLocaleString(locale)} <span className="text-xs">EGP</span></span>
            </div>
          ) : null}

          <div className="flex justify-between items-center">
            <span className="text-label-muted text-xs font-semibold uppercase tracking-wider">{t('summary.shipping')}</span>
            <span className="text-foreground font-space-grotesk font-bold tracking-tight">
              {!formData.governorateId ? (
                <span className="text-label-muted italic text-xs lowercase tracking-wide font-medium">{t('errors.selectGovernorate')}</span>
              ) : selectedGov ? (
                cart?.promoType === "free_shipping" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <span className="line-through text-label-muted/50">{selectedGov.shippingFee.toLocaleString(locale)}</span>
                    <span className="text-[11px] uppercase font-bold bg-emerald-500/10 px-2 py-0.5 rounded">{t('summary.freeShipping')}</span>
                  </span>
                ) : (
                  <>{selectedGov.shippingFee.toLocaleString(locale)} <span className="text-xs text-primary">EGP</span></>
                )
              ) : (
                <span className="text-label-muted text-xs font-semibold tracking-wide uppercase">{t('summary.loading')}</span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center pt-5 border-t border-border">
            <span className="text-foreground text-sm font-bold uppercase tracking-wider">{t('summary.total')}</span>
            <span className="text-primary font-space-grotesk text-3xl font-bold tracking-tight">
              {((cart?.total || 0) + (cart?.promoType === "free_shipping" ? 0 : (selectedGov?.shippingFee || 0))).toLocaleString(locale)} <span className="text-base">EGP</span>
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <button
            disabled={isSubmitting || !cart}
            type="submit"
            className="group flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-5 font-space-grotesk text-lg font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                {t('actions.confirm')}
                <ChevronRight size={20} className={`transition-transform group-hover:translate-x-0.5 ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-2.5 text-label-muted py-3">
            <ShieldCheck size={16} className="text-emerald-500" />
            <p className="text-[11px] font-semibold leading-relaxed text-center uppercase tracking-wider">
              {t('notice')}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}