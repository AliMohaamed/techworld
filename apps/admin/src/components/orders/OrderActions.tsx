"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@techworld/ui/button";
import { cn, Select, SelectContent, SelectItem, SelectTrigger } from "@techworld/ui";
import { Link } from "@/navigation";
import { canTransition, statusChangePermission } from "@backend/convex/lib/orderTransitions";
import {
  ALL_STATES,
  DESTRUCTIVE_STATES,
  nextStepFor,
  stateTone,
  type OrderState,
} from "./order-state";

type OrderActionsProps = {
  orderId: string;
  /** Shown in the delivery confirmation. */
  state: OrderState;
  busy: boolean;
  onChangeState: (newState: OrderState) => Promise<void>;
  /** Without it, moves that confirm payment are disabled; the server enforces the same rule. */
  canVerifyPayments: boolean;
  className?: string;
};

export function OrderActions({ orderId, state, busy, onChangeState, canVerifyPayments, className }: OrderActionsProps) {
  const t = useTranslations("Orders.queue.table");
  const tStates = useTranslations("Orders.details.states");
  const tOrders = useTranslations("Orders");
  const [pending, setPending] = useState<OrderState | null>(null);

  const next = nextStepFor(state);
  const href = `/orders/${orderId}`;
  const isAllowed = (newState: OrderState) =>
    canVerifyPayments || statusChangePermission([state], newState) !== "VERIFY_PAYMENTS";
  // Fulfilment steps need a confirmed order first (the server enforces the same rule).
  const isReachable = (newState: OrderState) => canTransition([state], newState);
  const canReview = next?.kind === "review" && canVerifyPayments;
  const hasLockedStates = ALL_STATES.some((s) => s !== state && !isAllowed(s));

  const requestChange = (newState: OrderState) => {
    if (newState === state || !isAllowed(newState) || !isReachable(newState)) return;
    if (DESTRUCTIVE_STATES.includes(newState)) {
      setPending(newState);
      return;
    }
    void onChangeState(newState);
  };

  // Destructive overrides confirm in place: the agent keeps their row and scroll position.
  if (pending) {
    return (
      <div
        role="group"
        aria-label={t("confirm.title", { state: tStates(pending) })}
        className={cn("flex items-center justify-end gap-2", className)}
      >
        <span className="text-xs font-bold text-destructive whitespace-nowrap">
          {t("confirm.title", { state: tStates(pending) })}
        </span>
        <Button
          type="button"
          size="sm"
          autoFocus
          disabled={busy}
          onClick={async () => {
            await onChangeState(pending);
            setPending(null);
          }}
          className="h-9 rounded-xl bg-destructive px-3 text-xs font-bold text-white hover:bg-destructive/90"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("confirm.yes")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setPending(null)}
          onKeyDown={(e) => e.key === "Escape" && setPending(null)}
          className="h-9 rounded-xl px-3 text-xs font-bold"
        >
          {t("confirm.keep")}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      {next?.kind === "advance" && isAllowed(next.to) && (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => requestChange(next.to)}
          className="h-9 rounded-xl bg-foreground px-3.5 text-xs font-bold text-background transition-colors hover:bg-[#ffc105] hover:text-black"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {t(`next.${next.labelKey}`)}
        </Button>
      )}

      <Link
        href={href}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-[#ffc105]",
          canReview
            ? "bg-[#ffc105] text-black hover:bg-[#ffc105]/85"
            : "border border-border text-foreground hover:bg-accent",
        )}
      >
        {canReview ? t("next.verify") : t("review")}
        <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
      </Link>

      <Select value={state} onValueChange={(v) => requestChange(v as OrderState)} disabled={busy}>
        <SelectTrigger
          aria-label={t("changeStatus")}
          title={t("changeStatus")}
          className="h-9 w-9 shrink-0 justify-center rounded-xl border-border px-0 text-muted-foreground hover:bg-accent hover:text-foreground [&>svg:last-child]:hidden"
        >
          <MoreHorizontal className="h-4 w-4" />
        </SelectTrigger>
        <SelectContent
          align="end"
          className="min-w-[12rem] rounded-xl border-border bg-card"
        >
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-bold text-muted-foreground">{t("changeStatus")}</p>
          {ALL_STATES.map((s) => (
            <SelectItem
              key={s}
              value={s}
              disabled={s === state || !isAllowed(s) || !isReachable(s)}
              className={cn(
                "cursor-pointer text-xs font-bold",
                DESTRUCTIVE_STATES.includes(s) && "text-destructive focus:text-destructive",
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", stateTone(s).dot)} aria-hidden />
                {tStates(s)}
              </span>
            </SelectItem>
          ))}
          {hasLockedStates && (
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold text-muted-foreground">{t("paymentLocked")}</p>
          )}
          {!isReachable("READY_FOR_SHIPPING") && (
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold text-muted-foreground">{tOrders("fulfilmentLocked")}</p>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
