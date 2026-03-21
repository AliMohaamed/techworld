"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/navigation";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, UploadCloud, XCircle } from "lucide-react";
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
  const t = useTranslations('Orders.details');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id as Id<"orders">;
  const order = useQuery(api.orders.getOrderDetails, { orderId });
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const updateRto = useMutation(api.orders.updateRto);
  const generateReceiptUploadUrl = useMutation(api.files.generateReceiptUploadUrl);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRto = async () => {
    if (!confirm(t('messages.rtoConfirm'))) return;
    setIsSubmitting(true);
    try {
      await updateRto({ orderId });
      toast.success(t('messages.rtoSuccess'));
      router.push("/orders");
    } catch (error) {
      toast.error(t('messages.rtoFailed'), { description: error instanceof Error ? error.message : t('messages.unknown') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadLabel = useMemo(() => {
    if (!selectedFile) return t('modal.noFile');
    return t('modal.fileInfo', { name: selectedFile.name, size: Math.ceil(selectedFile.size / 1024) });
  }, [selectedFile, t]);

  if (order === undefined) {
    return <div className="text-sm text-zinc-400 p-8">{t('loading')}</div>;
  }

  if (!order) {
    return <div className="text-sm text-zinc-400 p-8">{t('notFound')}</div>;
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

  const handleStatusChange = async (newState: "CONFIRMED" | "CANCELLED" | "STALLED_PAYMENT") => {
    setIsSubmitting(true);
    try {
      const storageId = await uploadReceipt();
      await updateOrderStatus({
        orderId,
        newState,
        manualReceiptId: storageId,
      });
      toast.success(t('messages.statusUpdated', { state: t(`states.${newState}`) }));
      setIsModalOpen(false);
      setSelectedFile(null);
      router.push("/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.updateFailed');
      if (message.includes("OUT_OF_STOCK") || message.includes("out of stock")) {
        toast.error(t('messages.outOfStock'), {
          description: t('messages.outOfStockDescription'),
        });
      } else {
        toast.error(t('messages.updateFailed'), {
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
    <main className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white" href="/orders">
        <ArrowLeft size={16} className={locale === 'ar' ? 'rotate-180' : ''} />
        {t('back')}
      </Link>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6 rounded-[28px] border border-white/5 bg-[#24201a] p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">{t('badge')}</p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-white leading-tight">
              {order.customerName ?? t('queue.table.walkInCustomer')}
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {t('description')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard label={t('cards.phone')} value={order.customerPhone ?? t('notProvided')} />
            <InfoCard label={t('cards.address')} value={order.customerAddress ?? t('notProvided')} />
            <InfoCard label={t('cards.state')} value={t(`states.${order.state as keyof typeof t}`)} />
            <InfoCard label={t('cards.revenue')} value={formatFinancialValue(order.financials.total_revenue)} />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#2a261f] p-6 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('queue.table.columns.product')}</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{order.product?.name_en ?? t('queue.table.unknownProduct')}</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-3 italic">
              <span>{t('cards.category')}: {order.category?.name_en ?? t('unknown')}</span>
              <span>{t('cards.quantity')}: {order.quantity.toLocaleString(locale)}</span>
              <span>{t('cards.realStock')}: {order.sku?.real_stock?.toLocaleString(locale) ?? t('unknown')}</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#2a261f] p-6 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('financials.badge')}</p>
                <h2 className="mt-3 text-xl font-semibold text-white uppercase tracking-tight">{t('financials.title')}</h2>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-tight ${
                  order.canViewFinancials
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                }`}
              >
                {order.canViewFinancials ? t('financials.visible') : t('financials.masked')}
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoCard label={t('cards.unitCogs')} value={formatFinancialValue(order.financials.unit_cogs)} />
              <InfoCard label={t('cards.totalCogs')} value={formatFinancialValue(order.financials.total_cogs)} />
              <InfoCard label={t('cards.netMargin')} value={formatFinancialValue(order.financials.net_margin)} />
            </div>
            {!order.canViewFinancials ? (
              <p className="mt-4 text-sm text-zinc-500 italic">
                {t('financials.redacted')}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 rounded-[28px] border border-white/5 bg-[#24201a] p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('receipt.badge')}</p>
            {order.receiptUrl ? (
              <a className="mt-3 inline-flex text-sm text-[#ffc105] underline-offset-4 hover:underline" href={order.receiptUrl} rel="noreferrer" target="_blank">
                {t('receipt.open')}
              </a>
            ) : (
              <p className="mt-3 text-sm text-zinc-500 italic">{t('receipt.missing')}</p>
            )}
          </div>

          <div className="space-y-3">
            {order.state === "AWAITING_VERIFICATION" && (
              <>
                <Button className="w-full" onClick={() => setIsModalOpen(true)} type="button">
                  <UploadCloud size={16} className={locale === 'ar' ? 'ml-2' : 'mr-2'} />
                  {t('actions.manualFallback')}
                </Button>
                <Button className="w-full" disabled={isSubmitting} onClick={() => void handleStatusChange("CANCELLED")} type="button" variant="ghost">
                  <XCircle size={16} className={locale === 'ar' ? 'ml-2' : 'mr-2'} />
                  {t('actions.cancel')}
                </Button>
                <Button className="w-full" disabled={isSubmitting} onClick={() => void handleStatusChange("STALLED_PAYMENT")} type="button" variant="outline">
                  <AlertTriangle size={16} className={locale === 'ar' ? 'ml-2' : 'mr-2'} />
                  {t('actions.markStalled')}
                </Button>
              </>
            )}

            {order.state === "SHIPPED" && (
              <Button className="w-full border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" disabled={isSubmitting} onClick={handleRto} type="button" variant="outline">
                <AlertTriangle size={16} className={locale === 'ar' ? 'ml-2' : 'mr-2'} />
                {t('actions.rto')}
              </Button>
            )}

            {["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED"].includes(order.state) && (
              <p className="mt-4 text-center text-xs text-zinc-500 italic leading-relaxed">
                {t('actions.logisticsNote')}
              </p>
            )}
          </div>
        </div>
      </section>

      <Sheet open={isModalOpen} onOpenChange={(isOpen) => !isOpen && setIsModalOpen(false)}>
        <SheetContent side="right" className="sm:max-w-xl overflow-y-auto p-0 border-l border-white/10 dark:bg-[#0a0a0a]">
          <SheetHeader className="p-8 pb-0">
            <SheetTitle className="text-2xl font-semibold uppercase tracking-tight text-white leading-tight">
              {t('modal.title')}
            </SheetTitle>
            <SheetDescription className="mt-3 text-sm leading-7 text-zinc-400">
              {t('modal.description')}
            </SheetDescription>
          </SheetHeader>

          <div className="p-8 space-y-6">
            <label className="block rounded-[24px] border border-dashed border-white/10 bg-[#2a261f] px-5 py-8 text-center text-sm text-zinc-400 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50 cursor-pointer">
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span className="block font-medium text-white">{t('modal.select')}</span>
              <span className="mt-2 block text-xs text-zinc-500">{t('modal.types')}</span>
              <span className="mt-4 block text-xs text-[#ffc105] font-mono">{uploadLabel}</span>
            </label>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => setIsModalOpen(false)} type="button" variant="ghost">
                {t('modal.close')}
              </Button>
              <Button className="flex-1" disabled={isSubmitting} onClick={() => void handleStatusChange("CONFIRMED")} type="button">
                <CheckCircle2 size={16} className={locale === 'ar' ? 'ml-2' : 'mr-2'} />
                {t('modal.confirm')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#2a261f] p-5 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
      <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{label}</p>
      <p className="mt-3 text-sm font-medium leading-6 text-white">{value}</p>
    </div>
  );
}
