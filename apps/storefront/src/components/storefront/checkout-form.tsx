"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import Image from "next/image";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { ChevronLeft, ChevronDown, Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { ColorSwatch, PromoCodeInput, cn, getColorDisplayName } from "@techworld/ui";

/** Remembers delivery details on this device so repeat customers don't retype them. */
const SAVED_DETAILS_KEY = "tw-checkout-details";

type FormFields = {
  fullName: string;
  phone: string;
  altPhone: string;
  email: string;
  governorateId: Id<"governorates"> | "";
  address: string;
};
type FieldErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY_FORM: FormFields = { fullName: "", phone: "", altPhone: "", email: "", governorateId: "", address: "" };

/**
 * Normalises what Egyptian customers typically type into a local mobile
 * number: Arabic-Indic digits, spaces/dashes, and +20 / 0020 prefixes.
 */
function normalizeEgyptianPhone(raw: string) {
  const latin = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = `0${digits}`;
  return digits;
}

const isValidEgyptianMobile = (phone: string) => /^01[0125]\d{8}$/.test(phone);
const isValidEmail = (email: string) => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function CheckoutForm() {
  const t = useTranslations("CheckoutForm");
  const locale = useLocale();
  const router = useRouter();
  const { sessionId } = useSession();

  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [promoCode, setPromoCode] = useState("");
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [isInlineCtaBelow, setIsInlineCtaBelow] = useState(true);
  const [inlineCta, setInlineCta] = useState<HTMLDivElement | null>(null);

  const governorates = useQuery(api.governorates.listActiveGovernorates);
  const cart = useQuery(api.cart.getCart, { sessionId, promoCode: promoCode || undefined });
  const setItemQuantity = useMutation(api.cart.addToCart);
  const removeFromCart = useMutation(api.cart.removeFromCart);
  const placeOrder = useMutation(api.cart.placeOrderFromSession);

  const currency = t("currency");
  const money = (value: number) => `${value.toLocaleString(locale)} ${currency}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_DETAILS_KEY);
      if (saved) setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {
      // Storage blocked or corrupt; start with an empty form.
    }
  }, []);

  // Mobile shows a fixed CTA bar until the in-page button scrolls into view.
  useEffect(() => {
    if (!inlineCta) {
      setIsInlineCtaBelow(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsInlineCtaBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(inlineCta);
    return () => observer.disconnect();
  }, [inlineCta]);

  const selectedGov = useMemo(
    () => governorates?.find((g) => g._id === form.governorateId),
    [governorates, form.governorateId],
  );

  const isFreeShipping = cart?.promoType === "free_shipping";
  const shippingFee = selectedGov && !isFreeShipping ? selectedGov.shippingFee : 0;
  const grandTotal = (cart?.total ?? 0) + shippingFee;
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const updateField = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleQuantity = async (
    productId: Id<"products">,
    skuId: Id<"skus">,
    nextQuantity: number,
    stock: number,
  ) => {
    if (nextQuantity > stock) {
      toast.error(t("items.stockLimit"));
      return;
    }
    const key = `${productId}-${skuId}`;
    setBusyItem(key);
    try {
      await setItemQuantity({ sessionId, productId, skuId, quantity: nextQuantity });
    } catch (err) {
      console.error("Cart update failed", err);
      toast.error(t("items.stockLimit"));
    } finally {
      setBusyItem(null);
    }
  };

  const handleRemove = async (
    productId: Id<"products">,
    skuId: Id<"skus">,
    quantity: number,
    name: string,
  ) => {
    const key = `${productId}-${skuId}`;
    setBusyItem(key);
    try {
      await removeFromCart({ sessionId, productId, skuId });
      toast(t("items.removed", { name }), {
        action: {
          label: t("items.undo"),
          onClick: () => {
            setItemQuantity({ sessionId, productId, skuId, quantity }).catch((err) => {
              console.error("Undo remove failed", err);
              toast.error(t("items.stockLimit"));
            });
          },
        },
      });
    } catch (err) {
      console.error("Remove failed", err);
    } finally {
      setBusyItem(null);
    }
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (form.fullName.trim().length < 3) next.fullName = t("errors.fullName");
    if (!isValidEgyptianMobile(normalizeEgyptianPhone(form.phone))) next.phone = t("errors.phone");
    const altPhone = normalizeEgyptianPhone(form.altPhone);
    if (form.altPhone.trim()) {
      if (!isValidEgyptianMobile(altPhone)) next.altPhone = t("errors.phone");
      else if (altPhone === normalizeEgyptianPhone(form.phone)) next.altPhone = t("errors.altPhoneSame");
    }
    if (form.email.trim() && !isValidEmail(form.email.trim())) next.email = t("errors.email");
    if (!form.governorateId) next.governorateId = t("errors.governorate");
    if (form.address.trim().length < 10) next.address = t("errors.address");
    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0 || isSubmitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    const firstInvalid = (Object.keys(EMPTY_FORM) as Array<keyof FormFields>).find((key) => nextErrors[key]);
    if (firstInvalid) {
      const field = document.getElementById(`checkout-${firstInvalid}`);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus({ preventScroll: true });
      return;
    }

    const details = {
      fullName: form.fullName.trim(),
      phone: normalizeEgyptianPhone(form.phone),
      altPhone: form.altPhone.trim() ? normalizeEgyptianPhone(form.altPhone) : "",
      email: form.email.trim().toLowerCase(),
      governorateId: form.governorateId,
      address: form.address.trim(),
    };

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const shortCode = await placeOrder({
        sessionId,
        customerName: details.fullName,
        customerPhone: details.phone,
        customerAltPhone: details.altPhone || undefined,
        customerEmail: details.email || undefined,
        governorateId: details.governorateId as Id<"governorates">,
        customerAddress: details.address,
        promoCode: promoCode || undefined,
      });
      try {
        window.localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify(details));
      } catch {
        // Non-essential convenience; ignore storage failures.
      }
      router.push(`/success?code=${shortCode}`);
    } catch (error) {
      console.error("Order failed:", error);
      setSubmitError(t("errors.placeOrderFailed"));
      setIsSubmitting(false);
    }
  };

  if (cart === undefined) {
    return (
      <div className="container mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-6 md:px-8">
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-72 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-full bg-accent p-8 ring-1 ring-border">
          <ShoppingBag size={56} className="text-muted-foreground/40" />
        </div>
        <h1 className="font-space-grotesk text-2xl font-bold text-foreground">{t("empty.title")}</h1>
        <Link
          href="/"
          className="rounded-xl bg-primary px-8 py-3.5 font-space-grotesk text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {t("empty.back")}
        </Link>
      </div>
    );
  }

  if (governorates && governorates.length === 0) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-semibold leading-relaxed text-destructive">{t("errors.noGovernorates")}</p>
        </div>
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    cn(
      "w-full rounded-xl border bg-card px-4 py-3.5 text-base text-foreground placeholder:text-label-muted/50 transition-all focus:outline-none focus:ring-2",
      hasError
        ? "border-destructive/60 focus:border-destructive focus:ring-destructive/15"
        : "border-border focus:border-primary/50 focus:ring-primary/15",
    );
  const labelClass = "mb-1.5 block text-sm font-semibold text-foreground";
  const errorText = (message?: string) =>
    message ? <p className="mt-1.5 text-sm font-medium text-destructive">{message}</p> : null;

  const confirmLabel = isSubmitting ? t("actions.placing") : t("actions.confirm");

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-32 pt-4 md:px-8 md:pt-8 lg:pb-16">
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1.5 py-2 text-sm font-medium text-label-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft size={16} className={locale === "ar" ? "rotate-180" : ""} />
        {t("backToShopping")}
      </Link>
      <h1 className="mb-6 font-space-grotesk text-3xl font-bold tracking-tight text-foreground md:mb-10 md:text-4xl">
        {t("title")}
      </h1>

      <form
        id="checkout-form"
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-10"
      >
        {/* Order items — first on mobile so customers can review/edit before typing details. */}
        <section className="rounded-2xl border border-border bg-card lg:col-start-2 lg:row-start-1">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="font-space-grotesk text-lg font-bold text-foreground">{t("items.title")}</h2>
            <span className="text-sm text-label-muted">{t("items.count", { count: itemCount })}</span>
          </div>
          <ul className="divide-y divide-border">
            {cart.items.map((item) => {
              const key = `${item.productId}-${item.skuId}`;
              const name = (locale === "en" ? item.product?.name_en : item.product?.name_ar) ?? "";
              const unitPrice = item.sku?.price || item.product?.selling_price || 0;
              const stock = item.sku?.display_stock ?? 0;
              const imageSrc = item.product?.thumbnail || item.product?.images?.[0];
              const hasVariant = !!item.sku?.variantName && item.sku.variantName !== "Default";
              const isBusy = busyItem === key;
              return (
                <li key={key} className={cn("flex gap-3 p-4 transition-opacity sm:px-5", isBusy && "opacity-60")}>
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-accent">
                    {imageSrc ? (
                      <Image src={imageSrc} alt={name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-label-muted">
                        {t("items.noImage")}
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{name}</p>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemove(item.productId, item.skuId, item.quantity, name)}
                        aria-label={t("items.remove", { name })}
                        className="-m-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-label-muted transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {hasVariant ? (
                      <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-label-muted">
                        <ColorSwatch
                          color={item.sku!.variantAttributes?.colorCode || item.sku!.variantAttributes?.color || item.sku!.variantName}
                          fallbackName={item.sku!.variantName}
                          size="xs"
                        />
                        {getColorDisplayName(item.sku!.variantName, locale)}
                      </span>
                    ) : null}

                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          disabled={isBusy || item.quantity <= 1}
                          onClick={() => handleQuantity(item.productId, item.skuId, item.quantity - 1, stock)}
                          aria-label={t("items.decrease")}
                          className="flex h-9 w-9 items-center justify-center text-label-muted transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <Minus size={14} />
                        </button>
                        <span aria-live="polite" className="min-w-[2rem] text-center text-sm font-bold text-foreground">
                          {item.quantity.toLocaleString(locale)}
                        </span>
                        <button
                          type="button"
                          disabled={isBusy || item.quantity >= stock}
                          onClick={() => handleQuantity(item.productId, item.skuId, item.quantity + 1, stock)}
                          aria-label={t("items.increase")}
                          className="flex h-9 w-9 items-center justify-center text-label-muted transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="text-end">
                        <p className="font-space-grotesk text-base font-bold text-foreground">
                          {money(unitPrice * item.quantity)}
                        </p>
                        {item.quantity > 1 ? (
                          <p className="text-xs text-label-muted">{t("items.each", { price: money(unitPrice) })}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Delivery details */}
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <h2 className="mb-5 font-space-grotesk text-lg font-bold text-foreground">{t("delivery.title")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="checkout-fullName" className={labelClass}>{t("delivery.fullName")}</label>
              <input
                id="checkout-fullName"
                type="text"
                autoComplete="name"
                enterKeyHint="next"
                placeholder={t("delivery.fullNamePlaceholder")}
                aria-invalid={!!errors.fullName}
                className={inputClass(!!errors.fullName)}
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
              {errorText(errors.fullName)}
            </div>
            <div>
              <label htmlFor="checkout-phone" className={labelClass}>{t("delivery.phone")}</label>
              <input
                id="checkout-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                enterKeyHint="next"
                dir="ltr"
                placeholder="01xxxxxxxxx"
                aria-invalid={!!errors.phone}
                aria-describedby="checkout-phone-hint"
                className={cn(inputClass(!!errors.phone), "font-mono rtl:text-right")}
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                onBlur={() => form.phone && updateField("phone", normalizeEgyptianPhone(form.phone))}
              />
              {errors.phone ? (
                errorText(errors.phone)
              ) : (
                <p id="checkout-phone-hint" className="mt-1.5 text-xs text-label-muted">{t("delivery.phoneHint")}</p>
              )}
            </div>
            <div>
              <label htmlFor="checkout-altPhone" className={labelClass}>
                {t("delivery.altPhone")}{" "}
                <span className="font-normal text-label-muted">{t("delivery.optional")}</span>
              </label>
              <input
                id="checkout-altPhone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                enterKeyHint="next"
                dir="ltr"
                placeholder="01xxxxxxxxx"
                aria-invalid={!!errors.altPhone}
                aria-describedby="checkout-altPhone-hint"
                className={cn(inputClass(!!errors.altPhone), "font-mono rtl:text-right")}
                value={form.altPhone}
                onChange={(e) => updateField("altPhone", e.target.value)}
                onBlur={() => form.altPhone && updateField("altPhone", normalizeEgyptianPhone(form.altPhone))}
              />
              {errors.altPhone ? (
                errorText(errors.altPhone)
              ) : (
                <p id="checkout-altPhone-hint" className="mt-1.5 text-xs text-label-muted">{t("delivery.altPhoneHint")}</p>
              )}
            </div>
            <div>
              <label htmlFor="checkout-email" className={labelClass}>
                {t("delivery.email")}{" "}
                <span className="font-normal text-label-muted">{t("delivery.optional")}</span>
              </label>
              <input
                id="checkout-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                dir="ltr"
                placeholder="name@example.com"
                aria-invalid={!!errors.email}
                className={cn(inputClass(!!errors.email), "rtl:text-right")}
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {errorText(errors.email)}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="checkout-governorateId" className={labelClass}>{t("delivery.governorate")}</label>
              <div className="relative">
                <select
                  id="checkout-governorateId"
                  aria-invalid={!!errors.governorateId}
                  className={cn(inputClass(!!errors.governorateId), "appearance-none ltr:pr-10 rtl:pl-10")}
                  value={form.governorateId}
                  onChange={(e) => updateField("governorateId", e.target.value as Id<"governorates">)}
                >
                  <option value="" disabled>{t("delivery.governoratePlaceholder")}</option>
                  {governorates?.map((gov) => (
                    <option key={gov._id} value={gov._id}>
                      {locale === "en" ? gov.name_en : gov.name_ar} — {money(gov.shippingFee)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-label-muted ltr:right-4 rtl:left-4"
                />
              </div>
              {errorText(errors.governorateId)}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="checkout-address" className={labelClass}>{t("delivery.address")}</label>
              <textarea
                id="checkout-address"
                rows={3}
                autoComplete="street-address"
                placeholder={t("delivery.addressPlaceholder")}
                aria-invalid={!!errors.address}
                className={cn(inputClass(!!errors.address), "resize-none leading-relaxed")}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />
              {errorText(errors.address)}
            </div>
          </div>
        </section>

        {/* Promo + totals + CTA */}
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-2">
          {isPromoOpen || promoCode ? (
            <PromoCodeInput
              onApply={setPromoCode}
              onRemove={() => setPromoCode("")}
              appliedCode={promoCode}
              error={cart.promoError}
              discountAmount={cart.promoDiscount}
              promoType={cart.promoType}
              placeholder={t("promo.placeholder")}
              applyLabel={t("promo.apply")}
              appliedLabel={t("promo.applied")}
              removeLabel={t("promo.remove")}
              freeShippingLabel={t("summary.freeShipping")}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsPromoOpen(true)}
              className="py-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              {t("promo.toggle")}
            </button>
          )}

          <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-label-muted">{t("summary.subtotal")}</dt>
              <dd className="font-semibold text-foreground">{money(cart.subtotal)}</dd>
            </div>
            {cart.promoDiscount ? (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <dt>{t("summary.discount")}</dt>
                <dd className="font-semibold">-{money(cart.promoDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-label-muted">{t("summary.shipping")}</dt>
              <dd className="font-semibold text-foreground">
                {isFreeShipping ? (
                  <span className="text-emerald-600 dark:text-emerald-400">{t("summary.freeShipping")}</span>
                ) : selectedGov ? (
                  money(selectedGov.shippingFee)
                ) : (
                  <span className="font-normal text-label-muted">{t("summary.shippingPending")}</span>
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-bold text-foreground">{t("summary.total")}</dt>
              <dd className="font-space-grotesk text-2xl font-bold text-primary">{money(grandTotal)}</dd>
            </div>
          </dl>

          <div ref={setInlineCta} className="space-y-3">
            {submitError ? (
              <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm font-medium text-destructive">
                {submitError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-space-grotesk text-lg font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : null}
              {confirmLabel}
            </button>
            <p className="flex items-center justify-center gap-2 text-center text-xs text-label-muted">
              <ShieldCheck size={15} className="flex-shrink-0 text-emerald-500" />
              {t("notice")}
            </p>
          </div>
        </section>
      </form>

      {/* Mobile sticky bar: total + CTA always within thumb reach. */}
      {isInlineCtaBelow ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-4">
            <div className="min-w-0">
              <p className="text-xs text-label-muted">{t("summary.total")}</p>
              <p className="font-space-grotesk text-lg font-bold leading-tight text-foreground">{money(grandTotal)}</p>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-space-grotesk text-base font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
