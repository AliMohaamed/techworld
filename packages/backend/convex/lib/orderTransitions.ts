import type { Doc } from "../_generated/dataModel";
import type { Permission } from "./permissions";

// Pure rules with no server imports, so the admin app can share them to decide
// which actions to offer. The mutations in orders.ts remain the enforcement.

export type OrderState = Doc<"orders">["state"];

/** States that mean payment was verified; reaching one deducts real_stock. */
export const PAID_STATES: readonly OrderState[] = ["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED", "DELIVERED"];

export const isPaidState = (state: OrderState) => PAID_STATES.includes(state);

/**
 * States an order can be marked DELIVERED from. Confirmation (the verified
 * deposit) is mandatory; READY_FOR_SHIPPING and SHIPPED may be skipped when
 * staff forget them. New, unpaid, cancelled, RTO and fraud orders cannot jump
 * to DELIVERED.
 */
export const DELIVERABLE_FROM_STATES: readonly OrderState[] = ["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED"];

/** Whether an order whose lines are in `states` can be marked DELIVERED. */
export const canDeliverFrom = (states: readonly OrderState[]) =>
  states.length > 0 && states.every((state) => DELIVERABLE_FROM_STATES.includes(state));

/**
 * Fulfilment steps. CONFIRMED is the mandatory gateway into them: an order that
 * has not been confirmed (pending, awaiting verification, stalled, cancelled,
 * fraud, RTO) can be cancelled, flagged or confirmed, but never shipped.
 */
export const FULFILMENT_STATES: readonly OrderState[] = ["READY_FOR_SHIPPING", "SHIPPED", "DELIVERED"];

/**
 * Whether an order whose lines are in `fromStates` may move to `toState`.
 * Fulfilment steps need every line to be confirmed already (in a paid state);
 * DELIVERED additionally follows canDeliverFrom.
 */
export function canTransition(fromStates: readonly OrderState[], toState: OrderState): boolean {
  if (toState === "DELIVERED") return canDeliverFrom(fromStates);
  if (FULFILMENT_STATES.includes(toState)) return fromStates.length > 0 && fromStates.every(isPaidState);
  return true;
}

/**
 * Permission needed to move order lines currently in `fromStates` to `toState`.
 *
 * Moving into a paid state from anywhere outside the paid flow (pending,
 * stalled, cancelled, fraud, RTO) asserts that payment was verified, so it
 * needs VERIFY_PAYMENTS. CONFIRMED always does, since it is the payment
 * decision itself. Everything else, including the logistics steps after
 * confirmation (READY_FOR_SHIPPING -> SHIPPED -> DELIVERED), needs VIEW_ORDERS.
 */
export function statusChangePermission(fromStates: readonly OrderState[], toState: OrderState): Permission {
  if (toState === "CONFIRMED") return "VERIFY_PAYMENTS";
  if (isPaidState(toState) && fromStates.some((state) => !isPaidState(state))) return "VERIFY_PAYMENTS";
  return "VIEW_ORDERS";
}
