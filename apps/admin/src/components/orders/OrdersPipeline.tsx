"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@techworld/ui";
import {
  EXCEPTION_STATES,
  FLOW_STATES,
  stateTone,
  type OrderState,
} from "./order-state";

type PipelineFilter = "ALL" | OrderState;

type OrdersPipelineProps = {
  counts: Partial<Record<OrderState, number>>;
  total: number;
  active: PipelineFilter;
  onSelect: (filter: PipelineFilter) => void;
  loading?: boolean;
};

/**
 * The order FSM drawn as a rail: the fulfilment flow on one track, the
 * out-of-flow exceptions on another. Each stage is a filter with its live count.
 */
export function OrdersPipeline({ counts, total, active, onSelect, loading }: OrdersPipelineProps) {
  const t = useTranslations("Orders.queue.pipeline");
  const tStates = useTranslations("Orders.details.states");
  const locale = useLocale();
  const nf = new Intl.NumberFormat(locale);

  const renderStage = (state: OrderState, variant: "flow" | "exception") => {
    const count = counts[state] ?? 0;
    const isActive = active === state;
    const tone = stateTone(state);

    return (
      <button
        key={state}
        type="button"
        onClick={() => onSelect(isActive ? "ALL" : state)}
        aria-pressed={isActive}
        className={cn(
          "group/stage relative flex min-w-[7.5rem] flex-1 snap-start flex-col items-start justify-between gap-2 rounded-2xl px-3.5 pb-4 pt-3 text-start outline-none transition-colors duration-200",
          "focus-visible:ring-2 focus-visible:ring-[#ffc105] focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          isActive
            ? "bg-foreground text-background"
            : "hover:bg-accent/60",
          variant === "exception" && "min-w-[7rem]",
        )}
      >
        <span
          className={cn(
            "flex items-start gap-1.5 text-xs font-bold leading-tight",
            isActive ? "text-background/80" : "text-muted-foreground",
          )}
        >
          <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", tone.dot)} aria-hidden />
          <span className="line-clamp-2">{tStates(state)}</span>
        </span>
        <span
          className={cn(
            "text-2xl font-bold tabular-nums leading-none",
            count === 0 && !isActive && "text-muted-foreground/50",
            variant === "exception" && "text-xl",
          )}
        >
          {loading ? (
            <span className="inline-block h-6 w-8 animate-pulse rounded-md bg-muted align-middle" />
          ) : (
            nf.format(count)
          )}
        </span>
        {/* Share-of-total meter: makes a pile-up at one stage visible at a glance */}
        <span className="absolute inset-x-4 bottom-2 h-0.5 overflow-hidden rounded-full bg-border/60" aria-hidden>
          <span
            className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", tone.dot)}
            style={{ width: total > 0 ? `${Math.max((count / total) * 100, count > 0 ? 4 : 0)}%` : "0%" }}
          />
        </span>
      </button>
    );
  };

  return (
    <nav aria-label={t("label")} className="grid grid-cols-1 gap-3 lg:grid-cols-[10rem_minmax(0,1fr)]">
      <button
        type="button"
        onClick={() => onSelect("ALL")}
        aria-pressed={active === "ALL"}
        className={cn(
          "flex shrink-0 items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-start outline-none transition-colors duration-200 lg:row-span-2 lg:flex-col lg:items-start lg:justify-center",
          "focus-visible:ring-2 focus-visible:ring-[#ffc105] focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          active === "ALL"
            ? "border-[#ffc105] bg-[#ffc105] text-black"
            : "border-border hover:border-foreground/30",
        )}
      >
        <span className={cn("text-xs font-bold", active === "ALL" ? "text-black/70" : "text-muted-foreground")}>
          {t("all")}
        </span>
        <span className="text-3xl font-bold tabular-nums leading-none">
          {loading ? <span className="inline-block h-7 w-10 animate-pulse rounded-md bg-black/10 align-middle" /> : nf.format(total)}
        </span>
      </button>

      <div className="min-w-0 rounded-2xl border border-border p-1.5">
        <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold text-muted-foreground">{t("flow")}</p>
        <div className="flex snap-x gap-1 overflow-x-auto scrollbar-hide">
          {FLOW_STATES.map((state, index) => (
            <div key={state} className="flex min-w-0 flex-1 items-center">
              {renderStage(state, "flow")}
              {index < FLOW_STATES.length - 1 && (
                <svg
                  aria-hidden
                  viewBox="0 0 8 16"
                  className="mx-0.5 h-4 w-2 shrink-0 text-border rtl:-scale-x-100"
                >
                  <path d="M1 1l6 7-6 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-dashed border-border p-1.5 sm:flex-row sm:items-center">
        <p className="shrink-0 px-3 pt-1.5 text-[11px] font-bold text-muted-foreground sm:w-28 sm:pt-0">{t("exceptions")}</p>
        <div className="flex flex-1 snap-x gap-1 overflow-x-auto scrollbar-hide">
          {EXCEPTION_STATES.map((state) => renderStage(state, "exception"))}
        </div>
      </div>
    </nav>
  );
}
