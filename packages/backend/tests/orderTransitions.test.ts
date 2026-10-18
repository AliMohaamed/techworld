import { describe, expect, test } from "vitest";
import {
  canDeliverFrom,
  canTransition,
  FULFILMENT_STATES,
  PAID_STATES,
  statusChangePermission,
  type OrderState,
} from "../convex/lib/orderTransitions";

const ALL_STATES: OrderState[] = [
  "PENDING_PAYMENT_INPUT",
  "AWAITING_VERIFICATION",
  "CONFIRMED",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED",
  "RTO",
  "STALLED_PAYMENT",
  "CANCELLED",
  "FLAGGED_FRAUD",
];
const UNPAID_STATES = ALL_STATES.filter((state) => !PAID_STATES.includes(state));

// The full matrix, so a future change to either list cannot silently open a bypass.
describe("statusChangePermission", () => {
  test.each(ALL_STATES)("anything -> CONFIRMED needs VERIFY_PAYMENTS (from %s)", (from) => {
    expect(statusChangePermission([from], "CONFIRMED")).toBe("VERIFY_PAYMENTS");
  });

  for (const from of UNPAID_STATES) {
    test.each(PAID_STATES.filter((s) => s !== "CONFIRMED"))(`${from} -> %s needs VERIFY_PAYMENTS`, (to) => {
      expect(statusChangePermission([from], to)).toBe("VERIFY_PAYMENTS");
    });
  }

  for (const from of PAID_STATES) {
    test.each(PAID_STATES.filter((s) => s !== "CONFIRMED"))(`${from} -> %s needs only VIEW_ORDERS`, (to) => {
      expect(statusChangePermission([from], to)).toBe("VIEW_ORDERS");
    });
  }

  for (const from of ALL_STATES) {
    test.each(UNPAID_STATES)(`${from} -> %s needs only VIEW_ORDERS`, (to) => {
      expect(statusChangePermission([from], to)).toBe("VIEW_ORDERS");
    });
  }

  test("any unpaid line makes the move payment-sensitive", () => {
    expect(statusChangePermission(["SHIPPED", "AWAITING_VERIFICATION"], "DELIVERED")).toBe("VERIFY_PAYMENTS");
    expect(statusChangePermission(["SHIPPED", "READY_FOR_SHIPPING"], "DELIVERED")).toBe("VIEW_ORDERS");
  });
});

describe("canDeliverFrom", () => {
  const DELIVERABLE: OrderState[] = ["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED"];

  test.each(ALL_STATES)("%s", (from) => {
    expect(canDeliverFrom([from])).toBe(DELIVERABLE.includes(from));
  });

  test("every line must be deliverable", () => {
    expect(canDeliverFrom(["CONFIRMED", "SHIPPED"])).toBe(true);
    expect(canDeliverFrom(["SHIPPED", "AWAITING_VERIFICATION"])).toBe(false);
    expect(canDeliverFrom([])).toBe(false);
  });
});

// CONFIRMED is the mandatory gateway into fulfilment.
describe("canTransition", () => {
  for (const from of UNPAID_STATES) {
    test.each(FULFILMENT_STATES)(`${from} -> %s is blocked until confirmed`, (to) => {
      expect(canTransition([from], to)).toBe(false);
    });
    test.each(["CONFIRMED", "CANCELLED", "FLAGGED_FRAUD"] as const)(`${from} -> %s is allowed`, (to) => {
      expect(canTransition([from], to)).toBe(true);
    });
  }

  for (const from of PAID_STATES) {
    test.each(["READY_FOR_SHIPPING", "SHIPPED"] as const)(`${from} -> %s is allowed`, (to) => {
      expect(canTransition([from], to)).toBe(true);
    });
  }

  test("every line must be confirmed", () => {
    expect(canTransition(["CONFIRMED", "AWAITING_VERIFICATION"], "READY_FOR_SHIPPING")).toBe(false);
    expect(canTransition(["CONFIRMED", "READY_FOR_SHIPPING"], "SHIPPED")).toBe(true);
    expect(canTransition([], "SHIPPED")).toBe(false);
  });
});
