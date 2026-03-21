"use client";

import { Link } from "@/navigation";
import { useQuery } from "convex/react";
import { ArrowRight, ShieldAlert, ShoppingCart } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Button } from "@techworld/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@techworld/ui";

export default function OrdersPage() {
  const t = useTranslations("Orders.queue");
  const locale = useLocale();
  const profile = useQuery(api.auth.getCurrentStaffProfile);
  const canViewOrders =
    profile?.permissions?.some(
      (permission) => String(permission) === "VIEW_ORDERS",
    ) ?? false;
  const orders = useQuery(
    api.orders.listAwaitingVerificationOrders,
    profile && canViewOrders ? {} : "skip",
  );
  const visibleOrders = orders ?? [];

  return (
    <main className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12  ">
        {/* Decorative background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="text-[#ffc105]" size={20} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
              {t("badge")}
            </p>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight italic">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/60">
            {t("description")}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-xl group transition-all hover:border-[#ffc105]/10">
        <div className="border-b border-border bg-accent/30 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-1 bg-[#ffc105] rounded-full" />
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest italic">
              {t("table.title")}
            </h2>
          </div>
          <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
            Live Buffer • {visibleOrders.length} Records
          </div>
        </div>

        {profile === undefined || (canViewOrders && orders === undefined) ? (
          <div className="p-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffc105] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              {t("table.loading")}
            </p>
          </div>
        ) : !canViewOrders ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert size={32} className="text-destructive" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-destructive/60">
              {t("table.noPermission")}
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#ffc105]/10 flex items-center justify-center">
              <ShieldAlert size={32} className="text-[#ffc105]" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-[#ffc105]/60">
              {t("table.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 border-b border-border">
                <tr>
                  <th className="sticky left-0 bg-card py-6 px-8 z-10">
                    {t("table.columns.customer")}
                  </th>
                  <th className="py-6 px-6 whitespace-nowrap">
                    {t("table.columns.product")}
                  </th>
                  <th className="py-6 px-6 whitespace-nowrap text-center">
                    {t("table.columns.quantity")}
                  </th>
                  <th className="py-6 px-6 whitespace-nowrap">
                    {t("table.columns.total")}
                  </th>
                  <th className="py-6 px-6 whitespace-nowrap">
                    {t("table.columns.receipt")}
                  </th>
                  <th className="py-6 px-8 text-right whitespace-nowrap">
                    {t("table.columns.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {visibleOrders.map((order, idx) => (
                  <tr
                    key={order._id}
                    className="group/row hover:bg-accent/20 transition-all"
                  >
                    <td className="sticky left-0 bg-card py-8 px-8 align-middle z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                      <div className="font-black text-foreground uppercase tracking-tightest leading-none">
                        {order.customerName ?? t("table.walkInCustomer")}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-muted-foreground/40 font-mono tracking-wider">
                        {order.customerPhone ?? t("table.noPhone")}
                      </div>
                    </td>
                    <td className="py-8 px-6 align-middle">
                      <div className="font-bold text-foreground text-xs uppercase tracking-tightest">
                        {order.product?.name_en ?? t("table.unknownProduct")}
                      </div>
                      <div className="mt-1.5 text-[10px] font-black text-[#ffc105] uppercase tracking-widest italic">
                        {order.category?.name_en ?? t("table.noCategory")}
                      </div>
                    </td>
                    <td className="py-8 px-6 align-middle text-center font-mono font-black text-sm text-muted-foreground">
                      {order.quantity.toLocaleString(locale)}
                    </td>
                    <td className="py-8 px-6 align-middle whitespace-nowrap">
                      <span className="font-black text-sm tracking-tightest text-foreground">
                        {order.total_price.toLocaleString(locale)}
                      </span>
                      <span className="ml-1 text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">
                        EGP
                      </span>
                    </td>
                    <td className="py-8 px-6 align-middle">
                      {order.receiptUrl ? (
                        <a
                          className="inline-flex items-center gap-2 rounded-full border border-[#ffc105]/20 bg-[#ffc105]/5 px-3 py-1.5 text-[9px] font-black text-[#ffc105] uppercase tracking-widest hover:bg-[#ffc105] hover:text-black transition-all shadow-sm"
                          href={order.receiptUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <ImageIcon size={10} /> {t("table.viewReceipt")}
                        </a>
                      ) : (
                        <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest italic">
                          {t("table.pendingReceipt")}
                        </span>
                      )}
                    </td>
                    <td className="py-8 px-8 align-middle text-right">
                      <Link href={`/orders/${order._id}`}>
                        <Button
                          size="sm"
                          type="button"
                          className="rounded-xl h-10 px-5 text-[10px] font-black uppercase tracking-widest bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all   group/btn"
                        >
                          {t("table.review")}
                          <ArrowRight
                            size={14}
                            className={cn(
                              "transition-transform group-hover/btn:translate-x-1",
                              locale === "ar" ? "rotate-180 mr-2" : "ml-2",
                            )}
                          />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function ImageIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
