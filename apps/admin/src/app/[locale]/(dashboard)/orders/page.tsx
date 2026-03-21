"use client";

import { Link } from "@/navigation";
import { useQuery } from "convex/react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Button } from "@techworld/ui/button";
import { useTranslations, useLocale } from "next-intl";

export default function OrdersPage() {
  const t = useTranslations('Orders.queue');
  const locale = useLocale();
  const profile = useQuery(api.auth.getCurrentStaffProfile);
  const canViewOrders =
    profile?.permissions?.some((permission) => String(permission) === "VIEW_ORDERS") ?? false;
  const orders = useQuery(
    api.orders.listAwaitingVerificationOrders,
    profile && canViewOrders ? {} : "skip",
  );
  const visibleOrders = orders ?? [];

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">
          {t('badge')}
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          {t('description')}
        </p>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-white/5 bg-[#24201a]">
        <div className="border-b border-white/5 px-6 py-4">
          <h2 className="text-lg font-semibold text-white uppercase tracking-tight">{t('table.title')}</h2>
        </div>

        {profile === undefined || (canViewOrders && orders === undefined) ? (
          <div className="px-6 py-10 text-sm text-zinc-400">{t('table.loading')}</div>
        ) : !canViewOrders ? (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-400">
            <ShieldAlert size={18} className="text-[#ffc105]" />
            {t('table.noPermission')}
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-400">
            <ShieldAlert size={18} className="text-[#ffc105]" />
            {t('table.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="bg-[#2a261f] text-[11px] uppercase tracking-[0.25em] text-zinc-500 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
                <tr>
                  <th className="sticky left-0 bg-[#24201a] px-6 py-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">{t('table.columns.customer')}</th>
                  <th className="px-6 py-4">{t('table.columns.product')}</th>
                  <th className="px-6 py-4">{t('table.columns.quantity')}</th>
                  <th className="px-6 py-4">{t('table.columns.total')}</th>
                  <th className="px-6 py-4">{t('table.columns.receipt')}</th>
                  <th className="px-6 py-4 text-right">{t('table.columns.action')}</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order._id} className="border-t border-white/5">
                    <td className="sticky left-0 bg-[#24201a] px-6 py-4 max-lg:py-5 align-top z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      <div className="font-medium text-white">{order.customerName ?? t('table.walkInCustomer')}</div>
                      <div className="mt-1 text-xs text-zinc-500">{order.customerPhone ?? t('table.noPhone')}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-white">{order.product?.name_en ?? t('table.unknownProduct')}</div>
                      <div className="mt-1 text-xs text-zinc-500">{order.category?.name_en ?? t('table.noCategory')}</div>
                    </td>
                    <td className="px-6 py-4 align-top">{order.quantity.toLocaleString(locale)}</td>
                    <td className="px-6 py-4 align-top whitespace-nowrap">{order.total_price.toLocaleString(locale)} EGP</td>
                    <td className="px-6 py-4 align-top">
                      {order.receiptUrl ? (
                        <a className="text-[#ffc105] underline-offset-4 hover:underline" href={order.receiptUrl} rel="noreferrer" target="_blank">
                          {t('table.viewReceipt')}
                        </a>
                      ) : (
                        <span className="text-zinc-500">{t('table.pendingReceipt')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <Link href={`/orders/${order._id}`}>
                        <Button size="sm" type="button" variant="outline">
                          {t('table.review')}
                          <ArrowRight size={14} className={locale === 'ar' ? 'rotate-180 mr-2' : 'ml-2'} />
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
