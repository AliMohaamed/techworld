import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { asStaff, seedOrder, setupConvex, type TestConvex } from "./setup";

// End-to-end through the Convex side of the TikTok Events API: checkout →
// outbox → HTTP request. fetch is stubbed, so nothing reaches TikTok.

const PIXEL = "DBM7JTRC77U4J2JQVM8G";
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

type Call = { url: string; init: RequestInit };
let calls: Call[];
let reply: () => Response;

beforeEach(() => {
  // Scheduled sends run only when a test flushes them, so tests never leak into each other.
  vi.useFakeTimers();
  calls = [];
  reply = () => new Response(JSON.stringify({ code: 0, message: "OK" }), { status: 200 });
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return reply();
  });
  vi.stubEnv("TIKTOK_PIXEL_ID", PIXEL);
  vi.stubEnv("TIKTOK_EVENTS_ACCESS_TOKEN", "test-token");
  vi.stubEnv("TIKTOK_TEST_EVENT_CODE", "TEST123");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

async function checkout(t: TestConvex, phone = "01198765432") {
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
    customerName: "Shopper Name",
    customerPhone: phone,
    customerEmail: "  Shopper@Example.COM ",
    customerAddress: "Street 2",
    buildingNumber: "5",
    floorNumber: "2",
    apartmentNumber: "7",
    governorateId,
    tiktokAttribution: {
      ttp: "ttp-cookie",
      ttclid: "E.C.P.click-id",
      userAgent: "Mozilla/5.0 test",
      ipAddress: "41.33.10.20",
      pageUrl: "https://techworldegypt.com/ar/checkout",
    },
  });
  const events = await t.run((ctx) => ctx.db.query("tiktok_events").collect());
  return { shortCode, productId, events };
}

const send = (t: TestConvex, id: Id<"tiktok_events">) => t.action(internal.tiktokEvents.sendEvent, { tiktokEventId: id });
const bodyOf = (call: Call) => JSON.parse(String(call.init.body));

