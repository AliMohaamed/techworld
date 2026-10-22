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

describe("delivery workflow: CONFIRMED is mandatory, later steps may be skipped", () => {
  test.each(["CONFIRMED", "READY_FOR_SHIPPING"] as const)(
    "delivering straight from %s (skipped steps) is allowed",
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

      const { lines, skus } = await readState(t);
      expect(lines.map((l) => l.state)).toEqual(["DELIVERED", "DELIVERED"]);
      expect(skus.map((s) => s.real_stock)).toEqual([8, 9]); // deducted once, at confirmation
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

      const { lines, skus } = await readState(t);
      expect(lines.map((l) => l.state)).toEqual([from, from]);
      expect(skus.map((s) => s.real_stock)).toEqual([10, 10]);
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
  });
});

/** Puts one unit of each seeded SKU in a cart and places it as `phone`. */
async function placeCheckout(t: ReturnType<typeof setupConvex>, phone = "01198765432") {
  const { productId, skuA, skuB, governorateId } = await seedOrder(t);
  await t.run(async (ctx) => {
    await ctx.db.insert("cart_sessions", {
      sessionId: "shopper",
      items: [
        { productId, skuId: skuA, quantity: 1, addedAt: Date.now() },
        { productId, skuId: skuB, quantity: 2, addedAt: Date.now() },
      ],
      lastUpdated: Date.now(),
    });
  });
  const shortCode = await t.mutation(api.cart.placeOrderFromSession, {
    sessionId: "shopper",
    customerName: "Shopper",
    customerPhone: phone,
    customerAddress: "Street 2",
    buildingNumber: "5",
    floorNumber: "2",
    apartmentNumber: "7",
    governorateId,
    metaAttribution: { fbp: "fb.1.1700000000000.123", clientUserAgent: "test-agent", eventSourceUrl: "https://techworldegypt.com/en/checkout" },
  });
  const metaEvents = await t.run((ctx) =>
    ctx.db
      .query("meta_events")
      .filter((q) => q.eq(q.field("shortCode"), shortCode))
      .collect(),
  );
  return { shortCode, productId, metaEvents };
}

describe("Meta Purchase is queued when the checkout is placed", () => {
  test("placing an order queues exactly one Purchase for the whole checkout", async () => {
    const t = setupConvex();
    const { shortCode, productId, metaEvents } = await placeCheckout(t);

    expect(metaEvents).toHaveLength(1);
    expect(metaEvents[0]).toMatchObject({
      eventId: `purchase-${shortCode}`, // the success page sends the browser Purchase with this id
      eventName: "Purchase",
      value: 1600, // 600 + 2 x 500; the 50 EGP shipping is excluded
      currency: "EGP",
      status: "PENDING",
      contents: [{ id: productId, quantity: 3 }],
    });

    const placed = await t.run((ctx) =>
      ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("shortCode"), shortCode))
        .first(),
    );
    expect(placed?.state).toBe("PENDING_PAYMENT_INPUT");
    expect(placed?.metaAttribution).toMatchObject({ fbp: "fb.1.1700000000000.123", clientUserAgent: "test-agent" });
  });

  test("a blacklisted phone queues nothing and is audited", async () => {
    const t = setupConvex();
    await asStaff(t, "admin", ["MANAGE_USERS"]);
    await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      await ctx.db.insert("blacklist", { phoneNumber: "01198765432", reason: "test", addedBy: user!._id, addedAt: Date.now() });
    });

    const { metaEvents } = await placeCheckout(t);

    expect(metaEvents).toHaveLength(0);
    const audit = await t.run((ctx) => ctx.db.query("audit_logs").collect());
    expect(audit.some((log) => log.actionType === "META_PURCHASE_SKIPPED")).toBe(true);
  });

  test("confirming, shipping, cancelling or returning an order sends nothing to Meta", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS", "MANAGE_SHIPPING_STATUS"]);
    await confirmAndShip(admin, firstLineId);
    await admin.mutation(api.orders.updateRto, { orderId: firstLineId });

    expect((await readState(t)).metaEvents).toHaveLength(0);
  });
});

