"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label, Switch } from "@techworld/ui";
import { ShieldAlert, Settings2, Ban, Plus, Trash2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const blacklistSchema = z.object({
  phoneNumber: z.string().min(10, "Invalid phone number format"),
  reason: z.string().min(1, "Reason is required"),
});

type BlacklistForm = z.infer<typeof blacklistSchema>;

export default function SystemSettingsPage() {
  const configs = useQuery(api.settings.listAllConfigs);
  const blacklist = useQuery(api.blacklist.listBlacklist);
  
  const updateConfig = useMutation(api.settings.updateSystemConfig);
  const addToBlacklist = useMutation(api.blacklist.addToBlacklist);
  const removeFromBlacklist = useMutation(api.blacklist.removeFromBlacklist);

  const [isBlacklisting, setIsBlacklisting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting: isAddingToBlacklist } } = useForm<BlacklistForm>({
    resolver: zodResolver(blacklistSchema as any),
  });

  const onToggleMaintenance = async (enabled: boolean) => {
    try {
      await updateConfig({ key: "MAINTENANCE_MODE", value: enabled });
      toast.success(`Maintenance mode ${enabled ? "activated" : "deactivated"}`);
    } catch (e) {
      toast.error("Failed to update maintenance mode");
    }
  };

  const onToggleCod = async (enabled: boolean) => {
    try {
      await updateConfig({ key: "COD_ENABLED", value: enabled });
      toast.success(`COD payments ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      toast.error("Failed to update COD settings");
    }
  };

  const onAddBlacklist = async (data: BlacklistForm) => {
    try {
      const res = await addToBlacklist(data);
      if (res.success) {
        toast.success("Number blacklisted");
        reset();
        setIsBlacklisting(false);
      } else {
        toast.error(res.error || "Failed to blacklist number");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const onRemoveBlacklist = async (phoneNumber: string) => {
    try {
      const res = await removeFromBlacklist({ phoneNumber });
      if (res.success) {
        toast.success("Number removed from blacklist");
      } else {
        toast.error(res.error || "Failed to remove number");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const isMaintenanceMode = configs?.find(c => c.key === "MAINTENANCE_MODE")?.value === true;
  const isCodEnabled = configs?.find(c => c.key === "COD_ENABLED")?.value === true;

  return (
    <main className="space-y-8 pb-20">
      <header className="rounded-[32px] border border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(255,193,5,0.05),transparent_40%),#24201a] px-8 py-10 shadow-xl">
        <div className="flex items-center gap-3">
          <Settings2 className="text-[#ffc105]" size={20} />
          <p className="text-[11px] uppercase tracking-[0.4em] text-[#ffc105]">System Control</p>
        </div>
        <h1 className="mt-4 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
          System Settings
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 font-light">
          Manage global application states, toggle payment methods, and enforce security policies across the commerce engine.
        </p>
      </header>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Global Toggles */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 px-2">
            <ShieldAlert size={18} className="text-zinc-500" />
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">Global Toggles</h2>
          </div>
          
          <div className="overflow-hidden rounded-[28px] border border-white/5 bg-[#24201a] divide-y divide-white/5">
            <div className="flex items-center justify-between p-8 hover:bg-white/[0.01] transition-colors">
              <div className="space-y-1">
                <h3 className="font-medium text-white">Maintenance Mode</h3>
                <p className="text-xs text-zinc-500 max-w-[280px]">Take the storefront offline for all users. Admin dashboard remains accessible.</p>
              </div>
              <Switch checked={isMaintenanceMode} onChange={(e) => onToggleMaintenance(e.target.checked)} />
            </div>

            <div className="flex items-center justify-between p-8 hover:bg-white/[0.01] transition-colors">
              <div className="space-y-1">
                <h3 className="font-medium text-white">Guest COD (Cash on Delivery)</h3>
                <p className="text-xs text-zinc-500 max-w-[280px]">Allow unverified users to place orders using COD as a payment method.</p>
              </div>
              <Switch checked={isCodEnabled} onChange={(e) => onToggleCod(e.target.checked)} />
            </div>
          </div>
        </section>

        {/* Blacklist Management */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Ban size={18} className="text-zinc-500" />
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-semibold">Security Blacklist</h2>
            </div>
            <Button 
               size="sm" 
               variant="outline" 
               className="rounded-full h-8 text-[10px] uppercase border-[#ffc105]/20 text-[#ffc105]"
               onClick={() => setIsBlacklisting(!isBlacklisting)}
            >
              {isBlacklisting ? "Close" : <><Plus size={14} className="mr-1" /> Add Number</>}
            </Button>
          </div>

          <div className="rounded-[28px] border border-white/5 bg-[#24201a] overflow-hidden">
            {isBlacklisting && (
              <form onSubmit={handleSubmit(onAddBlacklist)} className="p-8 border-b border-white/5 bg-black/20 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Phone Number (E.164)</Label>
                    <Input {...register("phoneNumber")} placeholder="+201234567890" className="bg-[#1a1814]" />
                    {errors.phoneNumber && <p className="text-[10px] text-red-500">{errors.phoneNumber.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Reason for blocking</Label>
                    <Input {...register("reason")} placeholder="Fraudulent behavior" className="bg-[#1a1814]" />
                    {errors.reason && <p className="text-[10px] text-red-500">{errors.reason.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isAddingToBlacklist}>
                    {isAddingToBlacklist ? <Loader2 className="animate-spin mr-2" size={16} /> : "Enforce Block"}
                  </Button>
                </div>
              </form>
            )}

            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
              {!blacklist?.length ? (
                <div className="p-12 text-center">
                  <Ban size={32} className="mx-auto mb-4 text-zinc-800" />
                  <p className="text-sm text-zinc-600">No phone numbers are currently blacklisted.</p>
                </div>
              ) : (
                blacklist.map((entry) => (
                  <div key={entry._id} className="p-6 flex items-center justify-between group hover:bg-white/[0.01]">
                    <div>
                      <h4 className="font-mono text-white text-sm tracking-tight">{entry.phoneNumber}</h4>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">{entry.reason}</p>
                    </div>
                    <button 
                      onClick={() => onRemoveBlacklist(entry.phoneNumber)}
                      className="p-2 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
