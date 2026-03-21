"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, Input, Label, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import {
  permissionValues,
  type Permission,
} from "@backend/convex/lib/permissions";
import {
  Key,
  ShieldCheck,
  ShieldX,
  UserPlus,
  X,
  Users,
  Shield,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function TeamManagementPage() {
  const t = useTranslations("Team");
  const locale = useLocale();
  const staff = useQuery(api.users.listStaff);
  const me = useQuery(api.users.getMe);
  const provisionStaff = useMutation(api.users.provisionStaff);
  const updateStaffPermissions = useMutation(api.users.updateStaffPermissions);
  const toggleStaffStatus = useMutation(api.users.toggleStaffStatus);

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"users"> | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPermissions, setFormPermissions] = useState<Permission[]>([]);

  const myPermissions = useMemo(() => me?.permissions ?? [], [me]);

  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pass = "";
    for (let i = 0; i < 12; i++)
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormPassword(pass);
  };

  const toggleFormPermission = (perm: Permission) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      toast.error(t("provision.messages.required"));
      return;
    }

    try {
      await provisionStaff({
        name: formName,
        email: formEmail,
        password: formPassword,
        permissions: formPermissions,
      });
      toast.success(t("provision.messages.success"));
      setIsProvisioning(false);
      resetForm();
    } catch (error) {
      toast.error(t("provision.messages.failed"), {
        description:
          error instanceof Error ? error.message : t("list.messages.unknown"),
      });
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPermissions([]);
  };

  const handleUpdatePermissions = async (
    userId: Id<"users">,
    nextPermissions: Permission[],
  ) => {
    setBusyId(userId);
    try {
      await updateStaffPermissions({
        userId,
        permissions: nextPermissions,
      });
      toast.success(t("list.messages.permUpdated"));
    } catch (error) {
      toast.error(t("list.messages.updateFailed"), {
        description:
          error instanceof Error ? error.message : t("list.messages.unknown"),
      });
    } finally {
      setBusyId(userId === editingId ? userId : null); // Keep busy if editing, else clear
    }
  };

  const handleToggleStatus = async (userId: Id<"users">) => {
    setBusyId(userId);
    try {
      const result = await toggleStaffStatus({ userId });
      toast.success(
        result.isActive
          ? t("list.messages.statusActivated")
          : t("list.messages.statusDeactivated"),
      );
    } catch (error) {
      toast.error(t("list.messages.statusFailed"), {
        description:
          error instanceof Error ? error.message : t("list.messages.unknown"),
      });
    } finally {
      setBusyId(null);
    }
  };

  const formatPermissionName = (perm: string) => {
    return t(`permissions.${perm as keyof typeof t}` as any);
  };

  return (
    <main className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12  ">
        {/* Decorative background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="text-[#ffc105]" size={20} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                {t("header.badge")}
              </p>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight italic">
              {t("header.title")}
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/60">
              {t("header.description")}
            </p>
          </div>
          <Button
            onClick={() => {
              setIsProvisioning(true);
              generatePassword();
            }}
            className="rounded-2xl h-14 px-8 bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all shadow-xl font-black uppercase tracking-widest text-[10px]"
          >
            <UserPlus className="ltr:mr-3 rtl:ml-3 h-4 w-4" />
            {t("header.provisionButton")}
          </Button>
        </div>
      </section>

      {isProvisioning && (
        <section className="relative overflow-hidden rounded-[40px] border border-border bg-card p-10 animate-in fade-in slide-in-from-top-4 duration-500  ">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-primary" size={20} />
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tightest italic">
                {t("provision.title")}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProvisioning(false)}
              className="rounded-full h-10 w-10 p-0 hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <form onSubmit={handleProvision} className="space-y-10 relative z-10">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-3">
                <Label
                  htmlFor="staff-name"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40"
                >
                  {t("provision.form.name")}
                </Label>
                <Input
                  id="staff-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("provision.form.namePlaceholder")}
                  className="rounded-xl bg-background border-border h-12 font-black uppercase tracking-tightest focus:border-primary/40 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="staff-email"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40"
                >
                  {t("provision.form.email")}
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder={t("provision.form.emailPlaceholder")}
                  className="rounded-xl bg-background border-border h-12 font-black tracking-tightest focus:border-primary/40 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-3">
                <Label
                  htmlFor="staff-password"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40"
                >
                  {t("provision.form.password")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="staff-password"
                    className="rounded-xl bg-background border-border h-12 font-mono text-xs tracking-widest uppercase focus:border-primary/40 focus:ring-primary/10"
                    value={formPassword}
                    readOnly
                    placeholder={t("provision.form.passwordPlaceholder")}
                    icon={
                      <Lock size={14} className="text-muted-foreground/30" />
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    className="h-12 w-12 shrink-0 rounded-xl border-border bg-background hover:bg-accent transition-all"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                <Shield size={12} /> {t("provision.form.permissions")}
              </Label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {permissionValues.map((perm) => {
                  const owned = myPermissions.includes(perm);
                  const selected = formPermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm group",
                        owned
                          ? selected
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 dark:text-emerald-300"
                            : "border-border bg-background text-muted-foreground/40 hover:border-emerald-500/20 hover:text-emerald-500/60"
                          : "border-border bg-background/50 text-muted-foreground/20 cursor-not-allowed opacity-40 grayscale",
                      )}
                    >
                      <input
                        type="checkbox"
                        disabled={!owned}
                        checked={selected}
                        onChange={() => toggleFormPermission(perm)}
                        className="sr-only"
                      />
                      <ShieldCheck
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-active:scale-90",
                          owned
                            ? selected
                              ? "text-emerald-500"
                              : "text-muted-foreground/20"
                            : "text-muted-foreground/10",
                        )}
                      />
                      <span className="leading-tight">
                        {formatPermissionName(perm)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                type="submit"
                className="h-14 px-10 rounded-2xl bg-[#ffc105] text-black hover:bg-foreground hover:text-background transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[10px]"
              >
                {t("provision.form.submit")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsProvisioning(false)}
                className="h-14 px-10 rounded-2xl text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all font-black uppercase tracking-widest text-[10px]"
              >
                {t("provision.form.cancel")}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-[40px] border border-border bg-card   group transition-all hover:border-[#ffc105]/10">
        <div className="border-b border-border bg-accent/30 px-10 py-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-6 w-1 bg-[#ffc105] rounded-full" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                {t("list.badge")}
              </p>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tightest italic leading-none mt-1">
                {t("list.title")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border bg-background px-5 py-2 text-[10px] font-black text-muted-foreground/60 font-mono tracking-widest uppercase  ">
              {staff
                ? t("list.count", { count: staff.length })
                : t("list.loading")}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px] scrollbar-hide">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground/40 border-b border-border">
              <tr>
                <th className="sticky left-0 bg-card py-4 px-6 z-10">
                  {t("list.table.columns.name")}
                </th>
                <th className="py-4 px-4 whitespace-nowrap">
                  {t("list.table.columns.status")}
                </th>
                <th className="py-4 px-4">
                  {t("list.table.columns.permissions")}
                </th>
                <th className="py-4 px-6 text-right whitespace-nowrap">
                  {t("list.table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {staff?.map((user) => (
                <tr
                  key={user._id}
                  className="group/row hover:bg-accent/20 transition-all align-top"
                >
                  <td className="sticky left-0 bg-card py-4 px-6 z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                    <div className="flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity" />
                      <p className="font-black text-foreground text-lg uppercase tracking-tightest leading-none italic">
                        {user.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 font-mono tracking-widest mt-2 uppercase">
                        {user.email}
                      </p>
                      {me?._id === user._id && (
                        <span className="flex items-center gap-1.5 text-[9px] text-[#ffc105] font-black uppercase tracking-[.3em] mt-3 bg-[#ffc105]/10 border border-[#ffc105]/20 rounded-full px-3 py-1 w-fit italic shadow-sm">
                          <CheckCircle2 size={10} /> {t("list.table.me")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-4 align-middle">
                    <span
                      className={cn(
                        "px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all shadow-sm",
                        user.isActive === false
                          ? "bg-destructive/10 text-destructive border-destructive/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      )}
                    >
                      {user.isActive === false
                        ? t("list.table.deactivated")
                        : t("list.table.active")}
                    </span>
                  </td>
                  <td className="py-6 px-4 align-middle">
                    <div className="flex flex-wrap gap-2.5 max-w-lg">
                      {editingId === user._id ? (
                        <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 w-full animate-in fade-in slide-in-from-top-1 duration-300">
                          {permissionValues.map((perm) => {
                            const owned = myPermissions.includes(perm);
                            const has = user.permissions.includes(perm);
                            return (
                              <label
                                key={perm}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all shadow-sm group/perm",
                                  owned
                                    ? has
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                      : "border-border bg-background text-muted-foreground/30 hover:border-emerald-500/20"
                                    : "opacity-30 grayscale cursor-not-allowed",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  disabled={!owned}
                                  checked={has}
                                  className="sr-only"
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...user.permissions, perm]
                                      : user.permissions.filter(
                                          (p) => p !== perm,
                                        );
                                    handleUpdatePermissions(
                                      user._id,
                                      next as Permission[],
                                    );
                                  }}
                                />
                                <ShieldCheck
                                  size={12}
                                  className={
                                    owned
                                      ? has
                                        ? "text-emerald-500"
                                        : "text-muted-foreground/20"
                                      : "text-muted-foreground/10"
                                  }
                                />
                                <span className="leading-tight">
                                  {formatPermissionName(perm)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        user.permissions.map((perm) => (
                          <span
                            key={String(perm)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 shadow-sm transition-all hover:border-[#ffc105]/30 hover:text-foreground"
                          >
                            <div className="h-1 w-1 rounded-full bg-emerald-500/40" />{" "}
                            {formatPermissionName(perm)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 align-middle text-right">
                    <div className="flex items-center justify-end gap-3">
                      {me?._id !== user._id && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              "rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-[0.2em] italic shadow-sm transition-all  ",
                              editingId === user._id
                                ? "bg-[#ffc105] text-black hover:bg-foreground hover:text-background"
                                : "text-muted-foreground/40 hover:text-foreground hover:bg-accent",
                            )}
                            disabled={busyId === user._id}
                            onClick={() =>
                              setEditingId(
                                editingId === user._id ? null : user._id,
                              )
                            }
                          >
                            {editingId === user._id
                              ? t("list.table.done")
                              : t("list.table.permissions")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={cn(
                              "rounded-xl h-10 w-10 p-0 transition-all border-border shadow-sm   group/status",
                              user.isActive
                                ? "text-destructive/30 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20"
                                : "text-emerald-500/30 hover:text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/20",
                            )}
                            disabled={busyId === user._id}
                            onClick={() => handleToggleStatus(user._id)}
                          >
                            {user.isActive ? (
                              <ShieldX size={16} />
                            ) : (
                              <ShieldCheck size={16} />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
