import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { asStaff, PHONE, readState, SHORT_CODE, seedOrder, setupConvex } from "./setup";

// Scheduled work (WhatsApp, audit logs, Meta sends) is queued but never run.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("confirming payment requires VERIFY_PAYMENTS", () => {
  test("updateGenericStatus: VIEW_ORDERS alone cannot confirm, and nothing changes", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await expect(
      viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/VERIFY_PAYMENTS/);

    const { lines, skus, metaEvents } = await readState(t);
    expect(lines.map((l) => l.state)).toEqual(["AWAITING_VERIFICATION", "AWAITING_VERIFICATION"]);
    expect(skus.map((s) => s.real_stock)).toEqual([10, 10]);
    expect(metaEvents).toHaveLength(0);
  });

  test("updateOrderStatus: VIEW_ORDERS alone cannot confirm", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await expect(
      viewer.mutation(api.orders.updateOrderStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/VERIFY_PAYMENTS/);

    const { lines, metaEvents } = await readState(t);
    expect(lines[0].state).toBe("AWAITING_VERIFICATION");
    expect(metaEvents).toHaveLength(0);
  });

  test("updateGenericStatus: VERIFY_PAYMENTS confirms every line (deposit verified, no Purchase yet)", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const verifier = await asStaff(t, "verifier", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await verifier.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });

    const { lines, skus, metaEvents } = await readState(t);
    expect(lines.map((l) => l.state)).toEqual(["CONFIRMED", "CONFIRMED"]);
    expect(skus.map((s) => s.real_stock)).toEqual([8, 9]);
    expect(metaEvents).toHaveLength(0);
  });

  test("updateOrderStatus: VERIFY_PAYMENTS (without VIEW_ORDERS) can confirm", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const verifier = await asStaff(t, "verifier", ["VERIFY_PAYMENTS"]);

    await verifier.mutation(api.orders.updateOrderStatus, { orderId: firstLineId, newState: "CONFIRMED" });

    const { lines, metaEvents } = await readState(t);
    expect(lines[0].state).toBe("CONFIRMED");
    expect(metaEvents).toHaveLength(0);
  });

  test("unauthenticated and deactivated callers cannot confirm", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);

    await expect(
      t.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/Unauthenticated/);

    const deactivated = await asStaff(t, "former", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await t.run(async (ctx) => {
      const user = await ctx.db
        .query("users")
        .withIndex("by_identifier", (q) => q.eq("identifier", "auth|former"))
        .unique();
      await ctx.db.patch(user!._id, { isActive: false });
    });
    await expect(
      deactivated.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/deactivated/);

    expect((await readState(t)).metaEvents).toHaveLength(0);
  });
});

describe("VIEW_ORDERS cannot bypass payment verification", () => {
  test.each([
    ["AWAITING_VERIFICATION", "READY_FOR_SHIPPING"],
    ["AWAITING_VERIFICATION", "SHIPPED"],
    ["PENDING_PAYMENT_INPUT", "SHIPPED"],
    ["STALLED_PAYMENT", "DELIVERED"],
    ["CANCELLED", "READY_FOR_SHIPPING"],
    ["FLAGGED_FRAUD", "SHIPPED"],
    ["RTO", "SHIPPED"],
  ] as const)("%s -> %s is rejected and changes nothing", async (from, to) => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, from);
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await expect(viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: to })).rejects.toThrow(
      /VERIFY_PAYMENTS/,
    );

    const { lines, skus } = await readState(t);
    expect(lines.map((l) => l.state)).toEqual([from, from]);
    expect(skus.map((s) => s.real_stock)).toEqual([10, 10]);
  });

  test("a partly unpaid order (lines in mixed states) still needs VERIFY_PAYMENTS to ship", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(firstLineId, { state: "READY_FOR_SHIPPING" }); // second line stays unpaid
    });
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await expect(
      viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "SHIPPED" }),
    ).rejects.toThrow(/VERIFY_PAYMENTS/);
  });

});

