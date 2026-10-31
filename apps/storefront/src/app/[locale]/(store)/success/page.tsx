"use client";

import { useSearchParams } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  ArrowRight,
  Package,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { api } from "@backend/convex/_generated/api";
import { whatsappLink } from "@/lib/contact";
import { productEventParams, takePendingPurchase, trackMetaEvent } from "@/lib/meta-pixel";
import { useSession } from "@/providers/session-provider";

const SAVED_DETAILS_KEY = "tw-checkout-details";

type SavedCheckoutDetails = {
  fullName?: string;
  phone?: string;
  altPhone?: string;
  address?: string;
  buildingNumber?: string;
  floorNumber?: string;
  apartmentNumber?: string;
};

/**
 * Sends the browser Purchase once, from the tab that just placed the order,
 * with the value and event id read from the stored order, so it matches the
 * Conversions API copy and Meta deduplicates the two.
 */
function usePurchaseEvent(shortCode: string) {
  const convex = useConvex();
  const { sessionId } = useSession();

  useEffect(() => {
    // The marker is consumed here, so StrictMode's second run (or any later
    // render) does nothing, and the request is deliberately not cancelled.
    if (!shortCode || !sessionId || !takePendingPurchase(shortCode)) return;
    convex
      .query(api.cart.getPurchaseSummary, { sessionId, shortCode })
      .then((summary) => {
        if (summary) {
          trackMetaEvent("Purchase", productEventParams(summary.contents, summary.value), summary.eventId);
        }
      })
      .catch(() => {
        // The Conversions API copy still reports the sale.
      });
  }, [convex, sessionId, shortCode]);
}

function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.758.459 3.474 1.332 4.988L2 22l5.184-1.361a9.923 9.923 0 0 0 4.847 1.261h.004c5.515 0 9.965-4.453 9.965-9.969 0-2.664-1.037-5.168-2.92-7.051C17.197 3.037 14.693 2 12.031 2Zm5.822 14.277c-.246.693-1.432 1.326-1.988 1.41-.508.076-1.15.109-1.855-.115-.428-.136-.977-.318-1.682-.623-2.961-1.279-4.895-4.262-5.043-4.459-.148-.197-1.205-1.604-1.205-3.059 0-1.455.762-2.17 1.033-2.467.271-.297.592-.371.789-.371.197 0 .395.002.568.01.182.009.426-.069.666.508.246.592.838 2.047.912 2.195.074.148.123.32.025.518-.098.197-.148.32-.297.494-.148.172-.311.385-.443.518-.148.148-.303.309-.131.605.172.297.766 1.264 1.645 2.047 1.131 1.008 2.084 1.32 2.381 1.469.297.148.469.123.643-.074.172-.197.74-.863.938-1.16.197-.297.395-.246.666-.148.271.098 1.727.814 2.023.963.297.148.494.223.568.346.074.123.074.715-.172 1.408Z" />
    </svg>
  );
}

