"use client";

import { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  Calendar, Copy, Image as ImageIcon, Inbox, Layers, MessageCircle, Package,
  Search, SearchX, ShieldAlert, X,
} from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import { Button } from "@techworld/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, Skeleton } from "@techworld/ui";
import { toast } from "sonner";
import { Link, usePathname, useRouter } from "@/navigation";
import { OrdersPipeline } from "@/components/orders/OrdersPipeline";
import { OrderActions } from "@/components/orders/OrderActions";
import { hasPermission } from "@backend/convex/lib/permissions";
import { orderAmountDue } from "@backend/convex/lib/orderTransitions";
import {
  ATTENTION_STATES,
  STALE_AFTER_MS,
  isOrderState,
  stateTone,
  type OrderState,
} from "@/components/orders/order-state";
import { QUEUE_QUERY_KEY } from "@/components/orders/queue-query";

type FilterType = "ALL" | OrderState;
type DateRangePreset = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "ALL_TIME";
type OrderRow = NonNullable<FunctionReturnType<typeof api.orders.listAllOrders>>[number];

const DATE_PRESETS: DateRangePreset[] = ["TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "ALL_TIME"];
const PAGE_SIZE = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

const isDatePreset = (value: string | null): value is DateRangePreset =>
  !!value && (DATE_PRESETS as string[]).includes(value);

const matchesDate = (orderTime: number, preset: DateRangePreset, now: number) => {
  switch (preset) {
    case "TODAY":
      return new Date(orderTime).toDateString() === new Date(now).toDateString();
    case "LAST_7_DAYS":
      return orderTime >= now - 7 * DAY_MS;
    case "LAST_30_DAYS":
      return orderTime >= now - 30 * DAY_MS;
    case "LAST_90_DAYS":
      return orderTime >= now - 90 * DAY_MS;
    default:
      return true;
  }
};

const orderTotal = (order: OrderRow) => orderAmountDue(order);

export default function OrdersPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense>
      <OrdersQueue />
    </Suspense>
  );
}

