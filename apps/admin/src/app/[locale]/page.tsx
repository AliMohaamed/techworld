"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useState, Suspense } from "react";
import { SalesVelocityChart } from "@/components/charts/SalesVelocityChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { TrendingUp, ShoppingCart, DollarSign, Truck, AlertCircle, ShieldX } from "lucide-react";
import { Button, cn, Skeleton } from "@techworld/ui";
import { hasPermission } from "@backend/convex/lib/permissions";
import { useTranslations, useLocale } from 'next-intl';

export default function AdminDashboardPage() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const me = useQuery(api.users.getMe);
  const [timeWindow, setTimeWindow] = useState<"today" | "last7days" | "last30days">("last7days");
  
  const canViewAnalytics = React.useMemo(() => {
    if (!me) return false;
    return hasPermission(me, "VIEW_ANALYTICS");
  }, [me]);

  const metrics = useQuery(
    api.analytics.dashboardMetrics, 
    canViewAnalytics ? { timeWindow } : "skip"
  );

  const loading = (me === undefined) || (canViewAnalytics && metrics === undefined);

  if (!loading && !canViewAnalytics) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-700">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-red-500/10 rounded-full" />
          <div className="relative h-24 w-24 bg-[#24201a] border border-white/10 rounded-[32px] flex items-center justify-center shadow-2xl">
            <ShieldX size={48} className="text-red-500/50" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white tracking-tight">{t('restricted.title')}</h2>
          <p className="max-w-md text-zinc-500 text-sm leading-relaxed font-light">
            {t('restricted.description')}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header with Time Window Selector */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.08),transparent_40%),#24201a] px-8 py-10 shadow-xl">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-primary">{t('badge')}</p>
          <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 font-light">
            {t('description')}
          </p>
        </div>
        
        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-white/5 bg-black/20 p-1.5 backdrop-blur">
          {(["today", "last7days", "last30days"] as const).map((window) => (
            <Button
              key={window}
              size="sm"
              variant={timeWindow === window ? "default" : "ghost"}
              onClick={() => setTimeWindow(window)}
              className={cn(
                "h-9 px-4 text-[10px] uppercase tracking-[0.1em]",
                timeWindow !== window && "text-zinc-500 hover:text-white"
              )}
            >
              {t(`timeWindows.${window}`)}
            </Button>
          ))}
        </div>
      </section>

      {/* Summary KPI Cards */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          label={t('metrics.totalOrders')} 
          value={metrics?.totalOrders ?? "-"} 
          icon={<ShoppingCart size={20} />} 
          loading={loading}
        />
        <KpiCard 
          label={t('metrics.netProfit')} 
          value={metrics?.netProfit !== undefined && metrics?.netProfit !== null ? `EGP ${metrics.netProfit.toLocaleString(locale)}` : "***"} 
          icon={<DollarSign size={20} />} 
          mask={metrics?.netProfit === null}
          loading={loading}
          accent
        />
        <KpiCard 
          label={t('metrics.courierFees')} 
          value={metrics?.courierFees !== undefined ? `EGP ${metrics.courierFees.toLocaleString(locale)}` : "-"} 
          icon={<Truck size={20} />} 
          loading={loading}
        />
        <KpiCard 
          label={t('metrics.rtoRate')} 
          value={metrics?.rtoRate !== undefined ? `${metrics.rtoRate.toFixed(1)}%` : "-"} 
          icon={<AlertCircle size={20} />} 
          loading={loading}
          warning={metrics?.rtoRate !== undefined && metrics.rtoRate > 20}
        />
      </section>

      {/* Charts Row */}
      <section className="grid gap-8 grid-cols-1 xl:grid-cols-[1.6fr,1fr]">
        <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-[28px]" />}>
          <div className="rounded-[28px] border border-white/5 bg-[#24201a] p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white uppercase tracking-tighter">{t('charts.salesVelocity.title')}</h2>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                <TrendingUp size={14} className="text-[#ffc105]" />
                {t('charts.salesVelocity.legend')}
              </div>
            </div>
            <SalesVelocityChart data={metrics?.velocityData || []} />
          </div>
        </Suspense>

        <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-[28px]" />}>
          <div className="rounded-[28px] border border-white/5 bg-[#24201a] p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white tracking-tight uppercase tracking-tighter">{t('charts.statusBreakdown.title')}</h2>
            </div>
            <StatusBreakdownChart data={metrics?.statusBreakdown || []} />
          </div>
        </Suspense>
      </section>
      
      {/* Financial Deep Dive (Optional visibility) */}
      {metrics?.metadata?.isFinancialsVisible && (
        <section className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/5 bg-[#2a261f] p-8 border-l-4 border-l-[#ffc105]">
            <h3 className="text-[11px] uppercase tracking-[0.3em] text-[#ffc105] font-semibold">{t('health.snapshot')}</h3>
            <div className="mt-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div>
                <p className="text-sm text-zinc-500">{t('health.grossRevenue')}</p>
                <h4 className="mt-2 text-3xl font-bold text-white tracking-tight">EGP {metrics.totalRevenue?.toLocaleString(locale)}</h4>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-zinc-500">{t('health.accumulatedCogs')}</p>
                <h4 className="mt-2 text-3xl font-bold text-white tracking-tight">EGP {metrics.totalCogs?.toLocaleString(locale)}</h4>
              </div>
            </div>
          </div>
          
          <div className="rounded-[24px] border border-white/5 bg-[#1a1814]/40 p-10 flex items-center justify-center relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
             <p className="text-[10px] text-zinc-500 text-center uppercase tracking-[0.3em] leading-loose max-w-[280px]">
               {t('health.compliance')}
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
