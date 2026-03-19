"use client";

import { usePathname } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { ShieldCheck, LogOut, Boxes, FolderTree, ClipboardList, Home } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid admin email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

type SignInValues = z.infer<typeof signInSchema>;

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/catalog/categories", label: "Categories", icon: FolderTree },
  { href: "/catalog/products", label: "Products", icon: Boxes },
] as const;

export function AdminAuthShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthLoading>
        <div className="grid min-h-screen place-items-center bg-[#050505] text-zinc-400">
          Checking admin session...
        </div>
      </AuthLoading>
      <Unauthenticated>
        <LoginScreen />
      </Unauthenticated>
      <Authenticated>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </Authenticated>
    </>
  );
}

function LoginScreen() {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const submit = handleSubmit(async (values) => {
    clearErrors();
    const parsed = signInSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "email" || field === "password") {
          setError(field, { message: issue.message, type: "manual" });
        }
      }
      return;
    }

    try {
      await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Invalid admin credentials.";
      toast.error("Sign-in failed", {
        description: message,
      });
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#222,transparent_45%),#050505] px-6 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#101010] p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffc105]">
            Internal Admin Access
          </p>
          <h1 className="text-3xl font-semibold uppercase tracking-tight text-white">
            Sign In
          </h1>
          <p className="text-sm leading-6 text-zinc-400">
            Admin accounts are provisioned internally only. Contact the platform owner if you need access.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
              placeholder="Email address"
              type="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
              placeholder="Password"
              type="password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            ) : null}
          </div>
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.auth.getCurrentStaffProfile);
  const pathname = usePathname();

  if (profile === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050505] text-zinc-400">
        Loading staff profile...
      </div>
    );
  }

  if (!profile || !profile.staffUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#222,transparent_45%),#050505] px-6 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#101010] p-8 text-center shadow-2xl shadow-black/30">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">
              <ShieldCheck size={48} />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-white">Access Denied</h1>
          <p className="mb-8 text-sm leading-6 text-zinc-400">
            Your authentication session is valid, but no staff record was found for <strong>{profile?.authUser?.email}</strong>. Admin access must be provisioned by the platform owner.
          </p>
          <Button
            onClick={() => void authClient.signOut()}
            className="w-full"
            variant="outline"
          >
            <LogOut size={14} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#ffc105] p-2 text-black">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">
                TechWorld Ops
              </p>
              <h1 className="text-lg font-semibold uppercase tracking-tight">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>{profile.authUser?.email ?? "Authenticated user"}</span>
            <Button
              onClick={() => void authClient.signOut()}
              size="sm"
              type="button"
              variant="outline"
            >
              <LogOut size={14} />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <aside className="hidden w-72 shrink-0 rounded-[24px] border border-white/10 bg-[#0b0b0b] p-5 lg:block">
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Navigation</p>
          <nav className="mt-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    isActive
                      ? "border-[#ffc105]/30 bg-[#ffc105]/10 text-[#ffc105]"
                      : "border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </a>
              );
            })}
          </nav>
          <p className="mt-8 text-[11px] uppercase tracking-[0.35em] text-zinc-500">Permissions</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.permissions.length ? (
              profile.permissions.map((permission) => (
                <span
                  key={String(permission)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
                >
                  {permission}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">No staff permissions mapped yet.</span>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
