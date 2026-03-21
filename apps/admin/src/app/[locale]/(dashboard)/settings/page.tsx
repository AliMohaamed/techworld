"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, Label, Switch } from "@techworld/ui";
import {
  ShieldAlert,
  Settings2,
  Ban,
  Plus,
  Trash2,
  Loader2,
  History as HistoryIcon,
} from "lucide-react";
import { Link } from "@/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";

const blacklistSchema = z.object({
  phoneNumber: z.string().min(10, "Invalid phone number format"),
  reason: z.string().min(1, "Reason is required"),
});

type BlacklistForm = z.infer<typeof blacklistSchema>;

export default function SystemSettingsPage() {
  const t = useTranslations("Settings.system");
  const configs = useQuery(api.settings.listAllConfigs);
  const blacklist = useQuery(api.blacklist.listBlacklist);

  const updateConfig = useMutation(api.settings.updateSystemConfig);
  const addToBlacklist = useMutation(api.blacklist.addToBlacklist);
  const removeFromBlacklist = useMutation(api.blacklist.removeFromBlacklist);

  const [isBlacklisting, setIsBlacklisting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting: isAddingToBlacklist },
  } = useForm<BlacklistForm>({
    resolver: zodResolver(blacklistSchema as any),
  });

  const onToggleMaintenance = async (enabled: boolean) => {
    try {
      await updateConfig({ key: "MAINTENANCE_MODE", value: enabled });
      toast.success(
        enabled
          ? t("blacklist.messages.maintenanceActive")
          : t("blacklist.messages.maintenanceInactive"),
      );
    } catch (e) {
      toast.error(t("blacklist.messages.maintenanceFailed"));
    }
  };

  const onToggleCod = async (enabled: boolean) => {
    try {
      await updateConfig({ key: "COD_ENABLED", value: enabled });
      toast.success(
        enabled
          ? t("blacklist.messages.codEnabled")
          : t("blacklist.messages.codDisabled"),
      );
    } catch (e) {
      toast.error(t("blacklist.messages.codFailed"));
    }
  };

  const onAddBlacklist = async (data: BlacklistForm) => {
    try {
      const res = await addToBlacklist(data);
      if (res.success) {
        toast.success(t("blacklist.messages.blacklistSuccess"));
        reset();
        setIsBlacklisting(false);
      } else {
        toast.error(res.error || t("blacklist.messages.blacklistFailed"));
      }
    } catch (e) {
      toast.error(t("blacklist.messages.error"));
    }
  };

  const onRemoveBlacklist = async (phoneNumber: string) => {
    try {
      const res = await removeFromBlacklist({ phoneNumber });
      if (res.success) {
        toast.success(t("blacklist.messages.removeSuccess"));
      } else {
        toast.error(res.error || t("blacklist.messages.removeFailed"));
      }
    } catch (e) {
      toast.error(t("blacklist.messages.error"));
    }
  };

  const isMaintenanceMode =
    configs?.find((c) => c.key === "MAINTENANCE_MODE")?.value === true;
  const isCodEnabled =
    configs?.find((c) => c.key === "COD_ENABLED")?.value === true;

  return (
    <main className="space-y-8 pb-20 bg-background transition-colors">
      <header className="rounded-[32px] border border-border bg-card px-8 py-10 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,193,5,0.05),transparent_40%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Settings2 className="text-[#ffc105]" size={20} />
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                {t("badge")}
              </p>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tightest text-foreground leading-tight md:text-5xl italic">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground font-medium">
              {t("description")}
            </p>
          </div>
          <Link href={"/settings/audit" as any}>
            <Button
              variant="outline"
              className="rounded-xl border-border bg-accent/50 hover:bg-[#ffc105] hover:text-black hover:border-[#ffc105] transition-all font-black uppercase tracking-widest text-[10px] h-11 px-6 shadow-sm"
            >
              <HistoryIcon size={16} className="ltr:mr-2 rtl:ml-2" />
              {t("auditLogButton")}
            </Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        {/* Global Toggles */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-4">
            <ShieldAlert size={18} className="text-muted-foreground/40" />
            <h2 className="text-[10px] uppercase font-black tracking-[0.4em] text-muted-foreground/30">
              {t("toggles.title")}
            </h2>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-border bg-card divide-y divide-border   transition-all">
            <div className="flex items-center justify-between p-8 hover:bg-accent/30 transition-colors group">
              <div className="space-y-2">
                <h3 className="font-black text-foreground uppercase tracking-tight italic transition-colors group-hover:text-[#ffc105]">
                  {t("toggles.maintenance.title")}
                </h3>
                <p className="text-xs text-muted-foreground/60 max-w-[320px] font-medium leading-relaxed">
                  {t("toggles.maintenance.description")}
                </p>
              </div>
              <Switch
                checked={isMaintenanceMode}
                onChange={(e) => onToggleMaintenance(e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between p-8 hover:bg-accent/30 transition-colors group">
              <div className="space-y-2">
                <h3 className="font-black text-foreground uppercase tracking-tight italic transition-colors group-hover:text-[#ffc105]">
                  {t("toggles.cod.title")}
                </h3>
                <p className="text-xs text-muted-foreground/60 max-w-[320px] font-medium leading-relaxed">
                  {t("toggles.cod.description")}
                </p>
              </div>
              <Switch
                checked={isCodEnabled}
                onChange={(e) => onToggleCod(e.target.checked)}
              />
            </div>
          </div>
        </section>

        {/* Blacklist Management */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Ban size={18} className="text-muted-foreground/40" />
              <h2 className="text-[10px] uppercase font-black tracking-[0.4em] text-muted-foreground/30">
                {t("blacklist.title")}
              </h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full h-8 text-[9px] font-black uppercase tracking-widest border-[#ffc105]/20 text-[#ffc105] hover:bg-[#ffc105]/10"
              onClick={() => setIsBlacklisting(!isBlacklisting)}
            >
              {isBlacklisting ? (
                t("blacklist.close")
              ) : (
                <>
                  <Plus size={12} className="ltr:mr-1 rtl:ml-1" />{" "}
                  {t("blacklist.addNumber")}
                </>
              )}
            </Button>
          </div>

          <div className="rounded-[32px] border border-border bg-card overflow-hidden   transition-all">
            {isBlacklisting && (
              <form
                onSubmit={handleSubmit(onAddBlacklist)}
                className="p-10 border-b border-border bg-accent/20 animate-in slide-in-from-top-4 duration-500"
              >
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {t("blacklist.form.phoneLabel")}
                    </Label>
                    <Input
                      {...register("phoneNumber")}
                      placeholder={t("blacklist.form.phonePlaceholder")}
                      className="rounded-xl bg-background border-border h-12 text-sm font-black tracking-tight"
                    />
                    {errors.phoneNumber && (
                      <p className="text-[10px] font-black text-destructive uppercase tracking-widest mt-1">
                        {t("blacklist.form.errors.invalidPhone")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {t("blacklist.form.reasonLabel")}
                    </Label>
                    <Input
                      {...register("reason")}
                      placeholder={t("blacklist.form.reasonPlaceholder")}
                      className="rounded-xl bg-background border-border h-12 text-sm font-medium"
                    />
                    {errors.reason && (
                      <p className="text-[10px] font-black text-destructive uppercase tracking-widest mt-1">
                        {t("blacklist.form.errors.reasonRequired")}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-[#ffc105] text-black font-black uppercase tracking-widest hover:bg-foreground hover:text-background transition-all   shadow-[#ffc105]/10"
                    disabled={isAddingToBlacklist}
                  >
                    {isAddingToBlacklist ? (
                      <Loader2
                        className="animate-spin ltr:mr-2 rtl:ml-2"
                        size={16}
                      />
                    ) : (
                      t("blacklist.form.submit")
                    )}
                  </Button>
                </div>
              </form>
            )}

            <div className="divide-y divide-border max-h-[440px] overflow-y-auto scrollbar-hide">
              {!blacklist?.length ? (
                <div className="p-16 text-center">
                  <Ban
                    size={48}
                    className="mx-auto mb-6 text-muted-foreground/10"
                  />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/20 italic">
                    {t("blacklist.empty")}
                  </p>
                </div>
              ) : (
                blacklist.map((entry) => (
                  <div
                    key={entry._id}
                    className="p-8 flex items-center justify-between group hover:bg-accent/30 transition-all"
                  >
                    <div className="space-y-1">
                      <h4 className="font-black text-foreground text-sm tracking-widest uppercase italic">
                        {entry.phoneNumber}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-destructive/40" />
                        <p className="text-[9px] text-muted-foreground/60 font-black uppercase tracking-widest">
                          {entry.reason}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveBlacklist(entry.phoneNumber)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-destructive/5 text-destructive/40 hover:bg-destructive hover:text-destructive-foreground transition-all opacity-0 group-hover:opacity-100 shadow-sm"
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
