"use client";

import { useState } from "react";
import { Link } from "@/navigation";
import { useQuery, useMutation } from "convex/react";
import {
  ArrowRight, ShieldAlert, ShoppingCart, Loader2,
  Search, Calendar, Filter, X, Package, Layers,
  TrendingUp, DollarSign, Box, CheckCircle2
} from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import { Button } from "@techworld/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from "@techworld/ui";
import { toast } from "sonner";

type OrderState =
  | "PENDING_PAYMENT_INPUT"
  | "AWAITING_VERIFICATION"
  | "CONFIRMED"
  | "READY_FOR_SHIPPING"
  | "SHIPPED"
  | "DELIVERED"
  | "RTO"
  | "STALLED_PAYMENT"
  | "CANCELLED"
  | "FLAGGED_FRAUD";

type FilterType = "ALL" | OrderState;

type DateRangePreset = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "LAST_90_DAYS" | "ALL_TIME";

export default function OrdersPage() {
  const tQueue = useTranslations("Orders.queue");
  const tStates = useTranslations("Orders.details.states");
  const locale = useLocale();
  const profile = useQuery(api.auth.getCurrentStaffProfile);

  const canViewOrders =
    profile?.permissions?.some(
      (permission) => String(permission) === "VIEW_ORDERS",
    ) ?? false;

  const canManageShipping =
    profile?.permissions?.some(
      (permission) => String(permission) === "MANAGE_SHIPPING_STATUS",
    ) ?? false;

  const orders = useQuery(
    api.orders.listAllOrders,
    profile && canViewOrders ? {} : "skip",
  );

  const products = useQuery(api.products.listAdminProducts, profile && canViewOrders ? {} : "skip");
  const categories = useQuery(api.categories.listAll, profile && canViewOrders ? {} : "skip");

  const updateGenericStatus = useMutation(api.orders.updateGenericStatus);

  const [filter, setFilter] = useState<FilterType>("ALL");
  const [updatingId, setUpdatingId] = useState<Id<"orders"> | null>(null);

  // Advanced filters state
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangePreset>("ALL_TIME");
  const [selectedProductId, setSelectedProductId] = useState<string>("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  const filterByDate = (orderTime: number, preset: DateRangePreset) => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    switch (preset) {
      case "TODAY":
        return new Date(orderTime).toDateString() === new Date(now).toDateString();
      case "LAST_7_DAYS":
        return orderTime >= now - 7 * dayMs;
      case "LAST_30_DAYS":
        return orderTime >= now - 30 * dayMs;
      case "LAST_90_DAYS":
        return orderTime >= now - 90 * dayMs;
      default:
        return true;
    }
  };

  const visibleOrders = orders ? orders.filter(o => {
    const matchesStatus = filter === "ALL" || o.state === filter;
    const matchesSearch = !search ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone?.includes(search) ||
      o.shortCode?.toLowerCase().includes(search.toLowerCase());
    const matchesDate = filterByDate(o._creationTime, dateRange);
    const matchesProduct = selectedProductId === "ALL" || o.productId === selectedProductId;
    const matchesCategory = selectedCategoryId === "ALL" || o.product?.categoryId === selectedCategoryId;

    return matchesStatus && matchesSearch && matchesDate && matchesProduct && matchesCategory;
  }) : [];

  // Stats calculation
  const stats = {
    totalOrders: visibleOrders.length,
    totalRevenue: visibleOrders.reduce((acc, o) => acc + o.total_price + (o.appliedShippingFee || 0), 0),
    totalProducts: visibleOrders.reduce((acc, o) => acc + o.quantity, 0),
    deliveryRate: visibleOrders.length > 0
      ? Math.round((visibleOrders.filter(o => o.state === "DELIVERED").length / visibleOrders.length) * 100)
      : 0
  };

  const handleClearFilters = () => {
    setSearch("");
    setDateRange("ALL_TIME");
    setSelectedProductId("ALL");
    setSelectedCategoryId("ALL");
    setFilter("ALL");
  };

  const handleStatusChange = async (orderId: Id<"orders">, currentState: OrderState, newState: OrderState) => {
    if (currentState === newState) return;

    setUpdatingId(orderId);
    try {
      await updateGenericStatus({ orderId, newState });
      toast.success(`Order status updated to ${tStates(newState)}.`);
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error.message || "Could not update the order.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case "AWAITING_VERIFICATION": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "CONFIRMED": return "bg-[#ffc105]/10 text-[#ffc105] border-[#ffc105]/20";
      case "READY_FOR_SHIPPING": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "SHIPPED": return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "DELIVERED": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "CANCELLED":
      case "RTO":
      case "FLAGGED_FRAUD":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-accent/50 text-muted-foreground/80 border-border";
    }
  };

  const states: FilterType[] = ["ALL", "AWAITING_VERIFICATION", "CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED", "DELIVERED", "CANCELLED", "RTO"];

  return (
    <main className="space-y-8 pb-10">
      {/* Stats Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: tQueue("stats.totalOrders"), value: stats.totalOrders.toLocaleString(locale), icon: Box, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: tQueue("stats.totalRevenue"), value: `${stats.totalRevenue.toLocaleString(locale)} ${tQueue("stats.egp")}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: tQueue("stats.totalProducts"), value: stats.totalProducts.toLocaleString(locale), icon: Package, color: "text-[#ffc105]", bg: "bg-[#ffc105]/10" },
          { label: tQueue("stats.deliveryRate"), value: `${stats.deliveryRate}%`, icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-[32px] p-6 flex items-center gap-4 transition-all hover:border-[#ffc105]/20 hover:shadow-lg group">
            <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80 mb-1">{stat.label}</p>
              <p className="text-2xl font-black tracking-tightest text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12 transition-all hover:shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ShoppingCart className="text-[#ffc105]" size={20} />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#ffc105]">
                    {tQueue("badge")}
                  </p>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight">
                {tQueue("title")}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/60">
                {tQueue("description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                className={cn(
                  "rounded-2xl h-12 px-6 text-[10px] font-black uppercase tracking-widest transition-all",
                  isFilterBarOpen || search || dateRange !== "ALL_TIME" || selectedProductId !== "ALL" || selectedCategoryId !== "ALL"
                    ? "border-[#ffc105] text-[#ffc105] bg-[#ffc105]/5"
                    : "border-border text-muted-foreground"
                )}
              >
                <Filter size={14} className={cn("mr-2", locale === "ar" ? "ml-2 mr-0" : "mr-2 ml-0")} />
                {tQueue("filters.advanced.title")}
                {(search || dateRange !== "ALL_TIME" || selectedProductId !== "ALL" || selectedCategoryId !== "ALL") && (
                  <span className="ml-2 w-5 h-5 flex items-center justify-center bg-[#ffc105] text-black rounded-full text-[9px] font-bold">
                    {[search, dateRange !== "ALL_TIME", selectedProductId !== "ALL", selectedCategoryId !== "ALL"].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Advanced Filter Bar */}
          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-hidden transition-all duration-300",
            isFilterBarOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
          )}>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80 px-2">
                {tQueue("filters.advanced.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" size={14} />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tQueue("filters.advanced.search")}
                  className="pl-10 h-12 rounded-2xl bg-accent/20 border-border/50 focus:border-[#ffc105]/50 transition-all text-xs font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80 px-2">
                {tQueue("filters.advanced.date.label")}
              </label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangePreset)}>
                <SelectTrigger className="h-12 rounded-2xl bg-accent/20 border-border/50 focus:border-[#ffc105]/50 text-xs font-bold px-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-muted-foreground/40" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card">
                  {(["TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "ALL_TIME"] as DateRangePreset[]).map(p => (
                    <SelectItem key={p} value={p} className="text-xs font-bold uppercase tracking-widest">
                      {tQueue(`filters.advanced.date.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80 px-2">
                {tQueue("filters.advanced.product")}
              </label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-12 rounded-2xl bg-accent/20 border-border/50 focus:border-[#ffc105]/50 text-xs font-bold px-4">
                  <div className="flex items-center gap-2 text-left truncate">
                    <Package size={14} className="text-muted-foreground/40 flex-shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border bg-card max-h-60">
                  <SelectItem value="ALL" className="text-xs font-bold uppercase tracking-widest">
                    {tQueue("filters.ALL")}
                  </SelectItem>
                  {products?.map(p => (
                    <SelectItem key={p._id} value={p._id} className="text-xs font-bold">
                      {locale === "ar" ? p.name_ar : p.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80 px-2">
                {tQueue("filters.advanced.category")}
              </label>
              <div className="flex gap-2">
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="h-12 rounded-2xl bg-accent/20 border-border/50 focus:border-[#ffc105]/50 text-xs font-bold px-4 grow">
                    <div className="flex items-center gap-2 text-left truncate">
                      <Layers size={14} className="text-muted-foreground/40 flex-shrink-0" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border bg-card">
                    <SelectItem value="ALL" className="text-xs font-bold uppercase tracking-widest">
                      {tQueue("filters.ALL")}
                    </SelectItem>
                    {categories?.map(c => (
                      <SelectItem key={c._id} value={c._id} className="text-xs font-bold">
                        {locale === "ar" ? c.name_ar : c.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="h-12 w-12 rounded-2xl border border-border/50 text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <X size={18} />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/50">
            {states.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-4 py-2 text-[11px] font-bold uppercase tracking-wide rounded-full transition-all border",
                  filter === s ? "bg-[#ffc105] text-black border-[#ffc105]" : "bg-card text-muted-foreground/60 border-border hover:bg-accent hover:text-foreground"
                )}
              >
                {s === "ALL" ? tQueue("table.filters.ALL") : tStates(s as OrderState)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-border bg-card   group transition-all hover:border-[#ffc105]/10">
        <div className="border-b border-border bg-accent/30 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-1 bg-[#ffc105] rounded-full" />
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
              {tQueue("table.title")}
            </h2>
          </div>
            <div className="text-[11px] font-bold text-muted-foreground/60 font-mono uppercase tracking-wide">
              Live Buffer • {visibleOrders.length} Records
            </div>
          </div>

        {profile === undefined || (canViewOrders && orders === undefined) ? (
          <div className="p-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#ffc105]" />
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">
              {tQueue("table.loading")}
            </p>
          </div>
        ) : !canViewOrders ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert size={32} className="text-destructive" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-destructive/80">
              {tQueue("table.noPermission")}
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#ffc105]/10 flex items-center justify-center">
              <ShieldAlert size={32} className="text-[#ffc105]" />
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#ffc105]">
              {tQueue("table.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="bg-accent/50 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80 border-b border-border">
                <tr>
                  <th className="sticky left-0 bg-card py-4 px-6 z-10 w-64">
                    {tQueue("table.columns.customer")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap">
                    {tQueue("table.columns.product")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap">
                    {tQueue("table.columns.status")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap text-center">
                    {tQueue("table.columns.quantity")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap">
                    {tQueue("table.columns.total")}
                  </th>
                  <th className="py-4 px-4 whitespace-nowrap">
                    {tQueue("table.columns.receipt")}
                  </th>
                  <th className="py-4 px-6 text-right whitespace-nowrap">
                    {tQueue("table.columns.action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card">
                {visibleOrders.map((order) => (
                  <tr
                    key={order._id}
                    className={cn(
                      "group/row hover:bg-accent/20 transition-all",
                      updatingId === order._id ? "opacity-50 pointer-events-none" : ""
                    )}
                  >
                    <td className="sticky left-0 bg-card py-4 px-6 align-middle z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                      <div className="font-bold text-foreground uppercase tracking-wide leading-none truncate">
                        {order.customerName ?? tQueue("table.walkInCustomer")}
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-muted-foreground/60 font-mono tracking-wide">
                        {order.customerPhone ?? tQueue("table.noPhone")}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="font-bold text-foreground text-xs uppercase tracking-wide max-w-[200px] truncate">
                        {order.product?.name_en ?? tQueue("table.unknownProduct")}
                      </div>
                      <div className="mt-1.5 text-[11px] font-bold text-[#ffc105] uppercase tracking-wide truncate max-w-[200px]">
                        {order.category?.name_en ?? tQueue("table.noCategory")}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border whitespace-nowrap",
                        getStatusColor(order.state)
                      )}>
                        {tStates(order.state as OrderState)}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle text-center font-mono font-bold text-sm text-muted-foreground/80">
                      {order.quantity.toLocaleString(locale)}
                    </td>
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <span className="font-bold text-sm tracking-tightest text-foreground">
                        {(order.total_price + (order.appliedShippingFee || 0)).toLocaleString(locale)}
                      </span>
                      <span className="ml-1 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wide">
                        EGP
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      {order.receiptUrl ? (
                          <a
                            className="inline-flex items-center gap-2 rounded-full border border-[#ffc105]/40 bg-[#ffc105]/10 px-3 py-1.5 text-[10px] font-bold text-[#ffc105] uppercase tracking-wide hover:bg-[#ffc105] hover:text-black transition-all shadow-sm"
                            href={order.receiptUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ImageIcon size={10} /> {tQueue("table.viewReceipt")}
                          </a>
                      ) : (
                        <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">
                          {tQueue("table.pendingReceipt")}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-3 flex-nowrap">
                        <Select
                          value={order.state}
                          onValueChange={(value) => value && handleStatusChange(order._id, order.state as OrderState, value as OrderState)}
                        >
                          <SelectTrigger className="w-36 h-9 text-[10px] uppercase tracking-widest font-bold font-mono rounded-xl bg-background border-border/50 hover:bg-accent/20 focus:ring-primary/50 text-foreground">
                            <SelectValue placeholder={tStates(order.state as OrderState)} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border bg-card">
                            {([
                              "PENDING_PAYMENT_INPUT",
                              "AWAITING_VERIFICATION",
                              "CONFIRMED",
                              "READY_FOR_SHIPPING",
                              "SHIPPED",
                              "DELIVERED",
                              "RTO",
                              "STALLED_PAYMENT",
                              "FLAGGED_FRAUD",
                              "CANCELLED",
                            ] as OrderState[]).map((state) => (
                              <SelectItem
                                key={state}
                                value={state}
                                className={`text-[10px] uppercase tracking-widest font-bold cursor-pointer hover:bg-accent hover:text-accent-foreground ${state === order.state ? "opacity-50 cursor-not-allowed" : ""
                                  } ${state === "CANCELLED" || state === "RTO" || state === "FLAGGED_FRAUD"
                                    ? "text-destructive focus:text-destructive"
                                    : ""
                                  }`}
                              >
                                {tStates(state)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Link href={`/orders/${order._id}`}>
                          <Button
                            size="sm"
                            type="button"
                            className="rounded-xl h-9 px-4 text-[10px] font-black uppercase tracking-widest bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all group/btn"
                          >
                            {tQueue("table.review")}
                            <ArrowRight
                              size={12}
                              className={cn(
                                "transition-transform group-hover/btn:translate-x-1",
                                locale === "ar" ? "rotate-180 mr-2" : "ml-2",
                              )}
                            />
                          </Button>
                        </Link>
                      </div>
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
