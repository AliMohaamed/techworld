"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useState, Suspense } from "react";
import { SalesVelocityChart } from "@/components/charts/SalesVelocityChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Truck,
  AlertCircle,
  ShieldX,
} from "lucide-react";
import { Button, cn, Skeleton } from "@techworld/ui";
import { hasPermission } from "@backend/convex/lib/permissions";
import { useTranslations, useLocale } from "next-intl";

export default function AdminDashboardPage() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const me = useQuery(api.users.getMe);
  const [timeWindow, setTimeWindow] = useState<
    "today" | "last7days" | "last30days"
  >("last7days");

  const canViewAnalytics = React.useMemo(() => {
    if (!me) return false;
    return hasPermission(me, "VIEW_ANALYTICS");
  }, [me]);

  const metrics = useQuery(
    api.analytics.dashboardMetrics,
    canViewAnalytics ? { timeWindow } : "skip",
  );

  const loading =
    me === undefined || (canViewAnalytics && metrics === undefined);

  if (!loading && !canViewAnalytics) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in duration-700 bg-background">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-destructive/10 rounded-full" />
          <div className="relative h-24 w-24 bg-card border border-border rounded-[32px] flex items-center justify-center  ">
            <ShieldX size={48} className="text-destructive/50" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
            {t("restricted.title")}
          </h2>
          <p className="max-w-md text-muted-foreground/60 text-sm leading-relaxed font-medium uppercase tracking-[0.1em]">
            {t("restricted.description")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 animate-in fade-in duration-500 pb-12 bg-background transition-colors">
      {/* Header with Time Window Selector */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-[32px] border border-border bg-card px-8 py-10 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.08),transparent_40%)]" />
        {/* Light mode decorative gradient */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden" />

        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
            {t("badge")}
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tightest text-foreground leading-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground font-medium">
            {t("description")}
          </p>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1 rounded-2xl border border-border bg-accent/30 p-1.5 backdrop-blur-md  ">
          {(["today", "last7days", "last30days"] as const).map((window) => (
            <Button
              key={window}
              size="sm"
              variant={timeWindow === window ? "default" : "ghost"}
              onClick={() => setTimeWindow(window)}
              className={cn(
                "h-9 px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                timeWindow === window
                  ? "bg-[#ffc105] text-black"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
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
          label={t("metrics.totalOrders")}
          value={metrics?.totalOrders ?? "-"}
          icon={<ShoppingCart size={20} />}
          loading={loading}
        />
        <KpiCard
          label={t("metrics.netProfit")}
          value={
            metrics?.netProfit !== undefined && metrics?.netProfit !== null
              ? `EGP ${metrics.netProfit.toLocaleString(locale)}`
              : "***"
          }
          icon={<DollarSign size={20} />}
          mask={metrics?.netProfit === null}
          loading={loading}
          accent
        />
        <KpiCard
          label={t("metrics.courierFees")}
          value={
            metrics?.courierFees !== undefined
              ? `EGP ${metrics.courierFees.toLocaleString(locale)}`
              : "-"
          }
          icon={<Truck size={20} />}
          loading={loading}
        />
        <KpiCard
          label={t("metrics.rtoRate")}
          value={
            metrics?.rtoRate !== undefined
              ? `${metrics.rtoRate.toFixed(1)}%`
              : "-"
          }
          icon={<AlertCircle size={20} />}
          loading={loading}
          warning={metrics?.rtoRate !== undefined && metrics.rtoRate > 20}
        />
      </section>

      {/* Charts Row */}
      <section className="grid gap-8 grid-cols-1 xl:grid-cols-[1.6fr,1fr]">
        <Suspense
          fallback={
            <Skeleton className="h-[400px] w-full rounded-[32px] bg-accent" />
          }
        >
          <div className="rounded-[32px] border border-border bg-card p-10   transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-32 h-32 bg-[#ffc105]/5 rounded-full blur-3xl -ml-16 -mt-16" />
            <div className="mb-10 flex items-center justify-between relative z-10">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tightest leading-none">
                {t("charts.salesVelocity.title")}
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-accent px-4 py-2 rounded-full border border-border">
                <TrendingUp size={14} className="text-[#ffc105]" />
                {t("charts.salesVelocity.legend")}
              </div>
            </div>
            <div className="relative z-10">
              <SalesVelocityChart data={metrics?.velocityData || []} />
            </div>
          </div>
        </Suspense>

        <Suspense
          fallback={
            <Skeleton className="h-[400px] w-full rounded-[32px] bg-accent" />
          }
        >
          <div className="rounded-[32px] border border-border bg-card p-10   transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffc105]/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="mb-10 flex items-center justify-between relative z-10">
              <h2 className="text-xl font-black text-foreground uppercase tracking-tightest leading-none">
                {t("charts.statusBreakdown.title")}
              </h2>
            </div>
            <div className="relative z-10">
              <StatusBreakdownChart data={metrics?.statusBreakdown || []} />
            </div>
          </div>
        </Suspense>
      </section>

      {/* Financial Deep Dive (Optional visibility) */}
      {metrics?.metadata?.isFinancialsVisible && (
        <section className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <div className="group rounded-[32px] border border-border bg-card p-10 border-l-8 border-l-[#ffc105]   transition-all hover:scale-[1.01]">
            <h3 className="text-[10px] uppercase tracking-[0.4em] text-[#ffc105] font-black italic">
              {t("health.snapshot")}
            </h3>
            <div className="mt-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                  {t("health.grossRevenue")}
                </p>
                <h4 className="mt-3 text-4xl font-black text-foreground tracking-tightest uppercase italic">
                  EGP {metrics.totalRevenue?.toLocaleString(locale)}
                </h4>
              </div>
              <div className="md:text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                  {t("health.accumulatedCogs")}
                </p>
                <h4 className="mt-3 text-4xl font-black text-foreground tracking-tightest uppercase italic">
                  EGP {metrics.totalCogs?.toLocaleString(locale)}
                </h4>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-accent/10 p-10 flex items-center justify-center relative overflow-hidden group  ">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <p className="text-[10px] font-black text-muted-foreground/20 text-center uppercase tracking-[0.5em] leading-[2.2] max-w-[320px] italic">
              {t("health.compliance")}
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
  warning,
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
    <div
      className={cn(
        "group rounded-[28px] border border-border bg-card p-6 transition-all duration-500   hover:  hover:-translate-y-1 relative overflow-hidden",
        accent && "border-[#ffc105]/20 shadow-[#ffc105]/5",
      )}
    >
      {accent && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#ffc105]/5 rounded-full blur-2xl -mr-12 -mt-12" />
      )}

      <div className="flex items-center justify-between gap-3 relative z-10">
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
          {label}
        </span>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[14px] bg-accent transition-all group-hover:scale-110 shadow-sm",
            accent
              ? "text-[#ffc105] bg-[#ffc105]/5"
              : warning
                ? "text-destructive"
                : "text-muted-foreground/60",
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-8 relative z-10">
        {loading ? (
          <div className="h-10 w-3/4 animate-pulse rounded-xl bg-accent" />
        ) : (
          <h3
            className={cn(
              "text-3xl font-black tracking-tightest uppercase italic",
              mask
                ? "text-transparent bg-clip-text bg-gradient-to-r from-muted-foreground/20 to-muted-foreground/40 select-none blur-[8px]"
                : "text-foreground",
            )}
          >
            {value}
          </h3>
        )}
      </div>
    </div>
  );
}
