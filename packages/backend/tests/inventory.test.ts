import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { asStaff, readState, seedOrder, setupConvex, type TestConvex } from "./setup";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function setStock(t: TestConvex, skuId: Id<"skus">, stock: { real_stock: number }) {
  await t.run(async (ctx) => {
    await ctx.db.patch(skuId, stock);
  });
}

async function stockOf(t: TestConvex, skuId: Id<"skus">) {
  return await t.run(async (ctx) => {
    const sku = await ctx.db.get(skuId);
    return { real: sku!.real_stock };
  });
}

// The seeded order has 2 x SKU A and 1 x SKU B.
describe("real_stock deduction and restore stay symmetric", () => {
  test("short stock is deducted in full (into the buffer), and cancelling restores exactly that", async () => {
    const t = setupConvex();
    const { firstLineId, skuA } = await seedOrder(t);
    await setStock(t, skuA, { real_stock: 1 });
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });
    expect((await stockOf(t, skuA)).real).toBe(-1); // previously clamped to 0, then restored to 2

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CANCELLED" });
    expect((await stockOf(t, skuA)).real).toBe(1); // back where it started: no phantom unit
  });

  test("stock may go down to exactly -5", async () => {
    const t = setupConvex();
    const { firstLineId, skuA } = await seedOrder(t);
    await setStock(t, skuA, { real_stock: -3 });
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });

    expect((await stockOf(t, skuA)).real).toBe(-5);
  });

  test("going below -5 rejects the whole change and writes nothing", async () => {
    const t = setupConvex();
    const { firstLineId, skuA, skuB } = await seedOrder(t);
    await setStock(t, skuA, { real_stock: -4 });
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await expect(
      admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" }),
    ).rejects.toThrow(/OUT_OF_STOCK|enough real stock/);

    const { lines, metaEvents } = await readState(t);
    expect(lines.map((l) => l.state)).toEqual(["AWAITING_VERIFICATION", "AWAITING_VERIFICATION"]);
    expect((await stockOf(t, skuA)).real).toBe(-4);
    expect((await stockOf(t, skuB)).real).toBe(10); // the other line's deduction was rolled back too
    expect(metaEvents).toHaveLength(0);
  });

  test("updateOrderStatus uses the same -5 floor", async () => {
    const t = setupConvex();
    const { firstLineId, skuA } = await seedOrder(t);
    await setStock(t, skuA, { real_stock: -3 });
    const verifier = await asStaff(t, "verifier", ["VERIFY_PAYMENTS"]);

    await verifier.mutation(api.orders.updateOrderStatus, { orderId: firstLineId, newState: "CONFIRMED" });

    expect((await stockOf(t, skuA)).real).toBe(-5);
  });

  test("RTO restores the full quantity", async () => {
    const t = setupConvex();
    const { firstLineId, skuA } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS", "MANAGE_SHIPPING_STATUS"]);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });
    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "SHIPPED" });
    await admin.mutation(api.orders.updateRto, { orderId: firstLineId });

    expect((await stockOf(t, skuA)).real).toBe(10);
  });
});

describe("cancellation only touches real_stock that was deducted", () => {
  test("cancelling an unpaid order leaves real_stock alone", async () => {
    const t = setupConvex();
    const { firstLineId, skuA, skuB } = await seedOrder(t);
    const viewer = await asStaff(t, "viewer", ["VIEW_ORDERS"]);

    await viewer.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CANCELLED" });

    expect(await stockOf(t, skuA)).toEqual({ real: 10 });
    expect(await stockOf(t, skuB)).toEqual({ real: 10 });
  });

  test("cancelling a confirmed order restores real_stock", async () => {
    const t = setupConvex();
    const { firstLineId, skuA } = await seedOrder(t);
    const admin = await asStaff(t, "admin", ["VIEW_ORDERS", "VERIFY_PAYMENTS"]);

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CONFIRMED" });
    expect(await stockOf(t, skuA)).toEqual({ real: 8 });

    await admin.mutation(api.orders.updateGenericStatus, { orderId: firstLineId, newState: "CANCELLED" });
    expect(await stockOf(t, skuA)).toEqual({ real: 10 });
  });
});

describe("real_stock never reaches the storefront", () => {
  test("cart SKUs expose inStock, not the stock count", async () => {
    const t = setupConvex();
    const { productId, skuA } = await seedOrder(t);
    await t.mutation(api.cart.addToCart, { sessionId: "shopper", productId, skuId: skuA, quantity: 1 });

    const cart = await t.query(api.cart.getCart, { sessionId: "shopper" });
    const sku = cart.items[0].sku!;

    expect(sku).not.toHaveProperty("real_stock");
    expect(sku.inStock).toBe(true);
  });

  test("adding more than real_stock is rejected", async () => {
    const t = setupConvex();
    const { productId, skuA } = await seedOrder(t);
    await setStock(t, skuA, { real_stock: 1 });

    await expect(
      t.mutation(api.cart.addToCart, { sessionId: "shopper", productId, skuId: skuA, quantity: 2 }),
    ).rejects.toThrow(/INSUFFICIENT_STOCK|Insufficient stock/);
  });
});
