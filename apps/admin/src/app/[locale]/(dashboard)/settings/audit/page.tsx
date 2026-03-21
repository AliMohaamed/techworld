"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@techworld/ui";
import {
  History as HistoryIcon,
  Terminal,
  Calendar,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Link } from "@/navigation";
import { useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";

const LOGS_PER_PAGE = 20;

export default function SettingsAuditPage() {
  const t = useTranslations("Settings.audit");
  const locale = useLocale();
  const me = useQuery(api.users.getMe);
  const canViewLogs = me?.permissions?.includes("VIEW_AUDIT_LOGS");

  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.paginatedList,
    canViewLogs ? { actionType: "UPDATE_SYSTEM_CONFIG" } : ("skip" as any),
    { initialNumItems: LOGS_PER_PAGE },
  );

  if (me && !canViewLogs) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 text-center p-12 bg-background transition-colors">
        <div className="relative">
          <div className="absolute inset-0 blur-3xl bg-destructive/10 rounded-full" />
          <div className="relative h-24 w-24 bg-card border border-border rounded-[32px] flex items-center justify-center  ">
            <ShieldCheck size={56} className="text-destructive/50" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight italic">
            {t("denied.title")}
          </h2>
          <p className="max-w-md text-muted-foreground/60 leading-relaxed font-bold uppercase tracking-widest text-[9px]">
            {t("denied.message", { permission: "VIEW_AUDIT_LOGS" })}
          </p>
        </div>
        <Link href="/settings">
          <Button
            variant="outline"
            className="mt-8 rounded-xl h-12 px-8 border-border bg-accent text-foreground hover:bg-[#ffc105] hover:text-black hover:border-[#ffc105] transition-all font-black uppercase tracking-widest text-[10px]"
          >
            <ArrowLeft
              size={16}
              className={locale === "ar" ? "ml-3 rotate-180" : "mr-3"}
            />
            {t("backButton")}
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-20 bg-background transition-colors">
      <header className="rounded-[32px] border border-border bg-card px-8 py-10 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.05),transparent_40%)]" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-[#ffc105]" size={20} />
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                {t("badge")}
              </p>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tightest text-foreground leading-tight md:text-5xl italic">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground font-medium">
              {t("description")}
            </p>
          </div>
          <Link href="/settings">
            <Button
              variant="outline"
              className="rounded-xl h-11 px-6 border-border bg-accent/50 text-foreground hover:bg-[#ffc105] hover:text-black hover:border-[#ffc105] transition-all font-black uppercase tracking-widest text-[10px] shadow-sm"
            >
              <ArrowLeft
                size={16}
                className={locale === "ar" ? "ml-2 rotate-180" : "mr-2"}
              />
              {t("backButton")}
            </Button>
          </Link>
        </div>
      </header>

      <section className="space-y-8 transition-all">
        <div className="rounded-[40px] border border-border bg-card overflow-hidden   transition-all">
          <div className="overflow-x-auto min-h-[500px] scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/20">
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
                    {t("table.columns.key")}
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black whitespace-nowrap">
                    {t("table.columns.updatedBy")}
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
                    {t("table.columns.newValue")}
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
                    {t("table.columns.timestamp")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((log) => (
                  <tr
                    key={log._id}
                    className="group hover:bg-accent/30 transition-all"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center border border-border group-hover:border-[#ffc105] group-hover:bg-[#ffc105]/5 transition-all shrink-0 shadow-sm">
                          <Terminal
                            size={14}
                            className="text-[#ffc105] transition-transform group-hover:scale-110"
                          />
                        </div>
                        <p className="text-sm font-mono text-foreground tracking-tightest font-bold uppercase transition-colors group-hover:text-[#ffc105] italic">
                          {log.entityId}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-[10px] text-muted-foreground/60 font-black uppercase border border-border overflow-hidden transition-all group-hover:scale-110 group-hover:border-[#ffc105]/20  ">
                          {log.userName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm text-foreground font-black uppercase tracking-tightest leading-none">
                            {log.userName}
                          </p>
                          <p className="text-[10px] text-muted-foreground/40 mt-1 font-medium tracking-tight lowercase">
                            {log.userEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <pre className="text-[10px] font-mono text-muted-foreground bg-accent/30 p-4 rounded-xl border border-border font-medium leading-[1.8]   max-w-sm overflow-x-auto scrollbar-hide">
                        {JSON.stringify(
                          (log.changes as any)?.value ?? log.changes,
                          null,
                          2,
                        )}
                      </pre>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-3 text-muted-foreground/40 font-black tracking-widest text-[10px] uppercase">
                        <Calendar
                          size={14}
                          className="text-muted-foreground/20 group-hover:text-[#ffc105] transition-colors"
                        />
                        <span className="tabular-nums">
                          {format(log.timestamp, "MMM dd, HH:mm:ss")}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {status === "LoadingFirstPage" && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30 gap-6">
                <Terminal
                  className="animate-pulse text-[#ffc105] blur-[1px]"
                  size={48}
                />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">
                  {t("table.loading")}
                </p>
              </div>
            )}

            {!results.length && status !== "LoadingFirstPage" && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/10">
                <HistoryIcon size={64} className="mb-6 opacity-5" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">
                  {t("table.empty")}
                </p>
              </div>
            )}
          </div>

          <div className="p-10 border-t border-border bg-accent/5">
            <Button
              className="w-full h-14 bg-card border-border text-muted-foreground/40 hover:text-black hover:bg-[#ffc105] hover:border-[#ffc105] transition-all text-[11px] font-black uppercase tracking-[0.4em] rounded-[20px] shadow-sm transform active:scale-[0.99]"
              variant="outline"
              disabled={status !== "CanLoadMore"}
              onClick={() => loadMore(LOGS_PER_PAGE)}
            >
              {status === "LoadingMore"
                ? t("table.loadingMore")
                : status === "Exhausted"
                  ? t("table.exhausted")
                  : t("table.loadMore")}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
