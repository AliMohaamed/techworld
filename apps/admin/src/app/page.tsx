"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useState } from "react";
import { SalesVelocityChart } from "@/components/charts/SalesVelocityChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { TrendingUp, ShoppingCart, DollarSign, Truck, AlertCircle } from "lucide-react";

export default function AdminDashboardPage() {
  const [timeWindow, setTimeWindow] = useState<"today" | "last7days" | "last30days">("last7days");
  const metrics = useQuery(api.analytics.dashboardMetrics, { timeWindow });

  const loading = metrics === undefined;

  return (
    <main className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header with Time Window Selector */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[32px] border border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.08),transparent_40%),#24201a] px-8 py-10 shadow-xl">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-[#ffc105]">Executive Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
            Performance Overview
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 font-light">
            Real-time bounded intelligence across your order stream. Monitoring sales velocity, system profitability, and operational success.
          </p>
        </div>
        
        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/5 bg-black/20 p-1.5 backdrop-blur">
          {(["today", "last7days", "last30days"] as const).map((window) => (
            <button
              key={window}
              onClick={() => setTimeWindow(window)}
              className={`rounded-xl px-4 py-2 text-[10px] uppercase tracking-[0.1em] transition-all duration-300 font-semibold ${
                timeWindow === window 
                  ? "bg-[#ffc105] text-black shadow-lg shadow-[#ffc105]/20 scale-[1.02]" 
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {window.replace("last", "Last ")}
            </button>
          ))}
        </div>
      </section>

      {/* Summary KPI Cards */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          label="Total Orders" 
          value={metrics?.totalOrders} 
          icon={<ShoppingCart size={20} />} 
          loading={loading}
        />
        <KpiCard 
          label="Net Profit" 
          value={metrics?.netProfit !== null ? `EGP ${metrics?.netProfit?.toLocaleString()}` : "***"} 
          icon={<DollarSign size={20} />} 
          mask={metrics?.netProfit === null}
          loading={loading}
          accent
        />
        <KpiCard 
          label="Courier Fees" 
          value={`EGP ${metrics?.courierFees?.toLocaleString()}`} 
          icon={<Truck size={20} />} 
          loading={loading}
        />
        <KpiCard 
          label="RTO Rate" 
          value={`${metrics?.rtoRate?.toFixed(1)}%`} 
          icon={<AlertCircle size={20} />} 
          loading={loading}
          warning={metrics?.rtoRate && metrics.rtoRate > 20}
        />
      </section>

      {/* Charts Row */}
      <section className="grid gap-8 grid-cols-1 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-[28px] border border-white/5 bg-[#24201a] p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Sales Velocity</h2>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <TrendingUp size={14} className="text-[#ffc105]" />
              Order Count
            </div>
          </div>
          <SalesVelocityChart data={metrics?.velocityData || []} />
        </div>

        <div className="rounded-[28px] border border-white/5 bg-[#24201a] p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white tracking-tight">Status Breakdown</h2>
          </div>
          <StatusBreakdownChart data={metrics?.statusBreakdown || []} />
        </div>
      </section>
      
      {/* Financial Deep Dive (Optional visibility) */}
      {metrics?.metadata?.isFinancialsVisible && (
        <section className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/5 bg-[#2a261f] p-8 border-l-4 border-l-[#ffc105]">
            <h3 className="text-[11px] uppercase tracking-[0.3em] text-[#ffc105] font-semibold">System Health Snapshot</h3>
            <div className="mt-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div>
                <p className="text-sm text-zinc-500">Gross System Revenue</p>
                <h4 className="mt-2 text-3xl font-bold text-white tracking-tight">EGP {metrics.totalRevenue?.toLocaleString()}</h4>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-zinc-500">Accumulated COGS</p>
                <h4 className="mt-2 text-3xl font-bold text-white tracking-tight">EGP {metrics.totalCogs?.toLocaleString()}</h4>
              </div>
            </div>
          </div>
          
          <div className="rounded-[24px] border border-white/5 bg-[#1a1814]/40 p-10 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <p className="text-[10px] text-zinc-500 text-center uppercase tracking-[0.3em] leading-loose max-w-[280px]">
               Compliance verified. Financial boundaries enforced by View Financials permission filter.
             </p>
          </div>
        </section>
      )}
    </main>
  );
}

function KpiCard({ 
  label, 
  value, 
  icon, 
  loading, 
  mask, 
  accent, 
  warning 
}: { 
  label: string; 
  value: any; 
  icon: React.ReactNode; 
  loading: boolean;
  mask?: boolean;
  accent?: boolean;
  warning?: any;
}) {
  return (
    <div className={`group rounded-[24px] border border-white/5 p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.02] ${
      accent ? "shadow-lg shadow-[#ffc105]/5" : ""
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">{label}</span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] transition-colors group-hover:bg-white/5 text-zinc-500 ${
          accent ? "text-[#ffc105]" : warning ? "text-red-400" : ""
        }`}>
          {icon}
        </div>
      </div>
      <div className="mt-6">
        {loading ? (
          <div className="h-9 w-28 animate-pulse rounded-lg bg-white/5" />
        ) : (
          <h3 className={`text-3xl font-bold tracking-tight ${
            mask ? "text-transparent bg-clip-text bg-gradient-to-r from-zinc-700 to-zinc-800 select-none blur-[6px]" : "text-white"
          }`}>
            {value}
          </h3>
        )}
      </div>
    </div>
  );
}
