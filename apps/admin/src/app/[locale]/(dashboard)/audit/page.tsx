"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@techworld/ui";
import {
  History,
  Search,
  Terminal,
  User as UserIcon,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

const LOGS_PER_PAGE = 20;

export default function AuditLogsPage() {
  const t = useTranslations("Audit");
  const locale = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.paginatedList,
    {},
    { initialNumItems: LOGS_PER_PAGE },
  );

  const [filter, setFilter] = useState("");

  const filteredResults = filter
    ? results.filter(
      (log) =>
        log.actionType.toLowerCase().includes(filter.toLowerCase()) ||
        log.userName.toLowerCase().includes(filter.toLowerCase()) ||
        log.entityId.toLowerCase().includes(filter.toLowerCase()),
    )
    : results;

  return (
    <main className="space-y-8 pb-20 bg-background transition-colors">
      <header className="rounded-[32px] border border-border bg-card px-8 py-10   relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.05),transparent_40%)]" />
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden" />

        <div className="flex items-center gap-3 relative z-10">
          <History className="text-[#ffc105]" size={20} />
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
            {t("header.badge")}
          </p>
        </div>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tightest text-foreground leading-tight md:text-5xl italic relative z-10">
          {t("header.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground font-medium relative z-10">
          {t("header.description")}
        </p>
      </header>

      <section className="space-y-8 transition-all">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-4">
          <div className="flex items-center gap-4 flex-1 max-w-lg">
            <div className="relative w-full group">
              <Search
                className="absolute ltr:left-5 rtl:right-5 top-1/2 -translate-y-1/2 text-muted-foreground/30 transition-colors group-hover:text-[#ffc105]"
                size={16}
              />
              <input
                type="text"
                placeholder={t("filter.placeholder")}
                className="w-full bg-card border border-border rounded-2xl py-4 ltr:pl-12 ltr:pr-6 rtl:pr-12 rtl:pl-6 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#ffc105]/20 focus:border-[#ffc105]/40 transition-all placeholder:text-muted-foreground/20 "
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 px-6 py-2.5 border border-border rounded-full bg-card shadow-sm transition-all whitespace-nowrap">
              {status === "LoadingFirstPage"
                ? t("filter.syncing")
                : t("filter.count", { count: results.length })}
            </span>
          </div>
        </div>

        <div className="rounded-[40px] border border-border bg-card overflow-hidden   transition-all">
          <div className="overflow-x-auto min-h-[500px] scrollbar-hide">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/20">
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
                    {t("table.columns.action")}
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black whitespace-nowrap">
                    {t("table.columns.subject")}
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
                    {t("table.columns.entity")}
                  </th>
                  <th className="px-10 py-6 text-[10px] uppercase tracking-[0.4em] text-muted-foreground/40 font-black">
                    {t("table.columns.timestamp")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredResults.map((log) => (
                  <tr
                    key={log._id}
                    className="group hover:bg-accent/30 transition-all"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-start gap-5">
                        <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center border border-border group-hover:border-[#ffc105] group-hover:bg-[#ffc105]/5 transition-all shrink-0 shadow-sm">
                          <Terminal
                            size={14}
                            className="text-[#ffc105] transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-black text-foreground tracking-widest uppercase italic group-hover:text-[#ffc105] transition-colors">
                            {log.actionType.replace(/_/g, " ")}
                          </p>
                          <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                            <pre className="text-[10px] font-mono text-muted-foreground truncate max-w-[320px] font-medium bg-accent/50 px-2 py-1 rounded">
                              {JSON.stringify(log.changes).slice(0, 100)}
                              {JSON.stringify(log.changes).length > 100
                                ? "..."
                                : ""}
                            </pre>
                          </div>
                        </div>
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
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/40 border border-border   group-hover:bg-accent transition-colors">
                        <span className="text-[10px] font-mono text-muted-foreground font-bold tracking-tightest uppercase">
                          {log.entityId}
                        </span>
                        <ArrowUpRight
                          size={10}
                          className="text-muted-foreground/20 group-hover:text-[#ffc105]"
                        />
                      </div>
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

            {!filteredResults.length && status !== "LoadingFirstPage" && (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/10">
                <History size={64} className="mb-6 opacity-5" />
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
