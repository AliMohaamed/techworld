"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, UploadCloud, XCircle } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import { Button } from "@techworld/ui/button";

export default function OrderDetailsPage() {
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
    if (!confirm("Are you sure you want to mark this order as Return to Origin? This will automatically restock the SKU.")) return;
    setIsSubmitting(true);
    try {
      await updateRto({ orderId });
      toast.success("Order marked as RTO. Inventory restocked.");
      router.push("/orders");
    } catch (error) {
      toast.error("RTO failed", { description: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadLabel = useMemo(() => {
    if (!selectedFile) return "No fallback receipt selected";
    return `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)`;
  }, [selectedFile]);

  if (order === undefined) {
    return <div className="text-sm text-zinc-400">Loading order details...</div>;
  }

  if (!order) {
    return <div className="text-sm text-zinc-400">Order not found.</div>;
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
      toast.success(`Order moved to ${newState}.`);
      setIsModalOpen(false);
      setSelectedFile(null);
      router.push("/orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order update failed.";
      if (message.includes("OUT_OF_STOCK") || message.includes("out of stock")) {
        toast.error("Out of stock", {
          description: "Another agent depleted the remaining stock before confirmation. The order was not confirmed.",
        });
      } else {
        toast.error("Order update failed", {
          description: message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white" href="/orders">
        <ArrowLeft size={16} />
        Back to queue
      </Link>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6 rounded-[28px] border border-white/5 bg-[#24201a] p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Order Review</p>
            <h1 className="mt-3 text-3xl font-semibold uppercase tracking-tight text-white">
              {order.customerName ?? "Walk-in customer"}
            </h1>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Review the uploaded proof, optionally attach a manual fallback receipt, and transition the order when stock is still available.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard label="Phone" value={order.customerPhone ?? "Not provided"} />
            <InfoCard label="Address" value={order.customerAddress ?? "Not provided"} />
            <InfoCard label="Order State" value={order.state} />
            <InfoCard label="Total Revenue" value={formatFinancialValue(order.financials.total_revenue)} />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#2a261f] p-6 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Product</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{order.product?.name_en ?? "Unknown product"}</h2>
            <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
              <span>Category: {order.category?.name_en ?? "Unknown"}</span>
              <span>Quantity: {order.quantity}</span>
              <span>Real stock: {order.sku?.real_stock ?? "Unknown"}</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#2a261f] p-6 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Financial Visibility</p>
                <h2 className="mt-3 text-xl font-semibold text-white">Profitability Snapshot</h2>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  order.canViewFinancials
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                }`}
              >
                {order.canViewFinancials ? "Visible" : "Masked"}
              </span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoCard label="Unit COGS" value={formatFinancialValue(order.financials.unit_cogs)} />
              <InfoCard label="Total COGS" value={formatFinancialValue(order.financials.total_cogs)} />
              <InfoCard label="Net Margin" value={formatFinancialValue(order.financials.net_margin)} />
            </div>
            {!order.canViewFinancials ? (
              <p className="mt-4 text-sm text-zinc-500">
                This staff account can process the order, but financial metrics are redacted server-side.
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 rounded-[28px] border border-white/5 bg-[#24201a] p-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Receipt Proof</p>
            {order.receiptUrl ? (
              <a className="mt-3 inline-flex text-sm text-[#ffc105] underline-offset-4 hover:underline" href={order.receiptUrl} rel="noreferrer" target="_blank">
                Open current receipt
              </a>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No receipt is attached yet. Use the manual fallback flow.</p>
            )}
          </div>

          <div className="space-y-3">
            {order.state === "AWAITING_VERIFICATION" && (
              <>
                <Button className="w-full" onClick={() => setIsModalOpen(true)} type="button">
                  <UploadCloud size={16} />
                  Manual Fallback
                </Button>
                <Button className="w-full" disabled={isSubmitting} onClick={() => void handleStatusChange("CANCELLED")} type="button" variant="ghost">
                  <XCircle size={16} />
                  Cancel Order
                </Button>
                <Button className="w-full" disabled={isSubmitting} onClick={() => void handleStatusChange("STALLED_PAYMENT")} type="button" variant="outline">
                  <AlertTriangle size={16} />
                  Mark Stalled
                </Button>
              </>
            )}

            {order.state === "SHIPPED" && (
              <Button className="w-full border-red-500/50 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" disabled={isSubmitting} onClick={handleRto} type="button" variant="outline">
                <AlertTriangle size={16} />
                Return to Origin (RTO)
              </Button>
            )}

            {["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED"].includes(order.state) && (
              <p className="mt-4 text-center text-xs text-zinc-500 italic">
                Shipping and logistical transitions beyond verification take place here. 
                Full FSM extension for Courier tracking pending.
              </p>
            )}
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 px-6 py-10">
          <div className="mx-auto max-w-xl rounded-[28px] border border-white/5 bg-[#24201a] p-8 shadow-2xl shadow-black/40">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Manual Fallback</p>
              <h2 className="text-2xl font-semibold uppercase tracking-tight text-white">Upload receipt and confirm</h2>
              <p className="text-sm leading-7 text-zinc-400">
                Attach a manual WhatsApp receipt if the customer proof needs to be uploaded directly from the admin workstation.
              </p>
            </div>

            <label className="mt-6 block rounded-[24px] border border-dashed border-white/10 bg-[#2a261f] px-5 py-8 text-center text-sm text-zinc-400 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span className="block font-medium text-white">Select receipt image</span>
              <span className="mt-2 block text-xs text-zinc-500">PNG, JPG, or WEBP</span>
              <span className="mt-4 block text-xs text-[#ffc105]">{uploadLabel}</span>
            </label>

            <div className="mt-6 flex gap-3">
              <Button className="flex-1" onClick={() => setIsModalOpen(false)} type="button" variant="ghost">
                Close
              </Button>
              <Button className="flex-1" disabled={isSubmitting} onClick={() => void handleStatusChange("CONFIRMED")} type="button">
                <CheckCircle2 size={16} />
                Confirm Order
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#2a261f] p-5 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
      <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-white">{value}</p>
    </div>
  );
}

function formatFinancialValue(value: number | string | null) {
  if (typeof value === "number") {
    return `${value.toLocaleString()} EGP`;
  }

  if (value === null) {
    return "N/A";
  }

  return value;
}