describe("TikTok Events API delivery", () => {
  test("sends PlaceAnOrder and Purchase with the order's real value, ids and hashed customer data", async () => {
    const t = setupConvex();
    const { shortCode, productId, events } = await checkout(t);
    // The real path: placeOrderFromSession schedules the sends.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url).toBe("https://business-api.tiktok.com/open_api/v1.3/event/track/");
      expect((call.init.headers as Record<string, string>)["Access-Token"]).toBe("test-token");
    }

    const bodies = calls.map(bodyOf);
    expect(bodies.map((b) => b.data[0].event).sort()).toEqual(["PlaceAnOrder", "Purchase"]);
    const purchase = bodies.find((b) => b.data[0].event === "Purchase");
    expect(purchase).toMatchObject({ event_source: "web", event_source_id: PIXEL, test_event_code: "TEST123" });

    const data = purchase.data[0];
    expect(data.event_id).toBe(`tt-purchase-${shortCode}`);
    expect(Number.isInteger(data.event_time)).toBe(true);
    // SKU A 600 ×1 + SKU B 500 ×2 = 1600 EGP of products; shipping is excluded.
    expect(data.properties).toMatchObject({ currency: "EGP", value: 1600, content_type: "product", order_id: shortCode });
    expect(data.properties.contents).toEqual([
      { content_id: productId, content_type: "product", content_name: expect.any(String), quantity: 3, price: 533.33 },
    ]);
    expect(data.user).toEqual({
      ttclid: "E.C.P.click-id",
      ttp: "ttp-cookie",
      external_id: sha("+201198765432"),
      phone: sha("+201198765432"),
      email: sha("shopper@example.com"),
      ip: "41.33.10.20",
      user_agent: "Mozilla/5.0 test",
    });
    expect(data.page).toEqual({ url: "https://techworldegypt.com/ar/checkout" });

    const stored = await t.run((ctx) => ctx.db.query("tiktok_events").collect());
    expect(stored.every((e) => e.status === "SENT" && e.attempts === 1 && e.sentAt)).toBe(true);
  });

  test("an event is sent once even if the immediate send and the hourly flush both run", async () => {
    const t = setupConvex();
    const { events } = await checkout(t);
    await send(t, events[0]._id);
    await send(t, events[0]._id);
    await t.action(internal.tiktokEvents.flushPendingEvents, {});
    expect(calls.filter((c) => bodyOf(c).data[0].event_id === events[0].eventId)).toHaveLength(1);
  });

  test("HTTP 200 with a non-zero code is an error, retried, then FAILED after 5 attempts", async () => {
    const t = setupConvex();
    const { events } = await checkout(t);
    reply = () => new Response(JSON.stringify({ code: 40001, message: "Invalid access token" }), { status: 200 });

    for (let i = 0; i < 5; i++) await send(t, events[0]._id);
    const failed = await t.run((ctx) => ctx.db.get(events[0]._id));
    expect(failed).toMatchObject({ status: "FAILED", attempts: 5 });
    expect(failed?.lastError).toContain("Invalid access token");

    // A sixth send does nothing; requeue makes it deliverable again.
    await send(t, events[0]._id);
    expect(calls).toHaveLength(5);
    reply = () => new Response(JSON.stringify({ code: 0, message: "OK" }), { status: 200 });
    await t.mutation(internal.tiktokEvents.requeueFailedEvents, {});
    await send(t, events[0]._id);
    expect((await t.run((ctx) => ctx.db.get(events[0]._id)))?.status).toBe("SENT");
  });

  test("network failures stay PENDING for the hourly retry", async () => {
    const t = setupConvex();
    const { events } = await checkout(t);
    vi.stubGlobal("fetch", async () => {
      throw new Error("ECONNRESET");
    });
    await send(t, events[0]._id);
    expect(await t.run((ctx) => ctx.db.get(events[0]._id))).toMatchObject({ status: "PENDING", attempts: 1 });
  });

  test("events older than 7 days are marked EXPIRED, not sent", async () => {
    const t = setupConvex();
    const { events } = await checkout(t);
    await t.run((ctx) => ctx.db.patch(events[0]._id, { eventTime: Math.floor(Date.now() / 1000) - 8 * 24 * 3600 }));
    await send(t, events[0]._id);
    expect(calls).toHaveLength(0);
    expect((await t.run((ctx) => ctx.db.get(events[0]._id)))?.status).toBe("EXPIRED");
  });

  test("without a token nothing is sent and events wait as PENDING", async () => {
    vi.stubEnv("TIKTOK_EVENTS_ACCESS_TOKEN", "");
    const t = setupConvex();
    const { events } = await checkout(t);
    await send(t, events[0]._id);
    await t.action(internal.tiktokEvents.flushPendingEvents, {});
    expect(calls).toHaveLength(0);
    expect((await t.run((ctx) => ctx.db.get(events[0]._id)))?.status).toBe("PENDING");
  });

  test("test_event_code is omitted when not configured", async () => {
    vi.stubEnv("TIKTOK_TEST_EVENT_CODE", "");
    const t = setupConvex();
    const { events } = await checkout(t);
    await send(t, events[0]._id);
    expect(bodyOf(calls[0])).not.toHaveProperty("test_event_code");
  });

  test("the success page receives the same event ids the server sends", async () => {
    const t = setupConvex();
    const { shortCode, events } = await checkout(t);
    const summary = await t.query(api.cart.getPurchaseSummary, { sessionId: "shopper", shortCode });
    const ids = Object.fromEntries(events.map((e) => [e.eventName, e.eventId]));
    expect(summary?.tiktokEventIds).toEqual({ placeAnOrder: ids.PlaceAnOrder, purchase: ids.Purchase });
    expect(summary?.value).toBe(events[0].value);
  });

  test("placing an order with no TikTok attribution still queues both events", async () => {
    const t = setupConvex();
    await asStaff(t, "noop", []);
    const { productId, skuA, governorateId } = await seedOrder(t);
    await t.run((ctx) =>
      ctx.db.insert("cart_sessions", {
        sessionId: "s2",
        items: [{ productId, skuId: skuA, quantity: 1, addedAt: Date.now() }],
        lastUpdated: Date.now(),
      }),
    );
    await t.mutation(api.cart.placeOrderFromSession, {
      sessionId: "s2",
      customerName: "A",
      customerPhone: "01011111111",
      customerAddress: "Street 22",
      buildingNumber: "1",
      floorNumber: "1",
      apartmentNumber: "1",
      governorateId,
    });
    const events = await t.run((ctx) => ctx.db.query("tiktok_events").collect());
    expect(events).toHaveLength(2);
    await send(t, events[0]._id);
    const user = bodyOf(calls[0]).data[0].user;
    expect(user).toEqual({ external_id: sha("+201011111111"), phone: sha("+201011111111") });
  });
});
