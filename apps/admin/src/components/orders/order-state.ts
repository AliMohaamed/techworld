export type OrderState =
  | "PENDING_PAYMENT_INPUT"
  | "AWAITING_VERIFICATION"
  | "CONFIRMED"
  | "READY_FOR_SHIPPING"
  | "SHIPPED"
  | "DELIVERED"
  | "RTO"
  | "STALLED_PAYMENT"
  | "CANCELLED"
  | "FLAGGED_FRAUD";

/** The happy path, in FSM order. */
export const FLOW_STATES: OrderState[] = [
  "PENDING_PAYMENT_INPUT",
  "AWAITING_VERIFICATION",
  "CONFIRMED",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED",
];

/** Out-of-flow states. */
export const EXCEPTION_STATES: OrderState[] = [
  "STALLED_PAYMENT",
  "FLAGGED_FRAUD",
  "RTO",
  "CANCELLED",
];

export const ALL_STATES: OrderState[] = [...FLOW_STATES, ...EXCEPTION_STATES];

/** States that end or reverse an order; overriding into them asks for confirmation. */
export const DESTRUCTIVE_STATES: OrderState[] = ["CANCELLED", "RTO", "FLAGGED_FRAUD"];

/** States where an agent is expected to act, used to flag orders that have waited too long. */
export const ATTENTION_STATES: OrderState[] = ["AWAITING_VERIFICATION", "CONFIRMED", "READY_FOR_SHIPPING"];
export const STALE_AFTER_MS = 12 * 60 * 60 * 1000;

export const isOrderState = (value: string | null | undefined): value is OrderState =>
  !!value && (ALL_STATES as string[]).includes(value);

type StateTone = {
  /** Badge text + tint */
  badge: string;
  /** Solid dot / bar colour */
  dot: string;
};

// Text colours are stepped per theme so every badge clears 4.5:1 on the card surface.
const TONES: Record<OrderState, StateTone> = {
  PENDING_PAYMENT_INPUT: {
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/50",
  },
  AWAITING_VERIFICATION: {
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
    dot: "bg-sky-500",
  },
  CONFIRMED: {
    badge: "bg-[#ffc105]/15 text-amber-800 dark:text-[#ffc105] border-[#ffc105]/40",
    dot: "bg-[#ffc105]",
  },
  READY_FOR_SHIPPING: {
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
    dot: "bg-violet-500",
  },
  SHIPPED: {
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25",
    dot: "bg-indigo-500",
  },
  DELIVERED: {
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  STALLED_PAYMENT: {
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25",
    dot: "bg-orange-500",
  },
  FLAGGED_FRAUD: {
    badge: "bg-destructive/10 text-destructive border-destructive/25",
    dot: "bg-destructive",
  },
  RTO: {
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
  },
  CANCELLED: {
    badge: "bg-muted text-muted-foreground border-border line-through decoration-muted-foreground/40",
    dot: "bg-muted-foreground/40",
  },
};

export const stateTone = (state: string): StateTone =>
  isOrderState(state) ? TONES[state] : TONES.PENDING_PAYMENT_INPUT;

export type NextStep =
  | { kind: "review"; labelKey: "verify" }
  | { kind: "advance"; to: OrderState; labelKey: "ready" | "ship" | "deliver" };

/**
 * The one obvious next move for an order in the queue. Verification needs the
 * receipt review on the details page, so it links there instead of mutating.
 */
export const nextStepFor = (state: string): NextStep | null => {
  switch (state) {
    case "AWAITING_VERIFICATION":
      return { kind: "review", labelKey: "verify" };
    case "CONFIRMED":
      return { kind: "advance", to: "READY_FOR_SHIPPING", labelKey: "ready" };
    case "READY_FOR_SHIPPING":
      return { kind: "advance", to: "SHIPPED", labelKey: "ship" };
    case "SHIPPED":
      return { kind: "advance", to: "DELIVERED", labelKey: "deliver" };
    default:
      return null;
  }
};
