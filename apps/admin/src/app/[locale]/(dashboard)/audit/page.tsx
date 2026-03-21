"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@techworld/ui";
import { History, Search, Terminal, User as UserIcon, Calendar, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

const LOGS_PER_PAGE = 20;

export default function AuditLogsPage() {
  const t = useTranslations('Audit');
  const locale = useLocale();
  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.paginatedList,
    {},
    { initialNumItems: LOGS_PER_PAGE }
  );

  const [filter, setFilter] = useState("");

  const filteredResults = filter
    ? results.filter((log) => 
        log.actionType.toLowerCase().includes(filter.toLowerCase()) ||
        log.userName.toLowerCase().includes(filter.toLowerCase()) ||
        log.entityId.toLowerCase().includes(filter.toLowerCase())
      )
    : results;

  return (
    <main className="space-y-8 pb-20">
      <header className="rounded-[32px] border border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.05),transparent_40%),#24201a] px-8 py-10 shadow-xl">
        <div className="flex items-center gap-3">
          <History className="text-[#ffc105]" size={20} />
          <p className="text-[11px] uppercase tracking-[0.4em] text-[#ffc105]">{t('header.badge')}</p>
        </div>
        <h1 className="mt-4 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
          {t('header.title')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 font-light">
          {t('header.description')}
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder={t('filter.placeholder')}
                className="w-full bg-[#24201a] border border-white/5 rounded-full py-3 ltr:pl-11 ltr:pr-4 rtl:pr-11 rtl:pl-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ffc105]/20 transition-all placeholder:text-zinc-600 shadow-sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold px-5 py-2 border border-white/5 rounded-full bg-white/[0.02] shadow-sm">
                {status === "LoadingFirstPage" ? t('filter.syncing') : t('filter.count', { count: results.length })}
             </span>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/5 bg-[#24201a] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#2a261f]">
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{t('table.columns.action')}</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold whitespace-nowrap">{t('table.columns.subject')}</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{t('table.columns.entity')}</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{t('table.columns.timestamp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredResults.map((log) => (
                  <tr key={log._id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-start gap-4">
                        <div className="h-9 w-9 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-[#ffc105]/20 transition-colors shrink-0">
                          <Terminal size={14} className="text-[#ffc105]" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white tracking-tight leading-none pt-1 uppercase italic">{log.actionType.replace(/_/g, " ")}</p>
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                             <pre className="text-[10px] font-mono text-zinc-500 truncate max-w-[300px] font-light">
                               {JSON.stringify(log.changes).slice(0, 100)}{JSON.stringify(log.changes).length > 100 ? "..." : ""}
                             </pre>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase border border-white/5 overflow-hidden">
                           {log.userName.slice(0, 2)}
                        </div>
                        <div>
                           <p className="text-[13px] text-white font-medium leading-none">{log.userName}</p>
                           <p className="text-[10px] text-zinc-500 mt-1 font-light">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                        <span className="text-[11px] font-mono text-zinc-400 font-light">{log.entityId}</span>
                        <ArrowUpRight size={10} className="text-zinc-600" />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar size={12} className="text-zinc-600" />
                          <span className="text-[12px] tabular-nums whitespace-nowrap font-light">
                            {format(log.timestamp, "MMM dd, HH:mm:ss")}
                          </span>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {status === "LoadingFirstPage" && (
               <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
                 <Terminal className="animate-pulse text-[#ffc105]" size={32} />
                 <p className="text-sm animate-pulse">{t('table.loading')}</p>
               </div>
            )}

            {!filteredResults.length && status !== "LoadingFirstPage" && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                  <History size={48} className="mb-4 opacity-10" />
                  <p className="text-sm italic">{t('table.empty')}</p>
                </div>
            )}
          </div>

          <div className="p-8 border-t border-white/5 bg-black/10">
             <Button
               className="w-full bg-[#1a1814] border-white/5 text-zinc-400 hover:text-white transition-all text-sm uppercase tracking-widest h-12 rounded-2xl"
               variant="outline"
               disabled={status !== "CanLoadMore"}
               onClick={() => loadMore(LOGS_PER_PAGE)}
             >
               {status === "LoadingMore" ? t('table.loadingMore') : status === "Exhausted" ? t('table.exhausted') : t('table.loadMore')}
             </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
