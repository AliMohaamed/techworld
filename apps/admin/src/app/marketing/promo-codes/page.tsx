"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { PromoCodeFormSheet } from "@/components/marketing/PromoCodeFormSheet";
import { Tag, Calendar, Users as UsersIcon, CheckCircle2, XCircle, Trash2, Power } from "lucide-react";

export default function PromoCodesPage() {
  const promoCodes = useQuery(api.promoCodes.list);
  const toggleActive = useMutation(api.promoCodes.toggleActive);
  const removePromo = useMutation(api.promoCodes.remove);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"promo_codes"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"promo_codes"> | null>(null);

  const editingPromo = useMemo(
    () => promoCodes?.find((p) => p._id === editingId) ?? null,
    [promoCodes, editingId]
  );

  const openCreateSheet = () => {
    setEditingId(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (id: Id<"promo_codes">) => {
    setEditingId(id);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setEditingId(null);
    setIsSheetOpen(false);
  };

  const onToggle = async (id: Id<"promo_codes">, currentStatus: boolean) => {
    setBusyId(id);
    try {
      await toggleActive({ id, isActive: !currentStatus });
      toast.success(currentStatus ? "Promo code deactivated" : "Promo code activated");
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: Id<"promo_codes">) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;
    setBusyId(id);
    try {
      await removePromo({ id });
      toast.success("Promo code deleted");
    } catch (error) {
      toast.error("Failed to delete promo code");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-3xl border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-primary">Marketing</p>
            <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
              Promo Codes Engine
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Create and manage discount codes, usage limits, and expiration dates. Mutually exclusive from bundles per Phase 10 rules.
            </p>
          </div>
          <Button type="button" onClick={openCreateSheet}>
            Create New discount
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/5 bg-[#24201a] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Active Discounts</p>
            <h2 className="mt-2 text-xl font-semibold text-white">All Promo Codes</h2>
          </div>
          <span className="rounded-full border border-white/5 px-3 py-1 text-xs text-zinc-300">
            {promoCodes ? `${promoCodes.length} total` : "Loading..."}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Type & Value</th>
                <th className="pb-3 pr-4">Usage</th>
                <th className="pb-3 pr-4">Expiration</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promoCodes?.map((promo) => {
                const isExpired = promo.expiry_date && Date.now() > promo.expiry_date;
                const isLimitReached = promo.current_uses >= promo.max_uses;

                return (
                  <tr key={promo._id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-primary" />
                        <span className="font-mono font-bold text-white tracking-wider">{promo.code}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-white">
                        {promo.type === "fixed" ? `EGP ${promo.value}` : 
                         promo.type === "percentage" ? `${promo.value}%` : "Free Shipping"}
                      </p>
                      {promo.type === "percentage" && promo.max_discount_amount && (
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase">Capped at EGP {promo.max_discount_amount}</p>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <UsersIcon size={14} className="text-zinc-500" />
                        <span>{promo.current_uses} / {promo.max_uses}</span>
                      </div>
                      <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-white/5">
                         <div 
                           className={cn("h-full transition-all", isLimitReached ? "bg-red-500" : "bg-primary")} 
                           style={{ width: `${Math.min(100, (promo.current_uses / promo.max_uses) * 100)}%` }} 
                         />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className={cn(isExpired ? "text-red-400" : "text-zinc-500")} />
                        <span className={cn(isExpired && "text-red-400 font-medium")}>
                           {promo.expiry_date ? new Date(promo.expiry_date).toLocaleDateString() : "Never"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                       {promo.isActive && !isExpired && !isLimitReached ? (
                         <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 uppercase">
                           <CheckCircle2 size={10} /> Active
                         </span>
                       ) : (
                         <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-medium text-red-300 uppercase">
                           <XCircle size={10} /> {isExpired ? "Expired" : isLimitReached ? "Full" : "Inactive"}
                         </span>
                       )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 hover:bg-white/5"
                          onClick={() => openEditSheet(promo._id)}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={cn("h-8 w-8 p-0 hover:bg-white/5", promo.isActive ? "text-amber-500" : "text-emerald-500")}
                          disabled={busyId === promo._id}
                          onClick={() => onToggle(promo._id, promo.isActive)}
                        >
                          <Power size={14} />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          disabled={busyId === promo._id}
                          onClick={() => onDelete(promo._id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!promoCodes && (
                 <tr><td colSpan={6} className="py-8 text-center text-zinc-500">Loading promo codes...</td></tr>
              )}
              {promoCodes?.length === 0 && (
                 <tr><td colSpan={6} className="py-8 text-center text-zinc-500 italic">No promo codes found. Create your first one to drive sales!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PromoCodeFormSheet
        open={isSheetOpen}
        onClose={closeSheet}
        promoCode={editingPromo}
      />
    </main>
  );
}
