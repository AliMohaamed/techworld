"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { format } from "date-fns";
import { Button } from "@techworld/ui";
import { History, Search, Terminal, User as UserIcon, Calendar, ArrowUpRight } from "lucide-react";
import { useState } from "react";

const LOGS_PER_PAGE = 20;

export default function AuditLogsPage() {
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
          <p className="text-[11px] uppercase tracking-[0.4em] text-[#ffc105]">System Transparency</p>
        </div>
        <h1 className="mt-4 text-4xl font-semibold uppercase tracking-tight text-white leading-tight">
          Audit Logs
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 font-light">
          A comprehensive ledger of all critical system actions. This is a read-only immutable record for operational security and forensic auditing.
        </p>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Search by action, user, or entity..."
                className="w-full bg-[#24201a] border border-white/5 rounded-full py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#ffc105]/20 transition-all placeholder:text-zinc-600"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold px-4 py-1.5 border border-white/5 rounded-full bg-white/[0.02]">
                {status === "LoadingFirstPage" ? "Syncing..." : `${results.length} events logged`}
             </span>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/5 bg-[#24201a] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Action</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold whitespace-nowrap">Subject</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Entity</th>
                  <th className="px-8 py-5 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">Timestamp</th>
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
                          <p className="text-sm font-medium text-white tracking-tight leading-none pt-1">{log.actionType.replace(/_/g, " ")}</p>
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                             <pre className="text-[10px] font-mono text-zinc-500 truncate max-w-[300px]">
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
                           <p className="text-[10px] text-zinc-500 mt-1">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                        <span className="text-[11px] font-mono text-zinc-400">{log.entityId}</span>
                        <ArrowUpRight size={10} className="text-zinc-600" />
                      </div>
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
                 <p className="text-sm animate-pulse">Establishing secure connection to ledger...</p>
               </div>
            )}

            {!filteredResults.length && status !== "LoadingFirstPage" && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                  <History size={48} className="mb-4 opacity-10" />
                  <p className="text-sm">No recorded events found in the current buffer.</p>
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
               {status === "LoadingMore" ? "Fetching older entries..." : status === "Exhausted" ? "End of Ledger - Integrity Verified" : "Load more entries"}
             </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
