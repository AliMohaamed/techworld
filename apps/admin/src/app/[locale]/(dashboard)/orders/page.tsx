"use client";

import { useState } from "react";
import { Link } from "@/navigation";
import { useQuery, useMutation } from "convex/react";
import { ArrowRight, ShieldAlert, ShoppingCart, Loader2, ChevronDown } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Id } from "@backend/convex/_generated/dataModel";
import { Button } from "@techworld/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@techworld/ui";
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
  
  const updateGenericStatus = useMutation(api.orders.updateGenericStatus);
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [updatingId, setUpdatingId] = useState<Id<"orders"> | null>(null);

  const visibleOrders = orders ? orders.filter(o => filter === "ALL" || o.state === filter) : [];
  
  const handleStatusChange = async (orderId: Id<"orders">, currentState: OrderState, newState: OrderState) => {
    if (currentState === newState) return;
    
    setUpdatingId(orderId);
    try {
      if (currentState === "AWAITING_VERIFICATION" && (newState === "CONFIRMED" || newState === "CANCELLED" || newState === "STALLED_PAYMENT")) {
        await updateOrderStatus({ orderId, newState });
      } else {
        await updateGenericStatus({ orderId, newState });
      }
      toast.success(`Order status updated to ${tStates(newState)}.`);
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error.message || "Invalid state transition.",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (state: string) => {
    switch(state) {
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
      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="text-[#ffc105]" size={20} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
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
          <div className="flex flex-wrap items-center gap-2">
            {states.map(s => (
              <button 
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all border",
                  filter === s ? "bg-[#ffc105] text-black border-[#ffc105]" : "bg-card text-muted-foreground/60 border-border hover:bg-accent hover:text-foreground"
                )}
              >
                {s === "ALL" ? tQueue("table.filters.ALL") : tStates(s as OrderState)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-xl group transition-all hover:border-[#ffc105]/10">
        <div className="border-b border-border bg-accent/30 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-1 bg-[#ffc105] rounded-full" />
            <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
              {tQueue("table.title")}
            </h2>
          </div>
          <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
            Live Buffer • {visibleOrders.length} Records
          </div>
        </div>

        {profile === undefined || (canViewOrders && orders === undefined) ? (
          <div className="p-20 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#ffc105]" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              {tQueue("table.loading")}
            </p>
          </div>
        ) : !canViewOrders ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert size={32} className="text-destructive" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-destructive/60">
              {tQueue("table.noPermission")}
            </p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#ffc105]/10 flex items-center justify-center">
              <ShieldAlert size={32} className="text-[#ffc105]" />
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-[#ffc105]/60">
              {tQueue("table.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 border-b border-border">
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
                      <div className="font-black text-foreground uppercase tracking-tightest leading-none truncate">
                        {order.customerName ?? tQueue("table.walkInCustomer")}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-muted-foreground/40 font-mono tracking-wider">
                        {order.customerPhone ?? tQueue("table.noPhone")}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <div className="font-bold text-foreground text-xs uppercase tracking-tightest max-w-[200px] truncate">
                        {order.product?.name_en ?? tQueue("table.unknownProduct")}
                      </div>
                      <div className="mt-1.5 text-[10px] font-black text-[#ffc105] uppercase tracking-widest truncate max-w-[200px]">
                        {order.category?.name_en ?? tQueue("table.noCategory")}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap",
                        getStatusColor(order.state)
                      )}>
                        {tStates(order.state as OrderState)}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle text-center font-mono font-black text-sm text-muted-foreground">
                      {order.quantity.toLocaleString(locale)}
                    </td>
                    <td className="py-4 px-4 align-middle whitespace-nowrap">
                      <span className="font-black text-sm tracking-tightest text-foreground">
                        {order.total_price.toLocaleString(locale)}
                      </span>
                      <span className="ml-1 text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest">
                        EGP
                      </span>
                    </td>
                    <td className="py-4 px-4 align-middle">
                      {order.receiptUrl ? (
                        <a
                          className="inline-flex items-center gap-2 rounded-full border border-[#ffc105]/20 bg-[#ffc105]/5 px-3 py-1.5 text-[9px] font-black text-[#ffc105] uppercase tracking-widest hover:bg-[#ffc105] hover:text-black transition-all shadow-sm"
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
                          disabled={!canManageShipping && order.state !== "AWAITING_VERIFICATION"}
                        >
                          <SelectTrigger className="w-36 h-9 text-[10px] uppercase tracking-widest font-bold font-mono rounded-xl bg-background border-border/50 hover:bg-accent/20 focus:ring-primary/50 text-foreground">
                            <SelectValue placeholder={tStates(order.state as OrderState)} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border bg-card">
                            <SelectItem value={order.state} disabled className="text-[10px] uppercase tracking-widest font-bold cursor-not-allowed opacity-50 transition-colors">
                              {tStates(order.state as OrderState)}
                            </SelectItem>
                            {order.state === "AWAITING_VERIFICATION" && (
                              <>
                                <SelectItem value="CONFIRMED" className="text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent hover:text-accent-foreground">{tStates("CONFIRMED")}</SelectItem>
                                <SelectItem value="CANCELLED" className="text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent hover:text-accent-foreground text-destructive focus:text-destructive">{tStates("CANCELLED")}</SelectItem>
                                <SelectItem value="STALLED_PAYMENT" className="text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent hover:text-accent-foreground">{tStates("STALLED_PAYMENT")}</SelectItem>
                              </>
                            )}
                            
                            {order.state === "CONFIRMED" && (
                              <>
                                <SelectItem value="READY_FOR_SHIPPING" className="text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent hover:text-accent-foreground">{tStates("READY_FOR_SHIPPING")}</SelectItem>
                                <SelectItem value="CANCELLED" className="text-[10px] uppercase tracking-widest cursor-pointer text-destructive focus:text-destructive hover:bg-accent">{tStates("CANCELLED")}</SelectItem>
                              </>
                            )}
                            
                            {order.state === "READY_FOR_SHIPPING" && (
                              <>
                                <SelectItem value="SHIPPED" className="text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent hover:text-accent-foreground">{tStates("SHIPPED")}</SelectItem>
                                <SelectItem value="CANCELLED" className="text-[10px] uppercase tracking-widest cursor-pointer text-destructive focus:text-destructive hover:bg-accent">{tStates("CANCELLED")}</SelectItem>
                              </>
                            )}
                            
                            {order.state === "SHIPPED" && (
                              <>
                                <SelectItem value="DELIVERED" className="text-[10px] uppercase tracking-widest cursor-pointer hover:bg-accent hover:text-accent-foreground">{tStates("DELIVERED")}</SelectItem>
                                <SelectItem value="RTO" className="text-[10px] uppercase tracking-widest cursor-pointer text-destructive focus:text-destructive hover:bg-accent">{tStates("RTO")}</SelectItem>
                                <SelectItem value="CANCELLED" className="text-[10px] uppercase tracking-widest cursor-pointer text-destructive focus:text-destructive hover:bg-accent">{tStates("CANCELLED")}</SelectItem>
                              </>
                            )}
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
