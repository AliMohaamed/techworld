"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  PackageSearch,
  Search,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Link } from "@/navigation";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/contact";

/** Happy-path states, in FSM order. Anything else is an exception state. */
const FLOW_STATES = [
  "PENDING_PAYMENT_INPUT",
  "AWAITING_VERIFICATION",
  "CONFIRMED",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED",
] as const;

type FlowState = (typeof FLOW_STATES)[number];

const EXCEPTION_ICONS = {
  CANCELLED: Undo2,
  RTO: Undo2,
  STALLED_PAYMENT: AlertTriangle,
  FLAGGED_FRAUD: ShieldAlert,
} as const;

type ExceptionState = keyof typeof EXCEPTION_ICONS;

function isFlowState(state: string): state is FlowState {
  return (FLOW_STATES as readonly string[]).includes(state);
}

export default function OrderTracker() {
  const t = useTranslations("TrackPage");
  const locale = useLocale();
  const searchParams = useSearchParams();

  // Deep link from the order-success page: /track?code=ABC123. Derived during
  // render rather than pushed through an effect; typing takes over from there.
  const prefilledCode = (searchParams.get("code") ?? "").toUpperCase();
  const [typedCode, setTypedCode] = useState<string | null>(null);
  const code = typedCode ?? prefilledCode;

  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<{
    shortCode: string;
    phoneLast4: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const result = useQuery(api.orders.trackOrderByCode, query ?? "skip");
  const isLoading = query !== null && result === undefined;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const last4 = phone.replace(/\D/g, "").slice(-4);

    if (trimmedCode.length < 4 || last4.length !== 4) {
      setError(t("form.validation"));
      setQuery(null);
      return;
    }

    setError(null);
    setQuery({ shortCode: trimmedCode, phoneLast4: last4 });
  };

  const order = result?.status === "FOUND" ? result.order : null;

  const reachedAt = useMemo(() => {
    const map = new Map<string, number>();
    if (!order) return map;
    map.set("PENDING_PAYMENT_INPUT", order.placedAt);
    for (const event of order.timeline) {
      if (event.state && !map.has(event.state)) {
        map.set(event.state, event.timestamp);
      }
    }
    return map;
  }, [order]);

  // For an exception state the flow still shows how far the order actually got.
  const activeIndex = useMemo(() => {
    if (!order) return -1;
    if (isFlowState(order.state)) return FLOW_STATES.indexOf(order.state);
    let furthest = 0;
    FLOW_STATES.forEach((state, index) => {
      if (reachedAt.has(state)) furthest = index;
    });
    return furthest;
  }, [order, reachedAt]);

  const exceptionState =
    order && !isFlowState(order.state) ? (order.state as ExceptionState) : null;
  const ExceptionIcon = exceptionState ? EXCEPTION_ICONS[exceptionState] : null;

  return (
    <div className="space-y-10">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-10"
      >
        <div className="grid gap-6 md:grid-cols-[1.2fr_1fr_auto] md:items-start">
          <div className="space-y-2">
            <label
              htmlFor="track-code"
              className="block font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted"
            >
              {t("form.codeLabel")}
            </label>
            <input
              id="track-code"
              name="code"
              value={code}
              onChange={(event) => setTypedCode(event.target.value.toUpperCase())}
              placeholder={t("form.codePlaceholder")}
              autoComplete="off"
              dir="ltr"
              aria-describedby="track-code-hint"
              className="h-14 w-full rounded-xl border border-border bg-background px-4 font-space-grotesk text-lg font-bold uppercase tracking-[0.2em] text-foreground outline-none transition-all placeholder:tracking-normal placeholder:text-label-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p id="track-code-hint" className="text-xs text-label-muted">
              {t("form.codeHint")}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="track-phone"
              className="block font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted"
            >
              {t("form.phoneLabel")}
            </label>
            <input
              id="track-phone"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="1234"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              dir="ltr"
              aria-describedby="track-phone-hint"
              className="h-14 w-full rounded-xl border border-border bg-background px-4 font-space-grotesk text-lg font-bold tracking-[0.3em] text-foreground outline-none transition-all placeholder:text-label-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p id="track-phone-hint" className="text-xs text-label-muted">
              {t("form.phoneHint")}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-xl bg-primary px-8 font-space-grotesk text-xs font-black uppercase tracking-[0.3em] text-primary-foreground transition-all hover:bg-foreground hover:text-background active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:mt-[26px]"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            ) : (
              <Search size={18} aria-hidden="true" />
            )}
            {t("form.submit")}
          </button>
        </div>

        <div aria-live="polite">
          {error && (
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      </form>

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-label-muted">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            <span className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.4em]">
              {t("states.loading")}
            </span>
          </div>
        )}

        {result && result.status !== "FOUND" && (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-16 text-center">
            <PackageSearch
              size={40}
              className="text-label-muted/40"
              aria-hidden="true"
            />
            <h2 className="font-space-grotesk text-xl font-black uppercase tracking-tightest text-foreground">
              {t("states.notFoundTitle")}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-label-muted">
              {t("states.notFoundBody")}
            </p>
            <a
              href={whatsappLink(t("states.notFoundWhatsapp"))}
              target="_blank"
              rel="noopener noreferrer"
              className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-primary underline-offset-8 hover:underline"
            >
              {t("states.notFoundCta")}
            </a>
          </div>
        )}

        {order && (
          <div className="space-y-6">
            {exceptionState && ExceptionIcon && (
              <div className="flex items-start gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                <ExceptionIcon
                  size={22}
                  className="mt-0.5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-space-grotesk text-sm font-black uppercase tracking-[0.2em] text-destructive">
                    {t(`exceptions.${exceptionState}.title`)}
                  </p>
                  <p className="text-sm leading-relaxed text-label-muted">
                    {t(`exceptions.${exceptionState}.body`)}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <section
                aria-label={t("progress.heading")}
                className="rounded-2xl border border-border bg-card p-6 md:p-10"
              >
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-label-muted">
                      {t("progress.orderRef")}
                    </p>
                    <p
                      className="font-space-grotesk text-3xl font-black tracking-tightest text-foreground"
                      dir="ltr"
                    >
                      {order.shortCode}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-4 py-2 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em]",
                      exceptionState
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-primary/30 bg-primary/10 text-primary"
                    )}
                  >
                    {t(`states.labels.${order.state}`)}
                  </span>
                </div>

                <ol className="relative">
                  {FLOW_STATES.map((state, index) => {
                    const isDone = index < activeIndex;
                    const isCurrent = index === activeIndex && !exceptionState;
                    const isReached = index <= activeIndex;
                    const timestamp = reachedAt.get(state);
                    const isLast = index === FLOW_STATES.length - 1;

                    return (
                      <li
                        key={state}
                        className="relative flex gap-5 pb-8 last:pb-0"
                      >
                        {!isLast && (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute top-9 h-[calc(100%-2.25rem)] w-px ltr:left-[17px] rtl:right-[17px]",
                              isDone ? "bg-primary" : "bg-border"
                            )}
                          />
                        )}
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black transition-all",
                            isReached
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary text-label-muted",
                            isCurrent && "ring-4 ring-primary/20"
                          )}
                        >
                          {isDone || (isReached && isLast) ? (
                            <Check size={16} strokeWidth={3} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <div className="min-w-0 space-y-1 pt-1">
                          <p
                            className={cn(
                              "font-space-grotesk text-sm font-bold tracking-tight",
                              isReached ? "text-foreground" : "text-label-muted"
                            )}
                          >
                            {t(`progress.steps.${state}.title`)}
                            {isCurrent && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary ltr:ml-2 rtl:mr-2">
                                {t("progress.current")}
                              </span>
                            )}
                          </p>
                          <p className="text-xs leading-relaxed text-label-muted">
                            {t(`progress.steps.${state}.description`)}
                          </p>
                          {timestamp && isReached && (
                            <p className="text-[11px] font-medium text-label-muted/70">
                              {dateFormatter.format(new Date(timestamp))}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <aside className="space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
                <h2 className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.4em] text-label-muted">
                  {t("summary.heading")}
                </h2>

                <div className="flex items-start gap-4">
                  {order.product?.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.product.thumbnail}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
                      <PackageSearch
                        size={22}
                        className="text-label-muted/40"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <p className="font-space-grotesk text-sm font-bold leading-snug text-foreground">
                      {locale === "ar"
                        ? order.product?.name_ar
                        : order.product?.name_en}
                    </p>
                    {order.variantName && (
                      <p className="text-xs text-label-muted">
                        {order.variantName}
                      </p>
                    )}
                    <p className="text-xs text-label-muted">
                      {t("summary.quantity", { count: order.quantity })}
                    </p>
                  </div>
                </div>

                <dl className="space-y-3 border-t border-border pt-5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-label-muted">{t("summary.placedOn")}</dt>
                    <dd className="font-medium text-foreground">
                      {dateFormatter.format(new Date(order.placedAt))}
                    </dd>
                  </div>
                  {order.governorate && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-label-muted">
                        {t("summary.destination")}
                      </dt>
                      <dd className="font-medium text-foreground">
                        {locale === "ar"
                          ? order.governorate.name_ar
                          : order.governorate.name_en}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-label-muted">{t("summary.phone")}</dt>
                    <dd className="font-medium text-foreground" dir="ltr">
                      {order.phoneMasked}
                    </dd>
                  </div>
                  {order.shippingFee !== null && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-label-muted">
                        {t("summary.shipping")}
                      </dt>
                      <dd className="font-medium text-foreground">
                        {order.shippingFee.toLocaleString(locale)}{" "}
                        {t("summary.currency")}
                      </dd>
                    </div>
                  )}
                  {order.discountApplied ? (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-label-muted">
                        {t("summary.discount")}
                        {order.promoCode ? ` · ${order.promoCode}` : ""}
                      </dt>
                      <dd className="font-medium text-primary">
                        -{order.discountApplied.toLocaleString(locale)}{" "}
                        {t("summary.currency")}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
                    <dt className="font-space-grotesk text-xs font-black uppercase tracking-[0.2em] text-foreground">
                      {t("summary.total")}
                    </dt>
                    <dd className="font-space-grotesk text-xl font-black tracking-tight text-foreground">
                      {order.totalPrice.toLocaleString(locale)}{" "}
                      <span className="text-xs text-primary">
                        {t("summary.currency")}
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="space-y-3 border-t border-border pt-5">
                  <a
                    href={whatsappLink(
                      t("summary.whatsappMessage", { code: order.shortCode })
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center rounded-xl bg-primary py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground transition-all hover:bg-foreground hover:text-background"
                  >
                    {t("summary.contactCta")}
                  </a>
                  {order.product?.slug && (
                    <Link
                      href={`/products/${order.product.slug}`}
                      className="flex w-full items-center justify-center rounded-xl border border-border py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted transition-all hover:border-primary/30 hover:text-foreground"
                    >
                      {t("summary.viewProduct")}
                    </Link>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
