"use client";

import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/navigation";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Phone,
  Settings2,
  ShieldCheck,
  Undo2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
} from "@techworld/ui";
import { useTranslations, useLocale } from "next-intl";
import {
  ALL_STATES,
  DESTRUCTIVE_STATES,
  EXCEPTION_STATES,
  FLOW_STATES,
  isOrderState,
  nextStepFor,
  stateTone,
  type OrderState,
} from "@/components/orders/order-state";
import { QUEUE_QUERY_KEY } from "@/components/orders/queue-query";
import { hasPermission } from "@backend/convex/lib/permissions";
import { canTransition, statusChangePermission } from "@backend/convex/lib/orderTransitions";

type OrderDetails = NonNullable<FunctionReturnType<typeof api.orders.getOrderDetails>>;
type Confirming = "verify" | "cancel" | "stall" | "rto" | null;

const errorMessage = (error: unknown) => {
  const e = error as { data?: { message?: string }; message?: string } | null;
  return e?.data?.message || e?.message || "";
};

export default function OrderDetailsPage() {
  const t = useTranslations("Orders.details");
  const tQueue = useTranslations("Orders.queue");
  const tOrders = useTranslations("Orders");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id as Id<"orders">;
  const order = useQuery(api.orders.getOrderDetails, { orderId });
  const profile = useQuery(api.auth.getCurrentStaffProfile);
  // Receipt uploads and payment-confirming moves both need VERIFY_PAYMENTS (enforced server-side too).
  const canVerifyPayments = hasPermission(profile, "VERIFY_PAYMENTS");
  const updateGenericStatus = useMutation(api.orders.updateGenericStatus);
  const updateRto = useMutation(api.orders.updateRto);
  const generateReceiptUploadUrl = useMutation(api.files.generateReceiptUploadUrl);

  const [isVerifySheetOpen, setIsVerifySheetOpen] = useState(false);
  const [isManualOverrideOpen, setIsManualOverrideOpen] = useState(false);
  const [manualState, setManualState] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [queueHref, setQueueHref] = useState("/orders");

  // Return to the queue with the filters the agent left it with.
  useEffect(() => {
    try {
      const query = sessionStorage.getItem(QUEUE_QUERY_KEY);
      if (query) setQueueHref(`/orders?${query}`);
    } catch {
      // Storage can be unavailable; the plain queue still works.
    }
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const egp = t("summary.egp");
  const money = (value: number) => `${nf.format(value)} ${egp}`;

  if (order === undefined) {
    return <DetailsSkeleton label={t("loading")} />;
  }

  if (!order) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 rounded-[32px] border border-border bg-card px-6 py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-base font-bold text-foreground">{t("notFound")}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t("notFoundHint")}</p>
        <Link
          href={queueHref}
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background transition-colors hover:bg-[#ffc105] hover:text-black"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("back")}
        </Link>
      </main>
    );
  }

  const state = order.state as OrderState;
  const amountDue = order.total_price + (order.appliedShippingFee || 0);
  const next = nextStepFor(state);
  const isException = EXCEPTION_STATES.includes(state);
  const lineStates = order.lines.map((line) => line.state as OrderState);
  const isAllowed = (newState: OrderState) =>
    canVerifyPayments || statusChangePermission(lineStates, newState) !== "VERIFY_PAYMENTS";
  // Fulfilment steps need a confirmed order first (the server enforces the same rule).
  const isReachable = (newState: OrderState) => canTransition(lineStates, newState);

  const productName = (line: OrderDetails["lines"][number]) =>
    (locale === "ar" ? line.product?.name_ar : line.product?.name_en) ??
    line.product?.name_en ??
    tQueue("table.unknownProduct");
  const categoryName = (line: OrderDetails["lines"][number]) =>
    (locale === "ar" ? line.category?.name_ar : line.category?.name_en) ?? line.category?.name_en ?? null;

  const governorateName = order.governorate
    ? locale === "ar"
      ? order.governorate.name_ar
      : order.governorate.name_en
    : null;

  const placedAt = new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "short" }).format(
    order._creationTime,
  );

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("copied", { label }));
    } catch {
      // Clipboard can be blocked; the value stays selectable.
    }
  };

  const reportFailure = (error: unknown) => {
    const message = errorMessage(error);
    if (message.includes("OUT_OF_STOCK") || message.toLowerCase().includes("out of stock")) {
      toast.error(t("messages.outOfStock"), { description: t("messages.outOfStockDescription") });
    } else {
      toast.error(t("messages.updateFailed"), { description: message || t("messages.tryAgain") });
    }
  };

  const uploadReceipt = async () => {
    if (!selectedFile) return undefined;

    // Compress receipt image (keeping original file format/type)
    let compressed: File;
    try {
      compressed = await imageCompression(selectedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 2400,
        useWebWorker: true,
      });
    } catch (err) {
      console.error("Receipt compression failed, uploading original:", err);
      compressed = selectedFile;
    }

    const contentType = selectedFile.type;
    const { uploadUrl, key } = await generateReceiptUploadUrl({ contentType });
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: compressed,
    });

    if (!response.ok) {
      throw new Error(t("messages.uploadFailed"));
    }

    return `r2:${key}`;
  };

  /**
   * Moves the whole customer order. Verification decisions close the task and
   * return to the queue; logistics steps and overrides keep the agent here.
   */
  const changeState = async (newState: OrderState, { returnToQueue }: { returnToQueue: boolean }) => {
    // Checked before uploading, so a refused change never leaves an orphaned receipt in storage.
    if (!isAllowed(newState)) {
      toast.error(t("messages.updateFailed"), { description: t("messages.needsVerifyPayments") });
      return;
    }
    setIsSubmitting(true);
    try {
      const manualReceiptId = canVerifyPayments ? await uploadReceipt() : undefined;
      await updateGenericStatus({ orderId, newState, manualReceiptId });
      toast.success(t("messages.statusUpdated", { state: t(`states.${newState}`) }));
      setIsVerifySheetOpen(false);
      setIsManualOverrideOpen(false);
      setSelectedFile(null);
      setManualState("");
      setConfirming(null);
      if (returnToQueue) router.push(queueHref);
    } catch (error) {
      reportFailure(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRto = async () => {
    setIsSubmitting(true);
    try {
      await updateRto({ orderId });
      toast.success(t("messages.rtoSuccess"));
      setConfirming(null);
    } catch (error) {
      toast.error(t("messages.rtoFailed"), { description: errorMessage(error) || t("messages.unknown") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const runConfirmed = () => {
    switch (confirming) {
      case "verify":
        return changeState("CONFIRMED", { returnToQueue: true });
      case "cancel":
        return changeState("CANCELLED", { returnToQueue: true });
      case "stall":
        return changeState("STALLED_PAYMENT", { returnToQueue: true });
      case "rto":
        return handleRto();
    }
  };

  const confirmCopy: Record<Exclude<Confirming, null>, { title: string; body: string; tone: "primary" | "danger" }> = {
    verify: { title: t("confirm.verify", { amount: money(amountDue) }), body: t("confirm.verifyBody"), tone: "primary" },
    cancel: { title: t("confirm.cancel"), body: t("confirm.cancelBody"), tone: "danger" },
    stall: { title: t("confirm.stall"), body: t("confirm.stallBody"), tone: "danger" },
    rto: { title: t("confirm.rto"), body: t("messages.rtoConfirm"), tone: "danger" },
  };

  const financial = (value: number | string | null) =>
    typeof value === "number" ? money(value) : value === null ? t("financials.na") : "•••";

  // Where the order left the happy path, for exception states.
  const exitedFrom = (() => {
    if (!isException) return null;
    const exit = [...(order.activity ?? [])].reverse().find((event) => event.to === state && event.from);
    return exit?.from && isOrderState(exit.from) ? exit.from : null;
  })();
  const reachedIndex = isException
    ? exitedFrom
      ? FLOW_STATES.indexOf(exitedFrom)
      : -1
    : FLOW_STATES.indexOf(state);

  const tel = (phone: string) => phone.replace(/[^\d+]/g, "");
  const whatsapp = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    // Local Egyptian numbers (01xxxxxxxxx) need the country code for wa.me.
    return `https://wa.me/${digits.startsWith("0") ? `2${digits}` : digits}`;
  };

  const decision = (() => {
    if (state === "AWAITING_VERIFICATION") {
      return (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-lg font-bold text-foreground">{t("decision.verifyTitle")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {order.receiptUrl ? t("decision.verifyBody") : t("decision.noReceipt")}
              </p>
            </div>
            <div className="text-end">
              <p className="text-xs font-bold text-muted-foreground">{t("decision.amountDue")}</p>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {nf.format(amountDue)} <span className="text-base text-muted-foreground">{egp}</span>
              </p>
            </div>
          </div>
          {!canVerifyPayments && (
            <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-semibold text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              {t("decision.verifyRestricted")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!canVerifyPayments ? null : order.receiptUrl ? (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirming("verify")}
                className="h-11 rounded-xl bg-[#ffc105] px-6 text-sm font-bold text-black hover:bg-[#ffc105]/85"
              >
                <CheckCircle2 className="h-4 w-4" />
                {tQueue("table.next.verify")}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsVerifySheetOpen(true)}
                className="h-11 rounded-xl bg-[#ffc105] px-6 text-sm font-bold text-black hover:bg-[#ffc105]/85"
              >
                <UploadCloud className="h-4 w-4" />
                {t("decision.uploadAndVerify")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setConfirming("stall")}
              className="h-11 rounded-xl border-border px-4 text-sm font-bold hover:bg-accent"
            >
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              {t("actions.markStalled")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => setConfirming("cancel")}
              className="h-11 rounded-xl px-4 text-sm font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="h-4 w-4" />
              {t("actions.cancel")}
            </Button>
            {canVerifyPayments && order.receiptUrl && (
              <button
                type="button"
                onClick={() => setIsVerifySheetOpen(true)}
                className="rounded-md px-2 py-1 text-xs font-bold text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105] ltr:ml-auto rtl:mr-auto"
              >
                {t("decision.replaceReceipt")}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (next?.kind === "advance") {
      return (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-foreground">{t("decision.nextTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`decision.next.${state}`)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state === "SHIPPED" && (
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => setConfirming("rto")}
                className="h-11 rounded-xl px-4 text-sm font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Undo2 className="h-4 w-4" />
                {t("actions.rto")}
              </Button>
            )}
            <Button
              type="button"
              disabled={isSubmitting || !isAllowed(next.to)}
              onClick={() => void changeState(next.to, { returnToQueue: false })}
              className="h-11 rounded-xl bg-foreground px-6 text-sm font-bold text-background transition-colors hover:bg-[#ffc105] hover:text-black"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {tQueue(`table.next.${next.labelKey}`)}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-lg font-bold text-foreground">{t(`states.${state}`)}</h2>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{t(`decision.idle.${state}`)}</p>
      </div>
    );
  })();

  return (
    <main className="space-y-6 pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={queueHref}
          className="group inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-bold text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors group-hover:border-foreground/30">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5" />
          </span>
          {t("back")}
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsManualOverrideOpen(true)}
          className="h-10 rounded-xl border-border px-4 text-xs font-bold hover:bg-accent"
        >
          <Settings2 className="h-4 w-4" />
          {t("actions.manualOverride")}
        </Button>
      </div>

      {/* Identity + journey */}
      <section className="rounded-[32px] border border-border bg-card p-5 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground md:text-4xl" dir="ltr">
                {order.shortCode ?? tQueue("table.noCode")}
              </h1>
              {order.shortCode && (
                <button
                  type="button"
                  onClick={() => copy(order.shortCode!, order.shortCode!)}
                  aria-label={tQueue("table.copyCode")}
                  title={tQueue("table.copyCode")}
                  className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105]"
                >
                  <Copy className="h-4 w-4" />
                </button>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                  stateTone(state).badge,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", stateTone(state).dot)} aria-hidden />
                {t(`states.${state}`)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{order.customerName ?? tQueue("table.walkInCustomer")}</span>
              <span aria-hidden className="mx-2 text-border">•</span>
              <time dateTime={new Date(order._creationTime).toISOString()}>{placedAt}</time>
            </p>
          </div>
          <div className="shrink-0 md:text-end">
            <p className="text-xs font-bold text-muted-foreground">{t("summary.total")}</p>
            <p className="text-3xl font-bold tabular-nums text-foreground md:text-4xl">
              {nf.format(amountDue)} <span className="text-base font-bold text-muted-foreground">{egp}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tQueue("table.items", { count: order.quantity })}
            </p>
          </div>
        </div>

        {/* Journey through the FSM */}
        <ol aria-label={t("journey.label")} className="mt-8 grid grid-cols-3 gap-y-5 sm:grid-cols-6">
          {FLOW_STATES.map((step, index) => {
            const done = index < reachedIndex || (index === reachedIndex && step === "DELIVERED" && !isException);
            const current = index === reachedIndex && !isException;
            const exitPoint = isException && index === reachedIndex;
            return (
              <li key={step} className="relative flex flex-col gap-2 pe-3" aria-current={current ? "step" : undefined}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                      done && "border-foreground bg-foreground text-background",
                      current && "border-[#ffc105] bg-[#ffc105] text-black ring-4 ring-[#ffc105]/25",
                      exitPoint && "border-destructive bg-destructive text-white",
                      !done && !current && !exitPoint && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : exitPoint ? <XCircle className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  {index < FLOW_STATES.length - 1 && (
                    <span
                      aria-hidden
                      className={cn("h-0.5 flex-1 rounded-full", index < reachedIndex ? "bg-foreground" : "bg-border")}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-bold leading-tight",
                    current ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {t(`states.${step}`)}
                </span>
              </li>
            );
          })}
        </ol>
        {isException && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/5 px-3 py-2 text-xs font-bold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {exitedFrom
              ? t("journey.exitedFrom", { state: t(`states.${state}`), from: t(`states.${exitedFrom}`) })
              : t("journey.exited", { state: t(`states.${state}`) })}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          {/* Decision panel: the one thing to do on this order right now */}
          <section
            className={cn(
              "rounded-[32px] border bg-card p-5 md:p-8",
              state === "AWAITING_VERIFICATION" ? "border-[#ffc105]/60" : "border-border",
            )}
          >
            {confirming ? (
              <div role="alertdialog" aria-labelledby="confirm-title" className="space-y-4">
                <div>
                  <h2 id="confirm-title" className="text-lg font-bold text-foreground">
                    {confirmCopy[confirming].title}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {confirmCopy[confirming].body}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    autoFocus
                    disabled={isSubmitting}
                    onClick={() => void runConfirmed()}
                    className={cn(
                      "h-11 rounded-xl px-6 text-sm font-bold",
                      confirmCopy[confirming].tone === "danger"
                        ? "bg-destructive text-white hover:bg-destructive/90"
                        : "bg-[#ffc105] text-black hover:bg-[#ffc105]/85",
                    )}
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tQueue("table.confirm.yes")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmitting}
                    onClick={() => setConfirming(null)}
                    className="h-11 rounded-xl px-4 text-sm font-bold"
                  >
                    {tQueue("table.confirm.keep")}
                  </Button>
                </div>
              </div>
            ) : (
              decision
            )}
          </section>

          {/* Items */}
          <section className="overflow-hidden rounded-[32px] border border-border bg-card">
            <h2 className="border-b border-border px-5 py-4 text-base font-bold text-foreground md:px-8">
              {t("items.title")}
            </h2>
            <ul className="divide-y divide-border">
              {order.lines.map((line) => {
                const stock = line.sku?.real_stock;
                const lowStock = typeof stock === "number" && stock <= 0;
                return (
                  <li key={line._id} className="flex gap-4 px-5 py-5 md:px-8">
                    <Thumb src={line.thumbnailUrl ?? null} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">{productName(line)}</p>
                          {categoryName(line) && (
                            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{categoryName(line)}</p>
                          )}
                        </div>
                        <p className="font-bold tabular-nums text-foreground">{money(line.total_price)}</p>
                      </div>
                      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <dt className="text-muted-foreground">{t("cards.quantity")}</dt>
                          <dd className="font-bold tabular-nums text-foreground">{nf.format(line.quantity)}</dd>
                        </div>
                        {line.quantity > 0 && (
                          <div className="flex items-center gap-1.5">
                            <dt className="text-muted-foreground">{t("items.unitPrice")}</dt>
                            <dd className="font-bold tabular-nums text-foreground">
                              {money(Math.round((line.total_price / line.quantity) * 100) / 100)}
                            </dd>
                          </div>
                        )}
                        {(line.sku?.variantAttributes?.color || line.sku?.variantName) && (
                          <div className="flex items-center gap-1.5">
                            <dt className="text-muted-foreground">{t("cards.variant")}</dt>
                            <dd className="flex items-center gap-1.5 font-bold text-foreground">
                              {line.sku?.variantAttributes?.colorCode && (
                                <span
                                  className="h-3 w-3 rounded-full border border-border"
                                  style={{ backgroundColor: line.sku.variantAttributes.colorCode }}
                                  aria-hidden
                                />
                              )}
                              {line.sku?.variantAttributes?.color ?? line.sku?.variantName}
                            </dd>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <dt className="text-muted-foreground">{t("cards.realStock")}</dt>
                          <dd
                            className={cn(
                              "font-bold tabular-nums",
                              lowStock ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {typeof stock === "number" ? nf.format(stock) : t("unknown")}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Money */}
          <section className="rounded-[32px] border border-border bg-card p-5 md:p-8">
            <h2 className="text-base font-bold text-foreground">{t("summary.title")}</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t("summary.subtotal")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {money(order.total_price + (order.discount_applied || 0))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{t("summary.shipping")}</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {(order.appliedShippingFee ?? 0) > 0 ? money(order.appliedShippingFee ?? 0) : t("summary.freeShipping")}
                </dd>
              </div>
              {((order.discount_applied ?? 0) > 0 || order.promo_code_snapshot) && (
                <div className="flex items-center justify-between gap-4 text-emerald-700 dark:text-emerald-400">
                  <dt>{t("summary.discount", { code: order.promo_code_snapshot || "" })}</dt>
                  <dd className="font-semibold tabular-nums">
                    {(order.discount_applied ?? 0) > 0 ? `−${money(order.discount_applied ?? 0)}` : t("summary.freeShipping")}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 border-t border-border pt-4 text-lg font-bold text-foreground">
                <dt>{t("summary.total")}</dt>
                <dd className="tabular-nums">{money(amountDue)}</dd>
              </div>
            </dl>

            <div className="mt-8 border-t border-dashed border-border pt-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-foreground">{t("financials.title")}</h3>
                {!order.canViewFinancials && (
                  <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                    {t("financials.masked")}
                  </span>
                )}
              </div>
              {order.canViewFinancials ? (
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: t("cards.unitCogs"), value: financial(order.financials.unit_cogs) },
                    { label: t("cards.totalCogs"), value: financial(order.financials.total_cogs) },
                    {
                      label: t("cards.netMargin"),
                      value: financial(order.financials.net_margin),
                      tone:
                        typeof order.financials.net_margin === "number"
                          ? order.financials.net_margin > 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-destructive"
                          : "",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-muted/50 px-4 py-3">
                      <dt className="text-xs font-semibold text-muted-foreground">{item.label}</dt>
                      <dd className={cn("mt-1 text-lg font-bold tabular-nums text-foreground", item.tone)}>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("financials.redacted")}</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:col-span-4">
          {/* Receipt */}
          <section className="rounded-[32px] border border-border bg-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-foreground">{t("receipt.badge")}</h2>
              {order.receiptUrl && (
                <a
                  href={order.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("receipt.openShort")}
                </a>
              )}
            </div>
            {order.receiptUrl ? (
              <a
                href={order.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block overflow-hidden rounded-2xl border border-border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-[#ffc105]"
              >
                {/* Contain, never crop: the amount and reference on a receipt can sit at any edge */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.receiptUrl}
                  alt={t("receipt.alt", { code: order.shortCode ?? "" })}
                  className="max-h-[32rem] w-full object-contain"
                />
              </a>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                <ImageIcon className="mx-auto h-7 w-7 text-muted-foreground/60" />
                <p className="mt-3 text-sm text-muted-foreground">{t("receipt.missing")}</p>
                {canVerifyPayments && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsVerifySheetOpen(true)}
                    className="mt-4 h-9 rounded-xl border-border px-4 text-xs font-bold hover:bg-accent"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    {t("actions.manualFallback")}
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Customer */}
          <section className="rounded-[32px] border border-border bg-card p-5 md:p-6">
            <h2 className="text-base font-bold text-foreground">{t("customer.title")}</h2>
            <p className="mt-3 text-lg font-bold text-foreground">
              {order.customerName ?? tQueue("table.walkInCustomer")}
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              {[
                { label: t("cards.phone"), value: order.customerPhone },
                { label: t("cards.altPhone"), value: order.customerAltPhone },
              ]
                .filter((p) => p.value)
                .map((p) => (
                  <div key={p.label}>
                    <dt className="text-xs font-semibold text-muted-foreground">{p.label}</dt>
                    <dd className="mt-1 flex items-center justify-between gap-2">
                      <span dir="ltr" className="font-mono font-bold tabular-nums text-foreground">{p.value}</span>
                      <span className="flex items-center gap-1">
                        <a
                          href={`tel:${tel(p.value!)}`}
                          aria-label={`${t("customer.call")} ${p.value}`}
                          title={t("customer.call")}
                          className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105]"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={whatsapp(p.value!)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`${t("customer.whatsapp")} ${p.value}`}
                          title={t("customer.whatsapp")}
                          className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-emerald-500/10 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-[#ffc105] dark:hover:text-emerald-400"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </span>
                    </dd>
                  </div>
                ))}
              {!order.customerPhone && (
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">{t("cards.phone")}</dt>
                  <dd className="mt-1 text-muted-foreground">{t("notProvided")}</dd>
                </div>
              )}
              {order.customerEmail && (
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">{t("cards.email")}</dt>
                  <dd className="mt-1 flex items-center justify-between gap-2">
                    <span dir="ltr" className="truncate font-semibold text-foreground">{order.customerEmail}</span>
                    <a
                      href={`mailto:${order.customerEmail}`}
                      aria-label={order.customerEmail}
                      className="rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105]"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold text-muted-foreground">{t("cards.address")}</dt>
                <dd className="mt-1 flex items-start justify-between gap-2">
                  <span className="leading-relaxed text-foreground">
                    {governorateName && <span className="font-bold">{governorateName}</span>}
                    {governorateName && order.customerAddress && <br />}
                    {order.customerAddress ?? (!governorateName && t("notProvided"))}
                  </span>
                  {(order.customerAddress || governorateName) && (
                    <button
                      type="button"
                      onClick={() =>
                        copy(
                          [order.customerAddress, governorateName].filter(Boolean).join(", "),
                          t("cards.address"),
                        )
                      }
                      aria-label={t("customer.copyAddress")}
                      title={t("customer.copyAddress")}
                      className="shrink-0 rounded-lg p-2 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#ffc105]"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          {/* Activity */}
          <section className="rounded-[32px] border border-border bg-card p-5 md:p-6">
            <h2 className="text-base font-bold text-foreground">{t("activity.title")}</h2>
            {dedupeActivity(order.activity ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("activity.empty")}</p>
            ) : (
              <ol className="mt-4 space-y-0">
                {dedupeActivity(order.activity ?? []).reverse().map((event, index, list) => (
                  <li key={event._id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < list.length - 1 && (
                      <span aria-hidden className="absolute top-4 bottom-0 w-px bg-border ltr:left-[5px] rtl:right-[5px]" />
                    )}
                    <span
                      aria-hidden
                      className={cn(
                        "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-card",
                        event.to ? stateTone(event.to).dot : "bg-muted-foreground/40",
                      )}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{activityLabel(event, t as Translate)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {event.actorName ?? t("activity.system")}
                        <span aria-hidden className="mx-1.5">·</span>
                        <time dateTime={new Date(event.timestamp).toISOString()}>
                          {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(event.timestamp)}
                        </time>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>

      {/* Verification with a fallback receipt */}
      <Sheet open={isVerifySheetOpen} onOpenChange={(isOpen) => !isOpen && setIsVerifySheetOpen(false)}>
        <SheetContent side={locale === "ar" ? "left" : "right"} className="border-border bg-card p-0 sm:max-w-lg">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border p-6 md:p-8">
              <SheetTitle className="text-2xl font-bold leading-tight text-foreground">{t("modal.title")}</SheetTitle>
              <SheetDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("modal.description")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
              <ReceiptDrop
                file={selectedFile}
                previewUrl={previewUrl}
                onFile={setSelectedFile}
                label={t("modal.select")}
                hint={t("modal.types")}
                fileInfo={selectedFile ? t("modal.fileInfo", { name: selectedFile.name, size: Math.ceil(selectedFile.size / 1024) }) : null}
                removeLabel={t("modal.remove")}
              />
              <div className="flex items-baseline justify-between gap-4 rounded-2xl bg-muted/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">{t("decision.amountDue")}</span>
                <span className="text-lg font-bold tabular-nums text-foreground">{money(amountDue)}</span>
              </div>
              <div className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{t("confirm.verifyBody")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-6 md:p-8">
              <Button
                className="h-12 w-full rounded-xl bg-[#ffc105] text-sm font-bold text-black hover:bg-[#ffc105]/85"
                disabled={isSubmitting || !selectedFile}
                onClick={() => void changeState("CONFIRMED", { returnToQueue: true })}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isSubmitting ? t("modal.verifying") : t("modal.confirm")}
              </Button>
              <Button
                className="h-11 w-full rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground"
                onClick={() => setIsVerifySheetOpen(false)}
                type="button"
                variant="ghost"
              >
                {t("modal.close")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manual override */}
      <Sheet open={isManualOverrideOpen} onOpenChange={(isOpen) => !isOpen && setIsManualOverrideOpen(false)}>
        <SheetContent side={locale === "ar" ? "left" : "right"} className="border-border bg-card p-0 sm:max-w-lg">
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border p-6 md:p-8">
              <SheetTitle className="text-2xl font-bold leading-tight text-foreground">{t("overrideModal.title")}</SheetTitle>
              <SheetDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("overrideModal.description")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
              <div className="space-y-2">
                <label htmlFor="override-state" className="text-sm font-bold text-foreground">
                  {t("overrideModal.newStatus")}
                </label>
                <Select value={manualState} onValueChange={setManualState}>
                  <SelectTrigger id="override-state" className="h-12 rounded-xl border-border bg-background px-4 text-sm font-semibold">
                    <SelectValue placeholder={t("overrideModal.placeholder")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border bg-card">
                    {ALL_STATES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        disabled={s === state || !isAllowed(s) || !isReachable(s)}
                        className={cn("text-sm font-semibold", DESTRUCTIVE_STATES.includes(s) && "text-destructive focus:text-destructive")}
                      >
                        <span className="flex items-center gap-2">
                          <span className={cn("h-1.5 w-1.5 rounded-full", stateTone(s).dot)} aria-hidden />
                          {t(`states.${s}`)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-relaxed text-muted-foreground">{t("overrideModal.stockNote")}</p>
                {!canVerifyPayments && (
                  <p className="text-xs font-semibold leading-relaxed text-muted-foreground">{t("overrideModal.paymentLocked")}</p>
                )}
                {!isReachable("READY_FOR_SHIPPING") && (
                  <p className="text-xs font-semibold leading-relaxed text-muted-foreground">{tOrders("fulfilmentLocked")}</p>
                )}
              </div>

              {canVerifyPayments && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">{t("overrideModal.attach")}</p>
                  <ReceiptDrop
                    file={selectedFile}
                    previewUrl={previewUrl}
                    onFile={setSelectedFile}
                    label={t("modal.select")}
                    hint={t("modal.types")}
                    fileInfo={selectedFile ? t("modal.fileInfo", { name: selectedFile.name, size: Math.ceil(selectedFile.size / 1024) }) : null}
                    removeLabel={t("modal.remove")}
                    compact
                  />
                </div>
              )}

              {isOrderState(manualState) && DESTRUCTIVE_STATES.includes(manualState) && (
                <p className="flex items-start gap-2 rounded-xl bg-destructive/5 px-3 py-2.5 text-sm font-semibold text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("overrideModal.destructiveNote", { state: t(`states.${manualState}`) })}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border p-6 md:p-8">
              <Button
                className={cn(
                  "h-12 w-full rounded-xl text-sm font-bold",
                  isOrderState(manualState) && DESTRUCTIVE_STATES.includes(manualState)
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "bg-foreground text-background hover:bg-[#ffc105] hover:text-black",
                )}
                disabled={isSubmitting || !isOrderState(manualState)}
                onClick={() => isOrderState(manualState) && void changeState(manualState, { returnToQueue: false })}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                {isSubmitting ? t("overrideModal.updating") : t("overrideModal.confirm")}
              </Button>
              <Button
                className="h-11 w-full rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground"
                onClick={() => setIsManualOverrideOpen(false)}
                type="button"
                variant="ghost"
              >
                {t("modal.close")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

type ActivityEvent = OrderDetails["activity"][number];

function dedupeActivity(events: ActivityEvent[]) {
  return events.filter((event, index) => {
    const prev = events[index - 1];
    return !(
      prev &&
      prev.actionType === event.actionType &&
      prev.to === event.to &&
      prev.actorName === event.actorName &&
      event.timestamp - prev.timestamp < 60_000
    );
  });
}

type Translate = (key: string, values?: Record<string, string>) => string;

function activityLabel(event: ActivityEvent, t: Translate) {
  const stateLabel = (s: string | null) => (s && isOrderState(s) ? t(`states.${s}`) : s ?? "");
  switch (event.actionType) {
    case "ORDER_CREATED_PENDING":
    case "GUEST_ORDER_CREATED":
      return t("activity.created");
    case "WEBHOOK_RECEIPT_MATCHED":
      return t("activity.receiptMatched");
    case "WEBHOOK_RECEIPT_ATTACHED":
      return t("activity.receiptAttached");
    case "MANUAL_RECEIPT_ATTACHED":
      return t("activity.manualReceipt");
    case "WEBHOOK_MEDIA_DOWNLOAD_FAILED":
      return t("activity.receiptDownloadFailed");
    case "WHATSAPP_DISPATCH_FAILED":
      return t("activity.whatsappFailed");
    case "ORDER_STALLED_BY_CRON":
      return t("activity.stalledByCron");
    case "ORDER_LINE_ADDED":
      return t("activity.lineAdded");
    case "ORDER_PAYMENT_SUBMITTED":
      return t("activity.paymentSubmitted");
    case "ORDER_RTO_TRIGGERED":
      return t("activity.rto");
    case "ORDER_SHIPPING_FEE_DEDUPED":
      return t("activity.shippingDeduped");
    default:
      if (event.to) {
        return event.from
          ? t("activity.moved", { from: stateLabel(event.from), to: stateLabel(event.to) })
          : t("activity.movedTo", { to: stateLabel(event.to) });
      }
      return event.actionType.replace(/_/g, " ").toLowerCase();
  }
}

function Thumb({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package className="h-6 w-6 text-muted-foreground/60" />
        </div>
      )}
    </div>
  );
}

function ReceiptDrop({
  file,
  previewUrl,
  onFile,
  label,
  hint,
  fileInfo,
  removeLabel,
  compact,
}: {
  file: File | null;
  previewUrl: string | null;
  onFile: (file: File | null) => void;
  label: string;
  hint: string;
  fileInfo: string | null;
  removeLabel: string;
  compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  if (file && previewUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className={cn("w-full bg-muted object-contain", compact ? "max-h-48" : "max-h-80")} />
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="min-w-0 truncate text-xs font-semibold text-foreground">{fileInfo}</p>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-bold text-destructive outline-none hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-[#ffc105]"
          >
            {removeLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped?.type.startsWith("image/")) onFile(dropped);
      }}
      className={cn(
        "block cursor-pointer rounded-2xl border-2 border-dashed px-6 text-center transition-colors focus-within:ring-2 focus-within:ring-[#ffc105]",
        compact ? "py-8" : "py-12",
        dragging ? "border-[#ffc105] bg-[#ffc105]/10" : "border-border hover:border-foreground/30 hover:bg-accent/40",
      )}
    >
      <input
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        type="file"
      />
      <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />
      <span className="mt-3 block text-sm font-bold text-foreground">{label}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
    </label>
  );
}

function DetailsSkeleton({ label }: { label: string }) {
  return (
    <main aria-busy="true" aria-label={label} className="space-y-6 pb-10">
      <Skeleton className="h-8 w-40 rounded-xl" />
      <div className="space-y-6 rounded-[32px] border border-border bg-card p-5 md:p-8">
        <div className="flex justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Skeleton className="h-36 w-full rounded-[32px]" />
          <Skeleton className="h-48 w-full rounded-[32px]" />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <Skeleton className="h-80 w-full rounded-[32px]" />
        </div>
      </div>
    </main>
  );
}