describe("OrderDelivered is queued when staff mark an order delivered", () => {
  test("delivery queues one OrderDelivered with its own event id and the order's real value", async () => {
    const t = setupConvex();
    const { firstLineId, productId } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await confirmAndShip(admin, firstLineId);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

    const { metaEvents, audit } = await readState(t);
    expect(metaEvents).toHaveLength(1);
    expect(metaEvents[0]).toMatchObject({
      eventName: "OrderDelivered",
      eventId: `delivered-${SHORT_CODE}`, // never the Purchase id, so Meta never merges the two
      value: 1500, // products after discount; the 50 EGP shipping is excluded
      currency: "EGP",
      status: "PENDING",
      contents: [{ id: productId, quantity: 3, item_price: 500 }],
    });
    expect(audit.some((log) => log.actionType === "META_DELIVERED_QUEUED")).toBe(true);
  });

  test("an order with a checkout Purchase gets a separate OrderDelivered on delivery", async () => {
    const t = setupConvex();
    const { shortCode } = await placeCheckout(t);
    const order = await t.run((ctx) =>
      ctx.db
        .query("orders")
        .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
        .first(),
    );
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await admin.mutation(api.orders.updateGenericStatus, { orderId: order!._id, newState: "CONFIRMED" });
    await admin.mutation(api.orders.updateGenericStatus, { orderId: order!._id, newState: "DELIVERED" });

    const events = await t.run((ctx) =>
      ctx.db
        .query("meta_events")
        .filter((q) => q.eq(q.field("shortCode"), shortCode))
        .collect(),
    );
    expect(events.map((e) => [e.eventName, e.eventId, e.value])).toEqual([
      ["Purchase", `purchase-${shortCode}`, 1600],
      ["OrderDelivered", `delivered-${shortCode}`, 1600],
    ]);
  });

  test("re-delivering an order never queues a second OrderDelivered", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);
    await confirmAndShip(admin, firstLineId);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });
    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "SHIPPED" });
    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" });

    expect((await readState(t)).metaEvents).toHaveLength(1);
  });

  test("a blacklisted phone gets no OrderDelivered, and the skip is audited", async () => {
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
    expect(audit.some((log) => log.actionType === "META_DELIVERED_SKIPPED")).toBe(true);
  });

  test("a rejected delivery (unconfirmed order) queues nothing", async () => {
    const t = setupConvex();
    const { firstLineId } = await seedOrder(t, "AWAITING_VERIFICATION");
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await expect(
      admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "DELIVERED" }),
    ).rejects.toThrow(/Only confirmed orders/);
    expect((await readState(t)).metaEvents).toHaveLength(0);
  });
});

describe("the success page reads the Purchase from the stored order", () => {
  test("returns the same event id, value and contents as the Conversions API event", async () => {
    const t = setupConvex();
    const { shortCode, metaEvents } = await placeCheckout(t);

    const summary = await t.query(api.cart.getPurchaseSummary, { sessionId: "shopper", shortCode });

    expect(summary).toEqual({
      eventId: metaEvents[0].eventId,
      value: metaEvents[0].value,
      currency: "EGP",
      contents: metaEvents[0].contents,
    });
  });

  test("returns nothing to a different browser session or an unknown code", async () => {
    const t = setupConvex();
    const { shortCode } = await placeCheckout(t);

    expect(await t.query(api.cart.getPurchaseSummary, { sessionId: "someone-else", shortCode })).toBeNull();
    expect(await t.query(api.cart.getPurchaseSummary, { sessionId: "shopper", shortCode: "TW-NOPE00" })).toBeNull();
  });

  test("checkout stores a well-formed client IP for the Conversions API and drops anything else", async () => {
    const t = setupConvex();
    const { productId, skuA, governorateId } = await seedOrder(t);
    const place = async (sessionId: string, clientIpAddress: string) => {
      await t.run(async (ctx) => {
        await ctx.db.insert("cart_sessions", {
          sessionId,
          items: [{ productId, skuId: skuA, quantity: 1, addedAt: Date.now() }],
          lastUpdated: Date.now(),
        });
      });
      const shortCode = await t.mutation(api.cart.placeOrderFromSession, {
        sessionId,
        customerName: "Shopper",
        customerPhone: "01198765432",
        customerAddress: "Street 2",
        buildingNumber: "5",
        floorNumber: "2",
        apartmentNumber: "7",
        governorateId,
        metaAttribution: { clientUserAgent: "test-agent", clientIpAddress },
      });
      return await t.run((ctx) =>
        ctx.db
          .query("orders")
          .withIndex("by_shortCode", (q) => q.eq("shortCode", shortCode))
          .first(),
      );
    };

    expect((await place("ipv4", "197.45.10.2"))?.metaAttribution?.clientIpAddress).toBe("197.45.10.2");
    expect((await place("ipv6", "2c0f:fc88::1"))?.metaAttribution?.clientIpAddress).toBe("2c0f:fc88::1");
    expect((await place("junk", "<script>"))?.metaAttribution?.clientIpAddress).toBeUndefined();
  });
});