describe("CONFIRMED is a mandatory gateway before fulfilment", () => {
  for (const from of ["PENDING_PAYMENT_INPUT", "AWAITING_VERIFICATION", "STALLED_PAYMENT", "FLAGGED_FRAUD", "RTO", "CANCELLED"] as const) {
    test.each(["READY_FOR_SHIPPING", "SHIPPED"] as const)(`even VERIFY_PAYMENTS cannot move ${from} -> %s`, async (to) => {
      const t = setupConvex();
      const { firstLineId } = await seedOrder(t, from);
      const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

      await expect(admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: to })).rejects.toThrow(
        /Confirm the order first/,
      );

      const { lines, skus, metaEvents } = await readState(t);
      expect(lines.map((l) => l.state)).toEqual([from, from]);
      expect(skus.map((s) => s.real_stock)).toEqual([10, 10]);
      expect(metaEvents).toHaveLength(0);
    });
  }

  test("a partly confirmed order cannot be shipped", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(firstLineId, { state: "CONFIRMED" }); // second line stays unconfirmed
    });
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await expect(
      admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "READY_FOR_SHIPPING" }),
    ).rejects.toThrow(/Confirm the order first/);
  });
});

describe("the fulfilment workflow after confirmation is unchanged", () => {
  test("VIEW_ORDERS advances a confirmed order through READY_FOR_SHIPPING, SHIPPED and DELIVERED", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const verifier = await asStaff(t, "verifier", ["VERIFY_PAYMENTS"]);
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await verifier.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });
    for (const newState of ["READY_FOR_SHIPPING", "SHIPPED", "DELIVERED"] as const) {
      await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState });
      expect((await readState(t)).lines.map((l) => l.state)).toEqual([newState, newState]);
    }
    // Stock was deducted once, at confirmation.
    expect((await readState(t)).skus.map((s) => s.real_stock)).toEqual([8, 9]);
  });

  test("VIEW_ORDERS can still step a paid order back within the paid flow", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, "SHIPPED");
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "READY_FOR_SHIPPING" });

    expect((await readState(t)).lines.map((l) => l.state)).toEqual(["READY_FOR_SHIPPING", "READY_FOR_SHIPPING"]);
  });

  test("moving a paid order back to CONFIRMED still needs VERIFY_PAYMENTS", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, "READY_FOR_SHIPPING");
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await expect(
      viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/VERIFY_PAYMENTS/);
  });
});

describe("other transitions keep requiring only VIEW_ORDERS", () => {
  test.each(["CANCELLED", "STALLED_PAYMENT", "PENDING_PAYMENT_INPUT", "FLAGGED_FRAUD"] as const)(
    "updateGenericStatus: VIEW_ORDERS can move an unpaid order to %s",
    async (newState) => {
      const t = setupConvex();
      const { firstLineId } = await seedOrder(t);
      const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

      await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState });

      const { lines, metaEvents } = await readState(t);
      expect(lines.map((l) => l.state)).toEqual([newState, newState]);
      expect(metaEvents).toHaveLength(0);
    },
  );

  test.each(["CANCELLED", "RTO"] as const)("updateGenericStatus: VIEW_ORDERS can move a shipped order to %s", async (newState) => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, "SHIPPED");
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState });

    expect((await readState(t)).lines.map((l) => l.state)).toEqual([newState, newState]);
  });

  test("updateOrderStatus: VIEW_ORDERS can still cancel", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await viewer.mutation(api.orders.updateOrderStatus, { orderId: firstLineId, newState: "CANCELLED" });

    expect((await readState(t)).lines[0].state).toBe("CANCELLED");
  });

  test("a user with no order permissions can do neither", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const outsider = await asStaff(t, "outsider", ["MANAGE_PRODUCTS"]);

    await expect(
      outsider.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CANCELLED" }),
    ).rejects.toThrow(/VIEW_ORDERS/);
    await expect(
      outsider.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/VERIFY_PAYMENTS/);
  });
});

/** Deposit verified, then shipped: the order is one step from delivery. */
async function confirmAndShip(admin: Awaited<ReturnType<typeof asStaff>>, orderId: Id<"orders">) {
  for (const newState of ["CONFIRMED", "READY_FOR_SHIPPING", "SHIPPED"] as const) {
    await admin.mutation(api.orders.updateGenericStatus, { orderId, newState });
  }
}

