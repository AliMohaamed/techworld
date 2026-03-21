"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button, Input, Label, Switch } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { permissionValues, type Permission } from "@backend/convex/lib/permissions";
import { Key, ShieldCheck, ShieldX, UserPlus, X } from "lucide-react";

export default function TeamManagementPage() {
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
      toast.error("Name, Email, and Password are required.");
      return;
    }

    try {
      await provisionStaff({
        name: formName,
        email: formEmail,
        password: formPassword,
        permissions: formPermissions,
      });
      toast.success("Staff provisioned successfully.");
      setIsProvisioning(false);
      resetForm();
    } catch (error) {
      toast.error("Provisioning failed", {
        description: error instanceof Error ? error.message : "Unknown error",
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
      toast.success("Permissions updated.");
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusyId(userId === editingId ? userId : null); // Keep busy if editing, else clear
    }
  };

  const handleToggleStatus = async (userId: Id<"users">) => {
    setBusyId(userId);
    try {
      const result = await toggleStaffStatus({ userId });
      toast.success(result.isActive ? "Staff account activated." : "Staff account deactivated.");
    } catch (error) {
      toast.error("Status update failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Administration</p>
            <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
              Team Management
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Provision staff accounts and delegate granular permissions. Bound checks strictly enforce that you cannot grant permissions you do not own.
            </p>
          </div>
          <Button onClick={() => { setIsProvisioning(true); generatePassword(); }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Provision Staff
          </Button>
        </div>
      </section>

      {isProvisioning && (
        <section className="rounded-[24px] border border-white/5 bg-[#24201a] p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">New Staff Account</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsProvisioning(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleProvision} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="staff-name">Full Name</Label>
                <Input
                  id="staff-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-email">Email Address</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="john@techworld.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password">Initial Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="staff-password"
                    className="font-mono"
                    value={formPassword}
                    readOnly
                    placeholder="Auto-generated"
                    icon={<Key size={16} />}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={generatePassword} className="h-12 w-12 shrink-0">
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Assign Permissions (Only what you own)</Label>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {permissionValues.map((perm) => {
                  const owned = myPermissions.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-xs transition-colors cursor-pointer ${
                        owned 
                          ? formPermissions.includes(perm) 
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" 
                            : "border-white/5 bg-[#2a261f] text-zinc-400 hover:border-white/20"
                          : "border-white/5 bg-transparent text-zinc-600 cursor-not-allowed opacity-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!owned}
                        checked={formPermissions.includes(perm)}
                        onChange={() => toggleFormPermission(perm)}
                        className="sr-only"
                      />
                      <ShieldCheck className={`h-4 w-4 ${owned ? "text-emerald-500" : "text-zinc-600"}`} />
                      {perm.replace(/_/g, " ")}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit">Complete Provisioning</Button>
              <Button type="button" variant="ghost" onClick={() => setIsProvisioning(false)}>Cancel</Button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[24px] border border-white/5 bg-[#24201a] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Staff List</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Active Team Members</h2>
          </div>
          <span className="rounded-full border border-white/5 px-3 py-1 text-xs text-zinc-300">
            {staff ? `${staff.length} users` : "Loading..."}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="sticky left-0 bg-[#24201a] pb-3 pr-4 whitespace-nowrap z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Name</th>
                <th className="pb-3 pr-4 whitespace-nowrap">Status</th>
                <th className="pb-3 pr-4">Active Permissions</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff?.map((user) => (
                <tr key={user._id} className="border-t border-white/5 align-top">
                  <td className="sticky left-0 bg-[#24201a] py-4 max-lg:py-5 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                    {me?._id === user._id && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1 block">You</span>}
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      user.isActive === false
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {user.isActive === false ? "Deactivated" : "Active"}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-wrap gap-1.5">
                      {editingId === user._id ? (
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {permissionValues.map((perm) => {
                            const owned = myPermissions.includes(perm);
                            const has = user.permissions.includes(perm);
                            return (
                              <label
                                key={perm}
                                className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-[10px] transition-colors ${
                                  owned 
                                    ? has 
                                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" 
                                      : "border-white/5 text-zinc-500 hover:border-white/20"
                                    : "opacity-40"
                                } cursor-pointer`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={!owned}
                                  checked={has}
                                  className="accent-emerald-500"
                                  onChange={(e) => {
                                    const next = e.target.checked 
                                      ? [...user.permissions, perm] 
                                      : user.permissions.filter(p => p !== perm);
                                    handleUpdatePermissions(user._id, next as Permission[]);
                                  }}
                                />
                                {perm}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        user.permissions.map((perm) => (
                          <span key={String(perm)} className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
                            {perm}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                    {me?._id !== user._id && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          disabled={busyId === user._id}
                          onClick={() => setEditingId(editingId === user._id ? null : user._id)}
                        >
                          {editingId === user._id ? "Done" : "Permissions"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={user.isActive ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"}
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
