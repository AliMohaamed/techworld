"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@techworld/ui";
import { History as HistoryIcon, Terminal, Calendar, ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "@/navigation";
import { useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";

const LOGS_PER_PAGE = 20;

export default function SettingsAuditPage() {
  const t = useTranslations('Settings.audit');
  const locale = useLocale();
  const me = useQuery(api.users.getMe);
  const canViewLogs = me?.permissions?.includes("VIEW_AUDIT_LOGS");

  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.paginatedList,
    canViewLogs ? { actionType: "UPDATE_SYSTEM_CONFIG" } : "skip" as any,
    { initialNumItems: LOGS_PER_PAGE }
  );

  if (me && !canViewLogs) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center p-8">
        <ShieldCheck className="h-16 w-16 text-red-500/50" />
        <h2 className="text-2xl font-semibold text-white uppercase tracking-tight">{t('denied.title')}</h2>
        <p className="max-w-md text-zinc-500 leading-relaxed font-light">
           {t('denied.message', { permission: "VIEW_AUDIT_LOGS" })}
        </p>
        <Link href="/settings">
          <Button variant="outline" className="mt-4 rounded-full border-white/5 bg-white/[0.02]">
            <ArrowLeft size={16} className={locale === 'ar' ? 'ml-2 rotate-180' : 'mr-2'} />
            {t('backButton')}
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-20">
      <header className="rounded-[32px] border border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.05),transparent_40%),#24201a] px-8 py-10 shadow-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-[#ffc105]" size={20} />
              <p className="text-[11px] uppercase tracking-[0.4em] text-[#ffc105]">{t('badge')}</p>
            </div>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
              {t('title')}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 font-light">
              {t('description')}
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline" className="rounded-full border-white/5 bg-white/[0.02]">
              <ArrowLeft size={16} className={locale === 'ar' ? 'ml-2 rotate-180' : 'mr-2'} />
              {t('backButton')}
            </Button>
          </Link>
        </div>
      </header>

      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/5 bg-[#24201a] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#2a261f]">
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{t('table.columns.key')}</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold whitespace-nowrap">{t('table.columns.updatedBy')}</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{t('table.columns.newValue')}</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">{t('table.columns.timestamp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((log) => (
                  <tr key={log._id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-9 w-9 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-[#ffc105]/20 transition-colors shrink-0">
                          <Terminal size={14} className="text-[#ffc105]" />
                        </div>
                        <p className="text-sm font-mono text-white tracking-tight">{log.entityId}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 font-bold uppercase border border-white/5 overflow-hidden">
                           {log.userName.slice(0, 2)}
                        </div>
                        <div>
                           <p className="text-[13px] text-white font-medium leading-none">{log.userName}</p>
                           <p className="text-[10px] text-zinc-500 mt-1">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <pre className="text-[11px] font-mono text-zinc-400 bg-black/20 p-2 rounded-lg border border-white/5 font-light leading-relaxed">
                        {JSON.stringify((log.changes as any)?.value ?? log.changes, null, 2)}
                      </pre>
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

            {!results.length && status !== "LoadingFirstPage" && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                  <HistoryIcon size={48} className="mb-4 opacity-10" />
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