describe("Meta Purchase is queued only when a deposit-paid order is delivered", () => {
  test("delivery queues exactly one Purchase for the whole order", async () => {
    const t = setupConvex();
    const { firstLineId, productId } = await seedOrder(t);
    const verifier = await asStaff(t, "verifier", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await confirmAndShip(verifier, firstLineId);
    expect((await readState(t)).metaEvents).toHaveLength(0); // confirmed and shipped: not yet a sale

    await verifier.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

    const { metaEvents } = await readState(t);
    expect(metaEvents).toHaveLength(1);
    expect(metaEvents[0]).toMatchObject({
      eventId: `purchase-${SHORT_CODE}`,
      value: 1500, // products after discount; the 50 EGP shipping is excluded
      currency: "EGP",
      status: "PENDING",
      contents: [{ id: productId, quantity: 3, item_price: 500 }],
    });
  });

  test("a fulfilment-only user (VIEW_ORDERS) delivering a confirmed order also queues it", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, "SHIPPED");
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

    expect((await readState(t)).metaEvents).toHaveLength(1);
  });

  test.each(["CONFIRMED", "READY_FOR_SHIPPING"] as const)(
    "delivering straight from %s (skipped steps) still queues the Purchase",
    async (from) => {
      const t = setupConvex();
      const { firstLineId } = await seedOrder(t);
      const verifier = await asStaff(t, "verifier", ["VERIFY_PAYMENTS"]);
      const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);
      await verifier.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });
      if (from === "READY_FOR_SHIPPING") {
        await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: from });
      }

      await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

      const { lines, skus, metaEvents } = await readState(t);
      expect(lines.map((l) => l.state)).toEqual(["DELIVERED", "DELIVERED"]);
      expect(skus.map((s) => s.real_stock)).toEqual([8, 9]); // deducted once, at confirmation
      expect(metaEvents).toHaveLength(1);
      expect(metaEvents[0]).toMatchObject({ value: 1500, currency: "EGP" });
    },
  );

  test.each(["PENDING_PAYMENT_INPUT", "AWAITING_VERIFICATION", "STALLED_PAYMENT", "FLAGGED_FRAUD", "RTO", "CANCELLED"] as const)(
    "jumping from %s straight to DELIVERED is rejected and changes nothing",
    async (from) => {
      const t = setupConvex();
      const { firstLineId } = await seedOrder(t, from);
      const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

      await expect(
        admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" }),
      ).rejects.toThrow(/Only confirmed orders/);

      const { lines, skus, metaEvents } = await readState(t);
      expect(lines.map((l) => l.state)).toEqual([from, from]);
      expect(skus.map((s) => s.real_stock)).toEqual([10, 10]);
      expect(metaEvents).toHaveLength(0);
    },
  );

  test("an order with any unconfirmed line cannot be delivered", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(firstLineId, { state: "SHIPPED" }); // second line stays unpaid
    });
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await expect(
      admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" }),
    ).rejects.toThrow(/Only confirmed orders/);
    expect((await readState(t)).metaEvents).toHaveLength(0);
  });

  test("returned (RTO) and cancelled orders are never counted", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS", "MANAGE_SHIPPING_STATUS"]);
    await confirmAndShip(admin, firstLineId);

    await admin.mutation(api.orders.updateRto, { orderId: firstLineId });

    expect((await readState(t)).metaEvents).toHaveLength(0);
  });

  test("placing an order queues nothing", async () => {
    const t = setupConvex();
    const { productId, skuA, governorateId } = await seedOrder(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("cart_sessions", {
        sessionId: "shopper",
        items: [{ productId, skuId: skuA, quantity: 1, addedAt: Date.now() }],
        lastUpdated: Date.now(),
      });
    });

    await t.mutation(api.cart.placeOrderFromSession, {
      sessionId: "shopper",
      customerName: "Shopper",
      customerPhone: "01198765432",
      customerAddress: "Street 2",
      governorateId,
      metaAttribution: { fbp: "fb.1.1700000000000.123", clientUserAgent: "test-agent", eventSourceUrl: "https://techworldegypt.com/en/checkout" },
    });

    const { metaEvents } = await readState(t);
    expect(metaEvents).toHaveLength(0);
    const placed = await t.run((ctx) =>
      ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("sessionId"), "shopper"))
        .first(),
    );
    expect(placed?.state).toBe("PENDING_PAYMENT_INPUT");
    expect(placed?.metaAttribution).toMatchObject({ fbp: "fb.1.1700000000000.123", clientUserAgent: "test-agent" });
  });

  test("a blacklisted phone queues nothing and is audited", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, "SHIPPED");
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      await ctx.db.insert("blacklist", { phoneNumber: PHONE, reason: "test", addedBy: user!._id, addedAt: Date.now() });
    });

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

    const { metaEvents, audit } = await readState(t);
    expect(metaEvents).toHaveLength(0);
    expect(audit.some((log) => log.actionType === "META_PURCHASE_SKIPPED")).toBe(true);
  });

  test("re-delivering an order never queues a second Purchase", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await confirmAndShip(admin, firstLineId);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });
    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "SHIPPED" });
    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

    expect((await readState(t)).metaEvents).toHaveLength(1);
  });
});
