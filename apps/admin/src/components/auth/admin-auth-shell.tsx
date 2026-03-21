"use client";

import * as React from "react";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/navigation";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { useForm } from "react-hook-form";
import { ShieldCheck, ShieldX, LogOut, Menu, Languages } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Sidebar } from "@/components/Sidebar";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  cn,
  ThemeToggle,
} from "@techworld/ui";

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
        <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
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
        caughtError instanceof Error
          ? caughtError.message
          : "Invalid admin credentials.";
      toast.error("Sign-in failed", {
        description: message,
      });
    }
  });

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-10 relative overflow-hidden">
      {/* Decorative gradients for light mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 dark:hidden" />

      <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8   transition-all">
        <div className="mb-8 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-[#ffc105]">
            Internal Admin Access
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
            Sign In
          </h1>
          <p className="text-sm leading-6 text-muted-foreground/60">
            Admin accounts are provisioned internally only. Contact the platform
            owner if you need access.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 transition-all outline-none hover:border-[#ffc105]/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50  "
              placeholder="Email address"
              type="email"
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs font-bold uppercase tracking-widest text-destructive mt-1">
                {errors.email.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <input
              className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/30 transition-all outline-none hover:border-[#ffc105]/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50  "
              placeholder="Password"
              type="password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs font-bold uppercase tracking-widest text-destructive mt-1">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <button
            className="w-full flex h-12 items-center justify-center rounded-xl bg-[#ffc105] text-sm font-black uppercase tracking-widest text-black transition-all hover:bg-foreground hover:text-background disabled:opacity-50 cursor-pointer   active:scale-[0.98]"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.auth.getCurrentStaffProfile);
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [isPending, startTransition] = React.useTransition();

  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const nextLocale = locale === "en" ? "ar" : "en";

  const handleLocaleToggle = () => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  if (profile === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        Loading staff profile...
      </div>
    );
  }

  if (!profile || !profile.staffUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 py-10 relative">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 text-center  ">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
              <ShieldX size={48} />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-black text-foreground uppercase tracking-tight">
            Access Denied
          </h1>
          <p className="mb-8 text-sm leading-6 text-muted-foreground/60">
            Your authentication session is valid, but no staff record was found
            for <strong>{profile?.authUser?.email}</strong>. Admin access must
            be provisioned by the platform owner.
          </p>
          <Button
            onClick={() => void authClient.signOut()}
            className="w-full h-12 rounded-xl text-black font-black uppercase tracking-widest"
          >
            <LogOut size={16} className="ltr:mr-2 rtl:ml-2" />
            Sign Out
          </Button>
        </div>
      </main>
    );
  }

  if (profile.staffUser.isActive === false) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 py-10 relative">
        <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 text-center  ">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-destructive/10 p-4 text-destructive">
              <ShieldX size={48} />
            </div>
          </div>
          <h1 className="mb-2 text-2xl font-black text-foreground uppercase tracking-tight">
            Account Suspended
          </h1>
          <p className="mb-8 text-sm leading-6 text-muted-foreground/60">
            Your staff account has been deactivated by the platform
            administrator. Access to the dashboard is currently restricted.
          </p>
          <Button
            onClick={() => void authClient.signOut()}
            className="w-full h-12 rounded-xl text-black font-black uppercase tracking-widest"
          >
            <LogOut size={16} className="ltr:mr-2 rtl:ml-2" />
            Sign Out
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-foreground hover:border-[#ffc105]/40 hover:text-[#ffc105] h-10 w-10 lg:hidden cursor-pointer shadow-sm transition-all"
              >
                <Menu size={20} />
              </button>
              <SheetContent
                side="left"
                className="p-0 border-r border-border w-72 bg-card"
              >
                <div className="flex flex-col h-full p-6">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="rounded-xl bg-[#ffc105] p-2 text-black   shadow-[#ffc105]/20">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] uppercase tracking-[0.35em] text-[#ffc105] truncate font-black">
                        TechWorld Ops
                      </p>
                      <h1 className="text-base font-black uppercase tracking-tight truncate text-foreground">
                        Admin Panel
                      </h1>
                    </div>
                  </div>
                  <Sidebar
                    pathname={pathname}
                    permissions={profile.permissions}
                    className="block w-full border-none bg-transparent p-0 shadow-none"
                    onItemClick={() => setIsMenuOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#ffc105] p-2 text-black hidden sm:block   shadow-[#ffc105]/10">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105] font-black">
                  TechWorld Ops
                </p>
                <h1 className="text-lg font-black uppercase tracking-tight truncate max-w-[150px] sm:max-w-none text-foreground">
                  Admin Dashboard{" "}
                 
                </h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground font-medium">
            <Button
              onClick={handleLocaleToggle}
              size="sm"
              type="button"
              variant="outline"
              disabled={isPending}
              className="px-2 sm:px-3 h-9 rounded-lg border-border hover:border-[#ffc105]/40 hover:text-[#ffc105] transition-all"
              aria-label={`Switch language to ${nextLocale === "ar" ? "Arabic" : "English"}`}
            >
              <Languages size={14} className="sm:mr-2" />
              <span className="font-black uppercase tracking-widest text-[10px]">
                {nextLocale === "ar" ? "AR" : "EN"}
              </span>
            </Button>
            <ThemeToggle />
            <div className="h-4 w-px bg-border hidden sm:block" />
            <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">
              {profile.authUser?.email}
            </span>
            <Button
              onClick={() => void authClient.signOut()}
              size="sm"
              type="button"
              variant="outline"
              className="px-2 sm:px-3 h-9 rounded-lg border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all"
            >
              <LogOut size={14} className="sm:mr-2" />
              <span className="hidden sm:inline font-black uppercase tracking-widest text-[10px]">
                Sign Out
              </span>
            </Button>
          </div>
        </div>
      </header>
      <div className="flex gap-6 px-6 py-6 transition-all min-h-[calc(100vh-80px)]">
        <Sidebar pathname={pathname} permissions={profile.permissions} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
