"use client";

import { FormEvent, useState } from "react";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

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
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signUp") {
        await authClient.signUp.email({
          email,
          password,
          name,
        });
      } else {
        await authClient.signIn.email({
          email,
          password,
        });
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Authentication failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#222,transparent_45%),#050505] px-6 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#101010] p-8 shadow-2xl shadow-black/30">
        <div className="mb-8 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffc105]">
            Admin Access
          </p>
          <h1 className="text-3xl font-semibold uppercase tracking-tight text-white">
            {mode === "signIn" ? "Sign In" : "Create Admin Session"}
          </h1>
          <p className="text-sm leading-6 text-zinc-400">
            Convex Better Auth is wired for the admin workspace. Permissions remain enforced in Convex.
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "signUp" ? (
            <input
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Submitting..."
              : mode === "signIn"
                ? "Sign In"
                : "Create Account"}
          </Button>
        </form>

        <div className="mt-4">
          <Button
            className="w-full"
            onClick={() => setMode((current) => (current === "signIn" ? "signUp" : "signIn"))}
            type="button"
            variant="ghost"
          >
            {mode === "signIn"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const profile = useQuery(api.auth.getCurrentStaffProfile);

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
            <span>{profile?.authUser?.email ?? "Authenticated user"}</span>
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
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            Permissions
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(profile?.permissions ?? []).length ? (
              profile?.permissions.map((permission) => (
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

