"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/navigation";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
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
} from "@techworld/ui";
import { useTranslations, useLocale } from "next-intl";

export default function OrderDetailsPage() {
  const t = useTranslations("Orders.details");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id as Id<"orders">;
  const order = useQuery(api.orders.getOrderDetails, { orderId });
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const updateRto = useMutation(api.orders.updateRto);
  const generateReceiptUploadUrl = useMutation(
    api.files.generateReceiptUploadUrl,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRto = async () => {
    if (!confirm(t("messages.rtoConfirm"))) return;
    setIsSubmitting(true);
    try {
      await updateRto({ orderId });
      toast.success(t("messages.rtoSuccess"));
      router.push("/orders");
    } catch (error) {
      toast.error(t("messages.rtoFailed"), {
        description:
          error instanceof Error ? error.message : t("messages.unknown"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadLabel = useMemo(() => {
    if (!selectedFile) return t("modal.noFile");
    return t("modal.fileInfo", {
      name: selectedFile.name,
      size: Math.ceil(selectedFile.size / 1024),
    });
  }, [selectedFile, t]);

  if (order === undefined) {
    return <div className="text-sm text-zinc-400 p-8">{t("loading")}</div>;
  }

  if (!order) {
    return <div className="text-sm text-zinc-400 p-8">{t("notFound")}</div>;
  }

  const uploadReceipt = async () => {
    if (!selectedFile) {
      return undefined;
    }

    const uploadUrl = await generateReceiptUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": selectedFile.type,
      },
      body: selectedFile,
    });

    if (!response.ok) {
      throw new Error("Receipt upload failed.");
    }

    const payload = (await response.json()) as { storageId: Id<"_storage"> };
    return payload.storageId;
  };

  const handleStatusChange = async (
    newState: "CONFIRMED" | "CANCELLED" | "STALLED_PAYMENT",
  ) => {
    setIsSubmitting(true);
    try {
      const storageId = await uploadReceipt();
      await updateOrderStatus({
        orderId,
        newState,
        manualReceiptId: storageId,
      });
      toast.success(
        t("messages.statusUpdated", { state: t(`states.${newState}`) }),
      );
      setIsModalOpen(false);
      setSelectedFile(null);
      router.push("/orders");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("messages.updateFailed");
      if (
        message.includes("OUT_OF_STOCK") ||
        message.includes("out of stock")
      ) {
        toast.error(t("messages.outOfStock"), {
          description: t("messages.outOfStockDescription"),
        });
      } else {
        toast.error(t("messages.updateFailed"), {
          description: message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFinancialValue = (value: number | string | null) => {
    if (typeof value === "number") {
      return `${value.toLocaleString(locale)} EGP`;
    }
    if (value === null) {
      return "N/A";
    }
    return value;
  };

  return (
    <main className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <Link
          className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 transition-all hover:text-[#ffc105]"
          href="/orders"
        >
          <div className="h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center group-hover:border-[#ffc105]/50 group-hover:bg-[#ffc105]/10 transition-all">
            <ArrowLeft
              size={14}
              className={cn(
                "transition-transform group-hover:-translate-x-1",
                locale === "ar" ? "rotate-180 group-hover:translate-x-1" : "",
              )}
            />
          </div>
          {t("back")}
        </Link>

        {order.state === "AWAITING_VERIFICATION" && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-10 px-6 border-border font-black uppercase tracking-widest text-[10px] hover:bg-destructive hover:text-white hover:border-destructive transition-all"
              disabled={isSubmitting}
              onClick={() => void handleStatusChange("CANCELLED")}
            >
              <XCircle size={14} className="ltr:mr-2 rtl:ml-2" />
              {t("actions.cancel")}
            </Button>
            <Button
              className="rounded-xl h-10 px-8 bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all shadow-lg font-black uppercase tracking-widest text-[10px]"
              onClick={() => setIsModalOpen(true)}
            >
              <CheckCircle2 size={14} className="ltr:mr-2 rtl:ml-2" />
              {t("actions.verifyNow", { defaultValue: "Verify Order" })}
            </Button>
          </div>
        )}
      </div>

      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12  ">
        {/* Decorative background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="text-[#ffc105]" size={20} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                {t("badge")}
              </p>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight italic">
              {order.customerName ?? t("queue.table.walkInCustomer")}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-accent/50 border border-border px-4 py-2 rounded-full">
                <MapPin size={12} className="text-[#ffc105]" />
                {order.customerAddress ?? t("notProvided")}
              </span>
              <span
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  order.state === "CONFIRMED" || order.state === "SHIPPED"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : order.state === "CANCELLED"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : "bg-[#ffc105]/10 border-[#ffc105]/20 text-[#ffc105]",
                )}
              >
                {t(`states.${order.state as keyof typeof t}`)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
              {t("cards.revenue")}
            </p>
            <p className="text-4xl font-black text-foreground tabular-nums tracking-tighter italic">
              {order.financials.total_revenue.toLocaleString(locale)}{" "}
              <span className="text-sm uppercase tracking-widest text-[#ffc105]">
                EGP
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 grid-cols-1 xl:grid-cols-12 items-start">
        <div className="xl:col-span-8 space-y-8">
          <section className="rounded-[40px] border border-border bg-card overflow-hidden   group transition-all hover:border-[#ffc105]/10">
            <div className="border-b border-border bg-accent/30 px-10 py-8">
              <div className="flex items-center gap-4">
                <div className="h-6 w-1 bg-[#ffc105] rounded-full" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                    {t("queue.table.columns.product")}
                  </p>
                  <h2 className="text-2xl font-black text-foreground uppercase tracking-tightest italic mt-1">
                    {order.product?.name_en ?? t("queue.table.unknownProduct")}
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-10">
              <div className="grid gap-8 sm:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                    {t("cards.category")}
                  </p>
                  <p className="text-sm font-black text-foreground uppercase tracking-tightest italic">
                    {order.category?.name_en ?? t("unknown")}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                    {t("cards.quantity")}
                  </p>
                  <p className="text-sm font-black text-foreground uppercase tracking-tightest italic">
                    {order.quantity.toLocaleString(locale)} units
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                    {t("cards.realStock")}
                  </p>
                  <p className="text-sm font-black text-[#ffc105] uppercase tracking-tightest italic">
                    {order.sku?.real_stock?.toLocaleString(locale) ??
                      t("unknown")}{" "}
                    left
                  </p>
                </div>
              </div>

              <div className="mt-10 pt-10 border-t border-border/50">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-1 bg-[#ffc105] rounded-full" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                        {t("financials.badge")}
                      </p>
                      <h2 className="text-xl font-black text-foreground uppercase tracking-tightest italic mt-1">
                        {t("financials.title")}
                      </h2>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest",
                      order.canViewFinancials
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-500",
                    )}
                  >
                    {order.canViewFinancials
                      ? t("financials.visible")
                      : t("financials.masked")}
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-3">
                  <InfoCard
                    label={t("cards.unitCogs")}
                    value={formatFinancialValue(order.financials.unit_cogs)}
                  />
                  <InfoCard
                    label={t("cards.totalCogs")}
                    value={formatFinancialValue(order.financials.total_cogs)}
                  />
                  <InfoCard
                    label={t("cards.netMargin")}
                    value={formatFinancialValue(order.financials.net_margin)}
                    positive={order.financials.net_margin > 0}
                  />
                </div>

                {!order.canViewFinancials && (
                  <div className="mt-8 rounded-[24px] border border-amber-500/10 bg-amber-500/5 p-6 flex items-start gap-4">
                    <AlertTriangle
                      className="text-amber-500 shrink-0"
                      size={18}
                    />
                    <p className="text-xs font-semibold leading-relaxed text-amber-500/70 italic">
                      {t("financials.redacted")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="xl:col-span-4 space-y-8">
          <section className="rounded-[40px] border border-border bg-card p-10   relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-[#ffc105]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-3">
                <FileText className="text-[#ffc105]" size={20} />
                <h3 className="text-xl font-black text-foreground uppercase tracking-tightest italic">
                  {t("receipt.badge")}
                </h3>
              </div>

              {order.receiptUrl ? (
                <div className="space-y-6">
                  <div className="aspect-[4/5] rounded-[24px] border border-border bg-accent/20 overflow-hidden relative group/img">
                    <img
                      src={order.receiptUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <a
                        className="rounded-full bg-white text-black p-4   transform scale-75 group-hover/img:scale-100 transition-transform"
                        href={order.receiptUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink size={20} />
                      </a>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] border-border/50 hover:bg-foreground hover:text-background transition-all"
                  >
                    <a href={order.receiptUrl} rel="noreferrer" target="_blank">
                      <ExternalLink size={14} className="ltr:mr-2 rtl:ml-2" />
                      {t("receipt.open")}
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-border/50 bg-accent/10 p-12 text-center">
                  <AlertCircle
                    className="mx-auto text-muted-foreground/20 mb-4"
                    size={32}
                  />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 italic">
                    {t("receipt.missing")}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[40px] border border-border bg-card p-10   relative overflow-hidden">
            <div className="space-y-4">
              <InfoCard
                label={t("cards.phone")}
                value={order.customerPhone ?? t("notProvided")}
              />

              {order.state === "SHIPPED" && (
                <Button
                  className="w-full rounded-2xl h-14 border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all font-black uppercase tracking-[0.2em] text-[10px]"
                  disabled={isSubmitting}
                  onClick={handleRto}
                  variant="outline"
                >
                  <AlertTriangle size={16} className="ltr:mr-2 rtl:ml-2" />
                  {t("actions.rto")}
                </Button>
              )}

              {order.state === "AWAITING_VERIFICATION" && (
                <Button
                  className="w-full rounded-2xl h-14 border-amber-500/20 bg-amber-500/5 text-amber-500 hover:bg-amber-500 hover:text-white transition-all font-black uppercase tracking-[0.2em] text-[10px]"
                  disabled={isSubmitting}
                  onClick={() => void handleStatusChange("STALLED_PAYMENT")}
                  variant="outline"
                >
                  <AlertTriangle size={16} className="ltr:mr-2 rtl:ml-2" />
                  {t("actions.markStalled")}
                </Button>
              )}

              {["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED"].includes(
                order.state,
              ) && (
                <div className="rounded-2xl bg-accent/30 p-4 border border-border/50">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 leading-relaxed italic text-center">
                    {t("actions.logisticsNote")}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <Sheet
        open={isModalOpen}
        onOpenChange={(isOpen) => !isOpen && setIsModalOpen(false)}
      >
        <SheetContent
          side="right"
          className="sm:max-w-xl p-0 border-l border-border bg-card"
        >
          <div className="h-full flex flex-col">
            <SheetHeader className="p-10 border-b border-border bg-accent/20">
              <div className="flex items-center gap-3 mb-4">
                <UploadCloud className="text-[#ffc105]" size={20} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                  Verification required
                </p>
              </div>
              <SheetTitle className="text-3xl font-black uppercase tracking-tightest text-foreground leading-tight italic">
                {t("modal.title")}
              </SheetTitle>
              <SheetDescription className="mt-4 text-sm font-medium leading-relaxed text-muted-foreground/60">
                {t("modal.description")}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 p-10 space-y-8 overflow-y-auto">
              <div className="group/drop">
                <label className="block rounded-[40px] border-2 border-dashed border-border/50 bg-accent/20 px-8 py-16 text-center transition-all cursor-pointer hover:border-[#ffc105]/50 hover:bg-[#ffc105]/5">
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      setSelectedFile(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                  <div className="h-16 w-16 rounded-full bg-background border border-border flex items-center justify-center mx-auto mb-6 group-hover/drop:scale-110 transition-transform">
                    <ImageIcon className="text-muted-foreground/40" size={24} />
                  </div>
                  <span className="block text-sm font-black uppercase tracking-widest text-foreground mb-2">
                    {t("modal.select")}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">
                    {t("modal.types")}
                  </span>

                  {selectedFile && (
                    <div className="mt-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 animate-in zoom-in-95 duration-300">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/50 mt-1">
                        {Math.ceil(selectedFile.size / 1024)} KB
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div className="rounded-[32px] border border-border bg-accent/30 p-8 flex items-start gap-4">
                <div className="h-10 w-10 min-w-10 rounded-2xl bg-foreground/5 flex items-center justify-center text-foreground/40">
                  <ShieldCheck size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
                    Identity & Audit
                  </h4>
                  <p className="text-[10px] font-bold leading-relaxed text-muted-foreground/40 italic">
                    Verifying an order will mark it as confirmed and deduct
                    stock from the inventory. This action is logged in the
                    system audit trail.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 border-t border-border bg-accent/20 gap-4 flex flex-col">
              <Button
                className="w-full rounded-2xl h-14 bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[10px]"
                disabled={isSubmitting || !selectedFile}
                onClick={() => void handleStatusChange("CONFIRMED")}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                    Verifying...
                  </div>
                ) : (
                  <>
                    <CheckCircle2
                      size={16}
                      className="ltr:mr-3 rtl:ml-3 h-4 w-4"
                    />
                    {t("modal.confirm")}
                  </>
                )}
              </Button>
              <Button
                className="w-full rounded-2xl h-12 text-muted-foreground/40 hover:text-foreground font-black uppercase tracking-widest text-[10px] transition-all"
                onClick={() => setIsModalOpen(false)}
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

function InfoCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-accent/30 p-6 transition-all hover:border-[#ffc105]/20 group/card relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffc105]/5 rounded-full blur-xl -mr-8 -mt-8 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity" />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 relative z-10">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-lg font-black tracking-tightest uppercase italic relative z-10 tabular-nums",
          positive === true
            ? "text-emerald-500"
            : positive === false
              ? "text-destructive"
              : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

import {
  ShoppingCart,
  MapPin,
  FileText,
  ExternalLink,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