function OrdersQueue() {
  const tQueue = useTranslations("Orders.queue");
  const tStates = useTranslations("Orders.details.states");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const profile = useQuery(api.auth.getCurrentStaffProfile);
  const canViewOrders =
    profile?.permissions?.some((permission) => String(permission) === "VIEW_ORDERS") ?? false;
  const canVerifyPayments = hasPermission(profile, "VERIFY_PAYMENTS");

  const orders = useQuery(api.orders.listAllOrders, profile && canViewOrders ? {} : "skip");
  const products = useQuery(api.products.listAdminProducts, profile && canViewOrders ? {} : "skip");
  const categories = useQuery(api.categories.listAll, profile && canViewOrders ? {} : "skip");
  const updateGenericStatus = useMutation(api.orders.updateGenericStatus);

  // Filters live in the URL so returning from an order keeps the agent's view.
  const statusParam = searchParams.get("status");
  const rangeParam = searchParams.get("range");
  const filter: FilterType = isOrderState(statusParam) ? statusParam : "ALL";
  const dateRange: DateRangePreset = isDatePreset(rangeParam) ? rangeParam : "ALL_TIME";
  const selectedProductId = searchParams.get("product") ?? "ALL";
  const selectedCategoryId = searchParams.get("category") ?? "ALL";

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [updatingId, setUpdatingId] = useState<Id<"orders"> | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "ALL" || value === "ALL_TIME" || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setVisibleCount(PAGE_SIZE);
    },
    [pathname, router, searchParams],
  );

  // Debounce search into the URL; filtering itself reads local state and stays instant.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search.trim() === current) return;
    const id = window.setTimeout(() => setParams({ q: search.trim() }), 300);
    return () => window.clearTimeout(id);
  }, [search, searchParams, setParams]);

  // Remember the view so the order page can link back to it.
  useEffect(() => {
    try {
      sessionStorage.setItem(QUEUE_QUERY_KEY, searchParams.toString());
    } catch {
      // Storage unavailable: the back link falls back to the plain queue.
    }
  }, [searchParams]);

  // "/" jumps to search from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const now = Date.now();

  // Everything except status: the pipeline counts describe this slice.
  const slice = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      const matchesSearch =
        !deferredSearch ||
        o.customerName?.toLowerCase().includes(deferredSearch) ||
        o.customerPhone?.includes(deferredSearch) ||
        o.customerAltPhone?.includes(deferredSearch) ||
        o.customerEmail?.toLowerCase().includes(deferredSearch) ||
        o.shortCode?.toLowerCase().includes(deferredSearch);
      const matchesProduct = selectedProductId === "ALL" || o.lines.some((l) => l.productId === selectedProductId);
      const matchesCategory =
        selectedCategoryId === "ALL" || o.lines.some((l) => l.product?.categoryId === selectedCategoryId);
      return matchesSearch && matchesDate(o._creationTime, dateRange, now) && matchesProduct && matchesCategory;
    });
    // `now` intentionally excluded: recomputing every render would defeat the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, deferredSearch, selectedProductId, selectedCategoryId, dateRange]);

  const counts = useMemo(() => {
    const result: Partial<Record<OrderState, number>> = {};
    for (const o of slice) {
      const s = o.state as OrderState;
      result[s] = (result[s] ?? 0) + 1;
    }
    return result;
  }, [slice]);

  const visibleOrders = useMemo(
    () => (filter === "ALL" ? slice : slice.filter((o) => o.state === filter)),
    [slice, filter],
  );

  const stats = useMemo(() => {
    const delivered = visibleOrders.filter((o) => o.state === "DELIVERED").length;
    return {
      totalOrders: visibleOrders.length,
      totalRevenue: visibleOrders.reduce((acc, o) => acc + orderTotal(o), 0),
      totalProducts: visibleOrders.reduce((acc, o) => acc + o.quantity, 0),
      deliveryRate: visibleOrders.length > 0 ? Math.round((delivered / visibleOrders.length) * 100) : 0,
    };
  }, [visibleOrders]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (dateRange !== "ALL_TIME" ? 1 : 0) +
    (selectedProductId !== "ALL" ? 1 : 0) +
    (selectedCategoryId !== "ALL" ? 1 : 0) +
    (filter !== "ALL" ? 1 : 0);

  const handleClearFilters = () => {
    setSearch("");
    setParams({ q: null, range: null, product: null, category: null, status: null });
  };

  const handleStatusChange = async (orderId: Id<"orders">, currentState: OrderState, newState: OrderState) => {
    if (currentState === newState) return;
    setUpdatingId(orderId);
    try {
      await updateGenericStatus({ orderId, newState });
      toast.success(tQueue("messages.statusUpdated", { state: tStates(newState) }));
    } catch (error) {
      const err = error as { data?: { message?: string }; message?: string };
      toast.error(tQueue("messages.statusFailed"), {
        description: err?.data?.message || err?.message || tQueue("messages.statusFailedHint"),
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(tQueue("table.copied", { code }));
    } catch {
      // Clipboard can be blocked on insecure origins; the code is still selectable.
    }
  };

  const nf = new Intl.NumberFormat(locale);
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const relative = (time: number) => {
    const diff = time - now;
    const abs = Math.abs(diff);
    if (abs < 60_000) return rtf.format(0, "minute");
    if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
    if (abs < DAY_MS) return rtf.format(Math.round(diff / 3_600_000), "hour");
    if (abs < 30 * DAY_MS) return rtf.format(Math.round(diff / DAY_MS), "day");
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(time);
  };
  const productName = (line: OrderRow["lines"][number]) =>
    (locale === "ar" ? line.product?.name_ar : line.product?.name_en) ??
    line.product?.name_en ??
    tQueue("table.unknownProduct");
  const isStale = (o: OrderRow) =>
    ATTENTION_STATES.includes(o.state as OrderState) && now - o._creationTime > STALE_AFTER_MS;

  const isLoading = profile === undefined || (canViewOrders && orders === undefined);
  const pageOrders = visibleOrders.slice(0, visibleCount);
  const remaining = visibleOrders.length - pageOrders.length;
  const egp = tQueue("stats.egp");



  const controlClass = "h-11 rounded-xl border-border bg-background text-sm font-semibold focus:border-[#ffc105]/60";

  const renderWhatsAppStatus = (order: OrderRow) =>
    order.whatsappClickedAt ? (
      <span
        title={tQueue("table.whatsappClickedTitle", { time: dateFormatter.format(order.whatsappClickedAt) })}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
      >
        <MessageCircle className="h-3 w-3 shrink-0" />
        {tQueue("table.whatsappClicked")}
      </span>
    ) : (
      <span
        title={tQueue("table.whatsappNotClickedTitle")}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
      >
        <MessageCircle className="h-3 w-3 shrink-0 opacity-60" />
        {tQueue("table.whatsappNotClicked")}
      </span>
    );

  const renderStatus = (state: string) => (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold",
        stateTone(state).badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", stateTone(state).dot)} aria-hidden />
      {isOrderState(state) ? tStates(state) : state}
    </span>
  );

  const renderCode = (order: OrderRow) =>
    order.shortCode ? (
      <span className="inline-flex items-center gap-1">
        <Link
          href={`/orders/${order._id}`}
          dir="ltr"
          className="rounded font-mono text-sm font-bold text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#ffc105]"
        >
          {order.shortCode}
        </Link>
        <button
          type="button"
          onClick={() => copyCode(order.shortCode!)}
          aria-label={tQueue("table.copyCode")}
          title={tQueue("table.copyCode")}
          className="rounded-md p-1 text-muted-foreground opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#ffc105] group-hover/row:opacity-100"
        >
          <Copy className="h-3 w-3" />
        </button>
      </span>
    ) : (
      <Link
        href={`/orders/${order._id}`}
        className="text-sm font-bold text-muted-foreground underline-offset-4 hover:underline"
      >
        {tQueue("table.noCode")}
      </Link>
    );

  const renderTime = (order: OrderRow) => (
    <time
      dateTime={new Date(order._creationTime).toISOString()}
      title={dateFormatter.format(order._creationTime)}
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold",
        isStale(order) ? "text-orange-700 dark:text-orange-300" : "text-muted-foreground",
      )}
    >
      {isStale(order) && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden />}
      {relative(order._creationTime)}
      {isStale(order) && <span className="sr-only">{tQueue("table.stale")}</span>}
    </time>
  );

  const renderItems = (order: OrderRow) => {
    const [first, ...rest] = order.lines;
    if (!first) return <span className="text-xs text-muted-foreground">{tQueue("table.unknownProduct")}</span>;
    const variant = first.sku?.variantAttributes?.color ?? first.sku?.variantName;
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground" title={productName(first)}>
          {first.quantity > 1 && <span className="font-bold tabular-nums text-muted-foreground">{nf.format(first.quantity)}× </span>}
          {productName(first)}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {first.sku?.variantAttributes?.colorCode && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: first.sku.variantAttributes.colorCode }}
              aria-hidden
            />
          )}
          {variant && <span className="truncate">{variant}</span>}
          {rest.length > 0 && (
            <span
              className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-bold text-foreground"
              title={rest.map((l) => `${l.quantity}× ${productName(l)}`).join("\n")}
            >
              {tQueue("table.moreItems", { count: rest.length })}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderReceipt = (order: OrderRow, compact = false) =>
    order.receiptUrl ? (
      <a
        href={order.receiptUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-bold text-foreground underline decoration-[#ffc105] decoration-2 underline-offset-4 outline-none hover:bg-[#ffc105]/15 focus-visible:ring-2 focus-visible:ring-[#ffc105]"
      >
        <ImageIcon className="h-3.5 w-3.5" />
        {compact ? tQueue("table.receiptShort") : tQueue("table.viewReceipt")}
      </a>
    ) : (
      <span className="whitespace-nowrap px-2 text-xs font-medium text-muted-foreground">{tQueue("table.noReceipt")}</span>
    );

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col gap-2 px-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">{tQueue("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground">
            {tQueue("description")}
          </p>
        </div>
      </header>

      <section className="space-y-5 rounded-[32px] border border-border bg-card p-4 md:p-6">
        <OrdersPipeline
          counts={counts}
          total={slice.length}
          active={filter}
          loading={isLoading}
          onSelect={(next) => setParams({ status: next })}
        />

        {/* Toolbar: always visible, one row on desktop */}
        <div className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <span className="sr-only">{tQueue("filters.advanced.search")}</span>
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3.5 rtl:right-3.5" />
            <Input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearch("");
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder={tQueue("filters.advanced.search")}
              className={cn(controlClass, "ltr:pl-10 ltr:pr-10 rtl:pr-10 rtl:pl-10")}
            />
            <kbd className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted px-1.5 font-mono text-[11px] font-bold text-muted-foreground md:block ltr:right-3 rtl:left-3">
              /
            </kbd>
          </label>

          <Select value={dateRange} onValueChange={(v) => setParams({ range: v })}>
            <SelectTrigger aria-label={tQueue("filters.advanced.date.label")} className={cn(controlClass, "px-3.5")}>
              <div className="flex min-w-0 items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-card">
              {DATE_PRESETS.map((p) => (
                <SelectItem key={p} value={p} className="text-sm font-semibold">
                  {tQueue(`filters.advanced.date.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProductId} onValueChange={(v) => setParams({ product: v })}>
            <SelectTrigger aria-label={tQueue("filters.advanced.product")} className={cn(controlClass, "px-3.5")}>
              <div className="flex min-w-0 items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate"><SelectValue /></span>
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72 rounded-xl border-border bg-card">
              <SelectItem value="ALL" className="text-sm font-semibold">
                {tQueue("filters.allProducts")}
              </SelectItem>
              {products?.map((p) => (
                <SelectItem key={p._id} value={p._id} className="text-sm font-semibold">
                  {locale === "ar" ? p.name_ar : p.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategoryId} onValueChange={(v) => setParams({ category: v })}>
            <SelectTrigger aria-label={tQueue("filters.advanced.category")} className={cn(controlClass, "px-3.5")}>
              <div className="flex min-w-0 items-center gap-2">
                <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate"><SelectValue /></span>
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72 rounded-xl border-border bg-card">
              <SelectItem value="ALL" className="text-sm font-semibold">
                {tQueue("filters.allCategories")}
              </SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c._id} value={c._id} className="text-sm font-semibold">
                  {locale === "ar" ? c.name_ar : c.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0}
            className="h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
            {tQueue("filters.advanced.clear")}
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffc105] px-1 text-[11px] font-bold tabular-nums text-black">
                {nf.format(activeFilterCount)}
              </span>
            )}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-border bg-card">
        {/* Summary of the current slice, replaces the standalone KPI cards */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-5 py-4 md:px-6">
          <h2 className="text-base font-bold text-foreground">
            {filter === "ALL" ? tQueue("table.title") : tStates(filter)}
          </h2>
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground ltr:md:ml-auto rtl:md:mr-auto">
            {[
              { label: tQueue("stats.totalOrders"), value: nf.format(stats.totalOrders) },
              { label: tQueue("stats.totalRevenue"), value: `${nf.format(stats.totalRevenue)} ${egp}` },
              { label: tQueue("stats.totalProducts"), value: nf.format(stats.totalProducts) },
              { label: tQueue("stats.deliveryRate"), value: `${nf.format(stats.deliveryRate)}%` },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <dt className="font-semibold">{s.label}</dt>
                <dd className="text-sm font-bold tabular-nums text-foreground">
                  {isLoading ? <Skeleton className="inline-block h-3.5 w-10 align-middle" /> : s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {isLoading ? (
          <div aria-busy="true" aria-label={tQueue("table.loading")} className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 px-6 py-5">
                <Skeleton className="h-4 w-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="hidden h-4 w-48 md:block" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="hidden h-9 w-40 rounded-xl lg:block" />
              </div>
            ))}
          </div>
        ) : !canViewOrders ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-7 w-7 text-destructive" />
            </div>
            <p className="max-w-sm text-sm font-bold text-foreground">{tQueue("table.noPermission")}</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              {orders && orders.length > 0 ? (
                <SearchX className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Inbox className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            {orders && orders.length > 0 ? (
              <>
                <p className="text-sm font-bold text-foreground">{tQueue("table.noMatches")}</p>
                <p className="max-w-sm text-sm text-muted-foreground">{tQueue("table.noMatchesHint")}</p>
                <Button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-2 h-10 rounded-xl bg-foreground px-5 text-sm font-bold text-background hover:bg-[#ffc105] hover:text-black"
                >
                  {tQueue("filters.advanced.clear")}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground">{tQueue("table.empty")}</p>
                <p className="max-w-sm text-sm text-muted-foreground">{tQueue("table.emptyHint")}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-start text-sm text-foreground">
                <thead className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground">
                  <tr>
                    <th scope="col" className="whitespace-nowrap px-6 py-3 text-start font-bold">{tQueue("table.columns.order")}</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3 text-start font-bold">{tQueue("table.columns.customer")}</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3 text-start font-bold">{tQueue("table.columns.product")}</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3 text-end font-bold">{tQueue("table.columns.total")}</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-3 text-start font-bold">{tQueue("table.columns.status")}</th>
                    <th scope="col" className="hidden whitespace-nowrap px-4 py-3 text-start font-bold xl:table-cell">{tQueue("table.columns.receipt")}</th>
                    <th scope="col" className="whitespace-nowrap px-6 py-3 text-end font-bold">
                      <span className="sr-only">{tQueue("table.columns.action")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageOrders.map((order) => (
                    <tr
                      key={order._id}
                      className={cn(
                        "group/row align-middle transition-colors duration-150 hover:bg-accent/40",
                        updatingId === order._id && "opacity-60",
                      )}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        {renderCode(order)}
                        <div className="mt-1">{renderTime(order)}</div>
                      </td>
                      <td className="max-w-[15rem] px-4 py-4">
                        <p className="truncate font-bold text-foreground" title={order.customerName ?? undefined}>
                          {order.customerName ?? tQueue("table.walkInCustomer")}
                        </p>
                        <p className="mt-1 flex items-center gap-2 truncate text-xs text-muted-foreground">
                          <span dir="ltr" className="font-mono tabular-nums" title={order.customerAltPhone ? `${tQueue("table.altPhone")}: ${order.customerAltPhone}` : undefined}>
                            {order.customerPhone ?? tQueue("table.noPhone")}
                          </span>
                          {order.governorate && (
                            <>
                              <span aria-hidden className="text-border">•</span>
                              <span className="truncate">
                                {locale === "ar" ? order.governorate.name_ar : order.governorate.name_en}
                              </span>
                            </>
                          )}
                        </p>
                      </td>
                      <td className="max-w-[18rem] px-4 py-4">{renderItems(order)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-end">
                        <span className="font-bold tabular-nums text-foreground">{nf.format(orderTotal(order))}</span>
                        <span className="text-xs font-semibold text-muted-foreground ltr:ml-1 rtl:mr-1">{egp}</span>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {tQueue("table.items", { count: order.quantity })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          {renderStatus(order.state)}
                          {renderWhatsAppStatus(order)}
                        </div>
                      </td>
                      <td className="hidden px-4 py-4 xl:table-cell">{renderReceipt(order)}</td>
                      <td className="px-6 py-4">
                        <OrderActions
                          orderId={order._id}
                          state={order.state as OrderState}
                          busy={updatingId === order._id}
                          onChangeState={(s) => handleStatusChange(order._id, order.state as OrderState, s)}
                          canVerifyPayments={canVerifyPayments}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {pageOrders.map((order) => (
                <li
                  key={order._id}
                  className={cn("group/row space-y-3 px-4 py-4", updatingId === order._id && "opacity-60")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {renderCode(order)}
                      <div className="mt-1">{renderTime(order)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {renderStatus(order.state)}
                      {renderWhatsAppStatus(order)}
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">
                        {order.customerName ?? tQueue("table.walkInCustomer")}
                      </p>
                      <p dir="ltr" className="mt-0.5 text-xs font-mono tabular-nums text-muted-foreground rtl:text-end">
                        {order.customerPhone ?? tQueue("table.noPhone")}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <span className="font-bold tabular-nums">{nf.format(orderTotal(order))}</span>
                      <span className="text-xs font-semibold text-muted-foreground ltr:ml-1 rtl:mr-1">{egp}</span>
                    </div>
                  </div>
                  {renderItems(order)}
                  <div className="flex items-center justify-between gap-2">
                    {renderReceipt(order, true)}
                    <OrderActions
                      orderId={order._id}
                      state={order.state as OrderState}
                      busy={updatingId === order._id}
                      onChangeState={(s) => handleStatusChange(order._id, order.state as OrderState, s)}
                      canVerifyPayments={canVerifyPayments}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                {tQueue("table.showing", { shown: pageOrders.length, total: visibleOrders.length })}
              </p>
              {remaining > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="h-9 rounded-xl border-border px-4 text-xs font-bold hover:bg-accent"
                >
                  {tQueue("table.showMore", { count: Math.min(PAGE_SIZE, remaining) })}
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