function SuccessContent() {
  const t = useTranslations("SuccessPage");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const shortCode = (searchParams.get("code") || "").trim().toUpperCase();
  usePurchaseEvent(shortCode);

  const order = useQuery(api.orders.getSuccessOrderByCode, shortCode ? { shortCode } : "skip");
  const recordWhatsAppClick = useMutation(api.orders.recordWhatsAppClick);

  const [savedDetails, setSavedDetails] = useState<SavedCheckoutDetails | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [clickedLocal, setClickedLocal] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_DETAILS_KEY);
      if (raw) setSavedDetails(JSON.parse(raw));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const formattedFields = useMemo(() => {
    const customerName = order?.customerName || savedDetails?.fullName || "";
    const customerPhone = order?.customerPhone || savedDetails?.phone || "";
    const governorateName = order?.governorate?.name_ar || order?.governorate?.name_en || "";

    const rawAddress = order?.customerAddress || savedDetails?.address || "";
    const building = order?.buildingNumber || savedDetails?.buildingNumber || "";
    const floor = order?.floorNumber || savedDetails?.floorNumber || "";
    const apartment = order?.apartmentNumber || savedDetails?.apartmentNumber || "";
    const unitParts = [
      building ? `عمارة ${building}` : "",
      floor ? `الدور ${floor}` : "",
      apartment ? `شقة ${apartment}` : "",
    ].filter(Boolean);
    const fullAddress = [rawAddress, ...unitParts].filter(Boolean).join("، ");

    const productsText =
      order && order.items.length > 0
        ? order.items
            .map((item) => {
              const name = item.productNameAr || item.productNameEn;
              const variant =
                item.variantName && item.variantName !== "Default"
                  ? ` (${item.color || item.variantName})`
                  : "";
              const qty = item.quantity > 1 ? ` × ${item.quantity}` : "";
              return `${name}${variant}${qty}`;
            })
            .join(" + ")
        : "";

    const shippingText =
      order !== null && order !== undefined
        ? order.shippingFee > 0
          ? `${order.shippingFee} جنيه`
          : "مجاني"
        : "";

    const orderTotalText =
      order !== null && order !== undefined ? `${order.totalWithShipping} جنيه` : "";

    return {
      orderCode: shortCode,
      customerName,
      customerPhone,
      governorateName,
      fullAddress,
      productsText,
      shippingText,
      orderTotalText,
    };
  }, [order, savedDetails, shortCode]);

  const readyWhatsAppMessage = useMemo(() => {
    return [
      "تفاصيل الاوردر ❤️⬇️",
      "",
      `رقم الطلب: ${formattedFields.orderCode}`,
      `اسم العميل : ${formattedFields.customerName}`,
      `رقم العميل: ${formattedFields.customerPhone}`,
      `المحافظة: ${formattedFields.governorateName}`,
      `العنوان: ${formattedFields.fullAddress}`,
      `المنتج: ${formattedFields.productsText}`,
      `تكلفة الشحن: ${formattedFields.shippingText}`,
      `تكلفة الأوردر: ${formattedFields.orderTotalText}`,
    ].join("\n");
  }, [formattedFields]);

  const whatsappHref = useMemo(() => {
    if (!shortCode) return "#";
    return whatsappLink(readyWhatsAppMessage);
  }, [shortCode, readyWhatsAppMessage]);

  const handleWhatsAppClick = () => {
    if (!shortCode) return;
    setClickedLocal(true);
    void recordWhatsAppClick({ shortCode }).catch(() => {
      // Non-blocking: opening WhatsApp for the customer always comes first.
    });
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(readyWhatsAppMessage);
      setCopiedMsg(true);
      toast.success(t("copiedMessage"));
      window.setTimeout(() => setCopiedMsg(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (!shortCode) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background p-6 text-center transition-colors">
        <h1 className="font-space-grotesk text-2xl font-bold text-foreground sm:text-3xl">
          {t("errors.notFound")}
        </h1>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-primary px-6 py-3 font-space-grotesk text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
        >
          {t("errors.backToStore")}
        </Link>
      </div>
    );
  }

  const hasClickedWhatsApp = clickedLocal || Boolean(order?.whatsappClickedAt);

  const summaryRows = [
    { label: "رقم الطلب", value: formattedFields.orderCode, isMono: true },
    { label: "اسم العميل", value: formattedFields.customerName },
    { label: "رقم العميل", value: formattedFields.customerPhone, isMono: true },
    { label: "المحافظة", value: formattedFields.governorateName },
    { label: "العنوان", value: formattedFields.fullAddress },
    { label: "المنتج", value: formattedFields.productsText },
    { label: "تكلفة الشحن", value: formattedFields.shippingText },
    { label: "تكلفة الأوردر", value: formattedFields.orderTotalText, highlight: true },
  ];

  return (
    <div className="min-h-screen bg-background px-3.5 pb-16 pt-5 transition-colors sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-xl space-y-4 sm:space-y-6">
        {/* Main Hero & Primary WhatsApp Action Card */}
        <section
          dir="rtl"
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-center shadow-sm sm:rounded-3xl sm:p-8"
        >
          <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center space-y-4 sm:space-y-5">
            {/* Compact celebratory icon */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-500 shadow-sm sm:h-16 sm:w-16">
              <CheckCircle2 className="h-8 w-8 sm:h-9 sm:w-9" strokeWidth={2.5} />
            </div>

            {/* Core message requested by user */}
            <div className="space-y-2">
              <h1 className="text-xl font-extrabold leading-snug text-foreground sm:text-2xl md:text-3xl">
                🎉 تم استلام طلبك بنجاح!
              </h1>
              <p className="mx-auto max-w-md text-sm font-semibold leading-relaxed text-foreground/85 sm:text-base">
                لتأكيد ومتابعة طلبك، اضغط على زر{" "}
                <span className="font-bold text-[#25D366]">WhatsApp</span> وأرسل الرسالة الجاهزة.
              </p>
            </div>

            {/* Primary WhatsApp Confirmation CTA */}
            <div className="w-full space-y-2.5 pt-1">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppClick}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-[#25D366]/25 transition-all hover:bg-[#20bd5a] active:scale-[0.98] sm:py-4.5 sm:text-lg"
              >
                <WhatsAppIcon className="h-6 w-6 shrink-0" />
                <span>تأكيد الطلب عبر WhatsApp</span>
              </a>

              {hasClickedWhatsApp && (
                <p className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{t("whatsappClickedHint")}</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Ready-Made Message & Order Details Preview Card */}
        <section
          dir="rtl"
          className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:rounded-3xl sm:p-6"
        >
          <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-sm font-extrabold text-foreground sm:text-base">
              تفاصيل الاوردر ❤️⬇️
            </h2>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/60 px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
            >
              {copiedMsg ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-label-muted" />
              )}
              <span>{copiedMsg ? "تم نسخ الرسالة" : t("copyMessage")}</span>
            </button>
          </div>

          {order === undefined ? (
            <div className="space-y-2.5 py-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-5 w-full animate-pulse rounded-lg bg-accent/60" />
              ))}
            </div>
          ) : (
            <dl className="divide-y divide-border/60 text-sm">
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="shrink-0 font-semibold text-label-muted">{row.label}:</dt>
                  <dd
                    dir={row.isMono ? "ltr" : undefined}
                    className={
                      row.highlight
                        ? "text-left font-extrabold text-primary sm:text-base"
                        : row.isMono
                          ? "font-mono font-bold text-foreground"
                          : "text-left font-bold text-foreground"
                    }
                  >
                    {row.value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Compact Trust Badges (3 columns even on mobile) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-bold leading-tight text-label-muted">
              {t("badges.stock")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-bold leading-tight text-label-muted">
              {t("badges.secure")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <Truck className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-bold leading-tight text-label-muted">
              {t("badges.delivery")}
            </span>
          </div>
        </div>

        {/* Secondary Actions: Track Order + Back to Shopping */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          <Link
            href={{ pathname: "/track", query: { code: shortCode } }}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
          >
            <Truck className="h-4 w-4 text-primary" />
            <span>{t("actions.track")}</span>
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-accent/40 px-4 py-3.5 text-sm font-bold text-label-muted transition-colors hover:bg-accent hover:text-foreground"
          >
            <span>{t("actions.back")}</span>
            <ArrowRight
              className={`h-4 w-4 ${locale === "ar" ? "rotate-180" : ""}`}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const t = useTranslations("SuccessPage");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm font-bold text-label-muted">
          {t("loading")}
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
