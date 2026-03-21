"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@techworld/ui";
import { History as HistoryIcon, Terminal, Calendar, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";

const LOGS_PER_PAGE = 20;

export default function SettingsAuditPage() {
  const me = useQuery(api.users.getMe);
  const canViewLogs = me?.permissions?.includes("VIEW_AUDIT_LOGS");

  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.paginatedList,
    canViewLogs ? { actionType: "UPDATE_SYSTEM_CONFIG" } : "skip" as any,
    { initialNumItems: LOGS_PER_PAGE }
  );

  if (me && !canViewLogs) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
        <ShieldCheck className="h-16 w-16 text-red-500/50" />
        <h2 className="text-2xl font-semibold text-white">Access Denied</h2>
        <p className="max-w-md text-zinc-500">
           Your account requires the <code className="text-[#ffc105]">VIEW_AUDIT_LOGS</code> permission to access the audit trail. 
           Please contact a Super Admin for authorization.
        </p>
        <Link href="/settings">
          <Button variant="outline" className="mt-4 rounded-full border-white/5 bg-white/[0.02]">
            <ArrowLeft size={16} className="mr-2" />
            Back to Settings
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-20">
      <header className="rounded-[32px] border border-white/5 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.05),transparent_40%),#24201a] px-8 py-10 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <HistoryIcon className="text-[#ffc105]" size={20} />
              <p className="text-[11px] uppercase tracking-[0.4em] text-[#ffc105]">Traceability</p>
            </div>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
              Settings Audit Trail
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 font-light">
              History of all global configuration changes. This ledger tracks who changed what system toggle and when.
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline" className="rounded-full border-white/5 bg-white/[0.02]">
              <ArrowLeft size={16} className="mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>
      </header>

      <section className="space-y-6">
        <div className="rounded-[28px] border border-white/5 bg-[#24201a] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Setting Key</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold whitespace-nowrap">Updated By</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">New Value</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Timestamp</th>
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
                      <pre className="text-[11px] font-mono text-zinc-400 bg-black/20 p-2 rounded-lg border border-white/5">
                        {JSON.stringify((log.changes as any)?.value ?? log.changes, null, 2)}
                      </pre>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar size={12} className="text-zinc-600" />
                          <span className="text-[12px] tabular-nums whitespace-nowrap">
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
                 <p className="text-sm animate-pulse">Fetching system history...</p>
               </div>
            )}

            {!results.length && status !== "LoadingFirstPage" && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                  <HistoryIcon size={48} className="mb-4 opacity-10" />
                  <p className="text-sm">No configuration changes recorded yet.</p>
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
               {status === "LoadingMore" ? "Fetching older entries..." : status === "Exhausted" ? "Total History Loaded" : "Load more entries"}
             </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
