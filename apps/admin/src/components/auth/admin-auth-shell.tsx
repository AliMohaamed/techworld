"use client";

import { usePathname } from "next/navigation";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { ShieldCheck, ShieldX, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Sidebar } from "@/components/Sidebar";
import { Sheet, SheetTrigger, SheetPortal, SheetBackdrop, SheetPopup, cn } from "@techworld/ui";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid admin email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

type SignInValues = z.infer<typeof signInSchema>;

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
          <Button className="w-full py-2 text-sm cursor-pointer font-bold" disabled={isSubmitting} type="submit">
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

  if (profile.staffUser.isActive === false) {
    return (
      <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#222,transparent_45%),#050505] px-6 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#101010] p-8 text-center shadow-2xl shadow-black/30">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">
              <ShieldX size={48} />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-white">Account Suspended</h1>
          <p className="mb-8 text-sm leading-6 text-zinc-400">
            Your staff account has been deactivated by the platform administrator. Access to the dashboard is currently restricted.
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
      <header className="border-b border-white/10 bg-black/30 sticky top-0 z-40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-transparent text-white hover:border-[#ffc105]/40 hover:text-[#ffc105] h-9 w-9 max-lg:h-11 max-lg:w-11 lg:hidden"
              )}>
                <Menu size={18} />
              </SheetTrigger>
              <SheetPortal>
                <SheetBackdrop />
                <SheetPopup side="left" className="p-0 border-r border-white/10">
                  <div className="flex flex-col h-full bg-[#050505] p-6">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="rounded-xl bg-[#ffc105] p-2 text-black">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.35em] text-[#ffc105] truncate">
                          TechWorld Ops
                        </p>
                        <h1 className="text-base font-semibold uppercase tracking-tight truncate">
                          Admin Dashboard
                        </h1>
                      </div>
                    </div>
                    <Sidebar pathname={pathname} permissions={profile.permissions} className="lg:block w-full border-none bg-transparent p-0" />
                  </div>
                </SheetPopup>
              </SheetPortal>
            </Sheet>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#ffc105] p-2 text-black hidden sm:block">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">
                  TechWorld Ops
                </p>
                <h1 className="text-lg font-semibold uppercase tracking-tight truncate max-w-[150px] sm:max-w-none">
                  Admin Dashboard
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-400">
            <span className="hidden md:inline">{profile.authUser?.email}</span>
            <Button
              onClick={() => void authClient.signOut()}
              size="sm"
              type="button"
              variant="outline"
              className="px-2 sm:px-3"
            >
              <LogOut size={14} className="sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <Sidebar pathname={pathname} permissions={profile.permissions} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
