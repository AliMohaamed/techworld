"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, Input, Label } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { permissionValues, type Permission } from "@backend/convex/lib/permissions";
import { Key, ShieldCheck, ShieldX, UserPlus, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

export default function TeamManagementPage() {
  const t = useTranslations('Team');
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
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormPassword(pass);
  };

  const toggleFormPermission = (perm: Permission) => {
    setFormPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      toast.error(t('provision.messages.required'));
      return;
    }

    try {
      await provisionStaff({
        name: formName,
        email: formEmail,
        password: formPassword,
        permissions: formPermissions,
      });
      toast.success(t('provision.messages.success'));
      setIsProvisioning(false);
      resetForm();
    } catch (error) {
      toast.error(t('provision.messages.failed'), {
        description: error instanceof Error ? error.message : t('list.messages.unknown'),
      });
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPermissions([]);
  };

  const handleUpdatePermissions = async (userId: Id<"users">, nextPermissions: Permission[]) => {
    setBusyId(userId);
    try {
      await updateStaffPermissions({
        userId,
        permissions: nextPermissions,
      });
      toast.success(t('list.messages.permUpdated'));
    } catch (error) {
      toast.error(t('list.messages.updateFailed'), {
        description: error instanceof Error ? error.message : t('list.messages.unknown'),
      });
    } finally {
      setBusyId(userId === editingId ? userId : null); // Keep busy if editing, else clear
    }
  };

  const handleToggleStatus = async (userId: Id<"users">) => {
    setBusyId(userId);
    try {
      const result = await toggleStaffStatus({ userId });
      toast.success(result.isActive ? t('list.messages.statusActivated') : t('list.messages.statusDeactivated'));
    } catch (error) {
      toast.error(t('list.messages.statusFailed'), {
        description: error instanceof Error ? error.message : t('list.messages.unknown'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const formatPermissionName = (perm: string) => {
    return t(`permissions.${perm as keyof typeof t}` as any);
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-8 shadow-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">{t('header.badge')}</p>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
              {t('header.title')}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-zinc-400 font-light">
              {t('header.description')}
            </p>
          </div>
          <Button onClick={() => { setIsProvisioning(true); generatePassword(); }} className="rounded-full h-12 px-6">
            <UserPlus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t('header.provisionButton')}
          </Button>
        </div>
      </section>

      {isProvisioning && (
        <section className="rounded-[24px] border border-white/5 bg-[#24201a] p-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-white uppercase tracking-tight">{t('provision.title')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsProvisioning(false)} className="rounded-full hover:bg-white/5">
              <X className="h-5 w-5 text-zinc-500" />
            </Button>
          </div>
          <form onSubmit={handleProvision} className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="staff-name" className="text-zinc-500 uppercase tracking-widest text-[10px]">{t('provision.form.name')}</Label>
                <Input
                  id="staff-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('provision.form.namePlaceholder')}
                  className="bg-[#1a1814] border-white/5 focus:border-[#ffc105]/50 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email" className="text-zinc-500 uppercase tracking-widest text-[10px]">{t('provision.form.email')}</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder={t('provision.form.emailPlaceholder')}
                  className="bg-[#1a1814] border-white/5 focus:border-[#ffc105]/50 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password" className="text-zinc-500 uppercase tracking-widest text-[10px]">{t('provision.form.password')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="staff-password"
                    className="font-mono bg-[#1a1814] border-white/5 focus:border-[#ffc105]/50 h-12"
                    value={formPassword}
                    readOnly
                    placeholder={t('provision.form.passwordPlaceholder')}
                    icon={<Key size={16} />}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="h-12 w-12 shrink-0 rounded-xl border-white/5 bg-[#1a1814] hover:bg-white/5">
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-zinc-500 uppercase tracking-widest text-[10px]">{t('provision.form.permissions')}</Label>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {permissionValues.map((perm) => {
                  const owned = myPermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-[11px] transition-all cursor-pointer ${
                        owned 
                          ? formPermissions.includes(perm) 
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                            : "border-white/5 bg-[#2a261f] text-zinc-400 hover:border-white/20"
                          : "border-white/5 bg-transparent text-zinc-600 cursor-not-allowed opacity-40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!owned}
                        checked={formPermissions.includes(perm)}
                        onChange={() => toggleFormPermission(perm)}
                        className="sr-only"
                      />
                      <ShieldCheck className={`h-4 w-4 shrink-0 ${owned ? "text-emerald-500" : "text-zinc-600"}`} />
                      <span className="font-medium">{formatPermissionName(perm)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" className="h-12 px-8 rounded-full">{t('provision.form.submit')}</Button>
              <Button type="button" variant="ghost" onClick={() => setIsProvisioning(false)} className="h-12 px-8 rounded-full text-zinc-500 hover:text-white uppercase tracking-widest text-[10px]">
                {t('provision.form.cancel')}
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[24px] border border-white/5 bg-[#24201a] p-8 shadow-xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('list.badge')}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white uppercase tracking-tight">{t('list.title')}</h2>
          </div>
          <span className="rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 text-xs text-zinc-400 font-mono">
            {staff ? t('list.count', { count: staff.length }) : t('list.loading')}
          </span>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="min-w-full text-left text-sm text-zinc-300 border-collapse">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 bg-[#2a261f]">
              <tr>
                <th className="sticky left-0 bg-[#24201a] py-5 px-6 whitespace-nowrap z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">{t('list.table.columns.name')}</th>
                <th className="py-5 px-4 whitespace-nowrap">{t('list.table.columns.status')}</th>
                <th className="py-5 px-4">{t('list.table.columns.permissions')}</th>
                <th className="py-5 px-6 text-right">{t('list.table.columns.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staff?.map((user) => (
                <tr key={user._id} className="group hover:bg-white/[0.01] transition-colors align-top">
                  <td className="sticky left-0 bg-[#24201a] py-6 px-6 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <div className="flex flex-col">
                      <p className="font-semibold text-white text-base">{user.name}</p>
                      <p className="text-xs text-zinc-500 font-light mt-1">{user.email}</p>
                      {me?._id === user._id && (
                        <span className="text-[9px] text-[#ffc105]/80 font-bold uppercase tracking-[.25em] mt-2 bg-[#ffc105]/10 border border-[#ffc105]/20 rounded-full px-2 py-0.5 w-fit">
                          {t('list.table.me')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] uppercase font-bold tracking-widest border transition-all ${
                      user.isActive === false
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                    }`}>
                      {user.isActive === false ? t('list.table.deactivated') : t('list.table.active')}
                    </span>
                  </td>
                  <td className="py-6 px-4">
                    <div className="flex flex-wrap gap-2">
                      {editingId === user._id ? (
                        <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                          {permissionValues.map((perm) => {
                            const owned = myPermissions.includes(perm);
                            const has = user.permissions.includes(perm);
                            return (
                              <label
                                key={perm}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-[10px] transition-all ${
                                  owned 
                                    ? has 
                                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300 shadow-sm" 
                                      : "border-white/5 text-zinc-500 hover:border-white/20"
                                    : "opacity-40"
                                } cursor-pointer`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={!owned}
                                  checked={has}
                                  className="accent-emerald-500 h-3 w-3"
                                  onChange={(e) => {
                                    const next = e.target.checked 
                                      ? [...user.permissions, perm] 
                                      : user.permissions.filter(p => p !== perm);
                                    handleUpdatePermissions(user._id, next as Permission[]);
                                  }}
                                />
                                <span className="font-medium leading-none">{formatPermissionName(perm)}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        user.permissions.map((perm) => (
                          <span key={String(perm)} className="rounded-full border border-white/10 bg-[#2a261f] px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                            {formatPermissionName(perm)}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-6 px-6 text-right">
                    <div className="flex items-center justify-end gap-3 translate-y-[-4px]">
                    {me?._id !== user._id && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`rounded-full h-8 px-4 text-[10px] uppercase tracking-widest ${editingId === user._id ? 'bg-[#ffc105]/10 text-[#ffc105]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                          disabled={busyId === user._id}
                          onClick={() => setEditingId(editingId === user._id ? null : user._id)}
                        >
                          {editingId === user._id ? t('list.table.done') : t('list.table.permissions')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={`rounded-full h-8 w-8 p-0 border-white/5 ${user.isActive ? "text-red-400/50 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20" : "text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400/20"}`}
                          disabled={busyId === user._id}
                          onClick={() => handleToggleStatus(user._id)}
                        >
                          {user.isActive ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
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
