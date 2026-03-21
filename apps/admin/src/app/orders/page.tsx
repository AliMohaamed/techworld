"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Button } from "@techworld/ui/button";

export default function OrdersPage() {
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
      <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#0b0b0b] px-8 py-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">
          User Story 1
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
          Awaiting Verification Queue
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Operations agents can inspect pending payment submissions, open a record, upload a manual fallback receipt, and confirm the order without leaving the admin workspace.
        </p>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0b0b]">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Pending Orders</h2>
        </div>

        {profile === undefined || (canViewOrders && orders === undefined) ? (
          <div className="px-6 py-10 text-sm text-zinc-400">Loading order queue...</div>
        ) : !canViewOrders ? (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-400">
            <ShieldAlert size={18} className="text-[#ffc105]" />
            Your staff account does not have permission to view orders.
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-400">
            <ShieldAlert size={18} className="text-[#ffc105]" />
            No orders are currently waiting for verification.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="bg-black/30 text-[11px] uppercase tracking-[0.25em] text-zinc-500">
                <tr>
                  <th className="sticky left-0 bg-[#0b0b0b] px-6 py-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Customer</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Receipt</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <tr key={order._id} className="border-t border-white/5">
                    <td className="sticky left-0 bg-[#0b0b0b] px-6 py-4 max-lg:py-5 align-top z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      <div className="font-medium text-white">{order.customerName ?? "Walk-in customer"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{order.customerPhone ?? "No phone"}</div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-white">{order.product?.name_en ?? "Unknown product"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{order.category?.name_en ?? "No category"}</div>
                    </td>
                    <td className="px-6 py-4 align-top">{order.quantity}</td>
                    <td className="px-6 py-4 align-top">{order.total_price.toLocaleString()} EGP</td>
                    <td className="px-6 py-4 align-top">
                      {order.receiptUrl ? (
                        <a className="text-[#ffc105] underline-offset-4 hover:underline" href={order.receiptUrl} rel="noreferrer" target="_blank">
                          View receipt
                        </a>
                      ) : (
                        <span className="text-zinc-500">Pending manual upload</span>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <Link href={`/orders/${order._id}`}>
                        <Button size="sm" type="button" variant="outline">
                          Review
                          <ArrowRight size={14} />
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

