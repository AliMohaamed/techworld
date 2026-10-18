/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import type { Doc, Id } from "../convex/_generated/dataModel";
import type { Permission } from "../convex/lib/permissions";

// Tests live outside convex/ so they are never bundled into a deployment.
export const modules = import.meta.glob("../convex/**/*.ts");

export function setupConvex() {
  return convexTest(schema, modules);
}

export type TestConvex = ReturnType<typeof setupConvex>;

/** Inserts a staff member and returns a client authenticated as them. */
export async function asStaff(t: TestConvex, name: string, permissions: Permission[]) {
  const identifier = `auth|${name}`;
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      name,
      email: `${name}@techworld.test`,
      identifier,
      permissions,
      isActive: true,
    });
  });
  return t.withIdentity({ subject: identifier, email: `${name}@techworld.test` });
}

export const PHONE = "01012345678";
export const SHORT_CODE = "TW-TEST01";

/** A two-line customer order: 1000 + 500 EGP after discount, 50 EGP shipping on the first line. */
export async function seedOrder(t: TestConvex, state: Doc<"orders">["state"] = "AWAITING_VERIFICATION") {
  return await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", { name_ar: "ف", name_en: "Cat", isActive: true, slug: "cat" });
    const productId = await ctx.db.insert("products", {
      categoryId,
      name_ar: "منتج",
      name_en: "Product",
      images: [],
      selling_price: 600,
      status: "PUBLISHED",
    });
    const sku = (name: string, price: number) =>
      ctx.db.insert("skus", {
        productId,
        variantName: name,
        variantAttributes: {},
        real_stock: 10,
        price,
      });
    const skuA = await sku("A", 600);
    const skuB = await sku("B", 500);
    const governorateId = await ctx.db.insert("governorates", {
      name_ar: "القاهرة",
      name_en: "Cairo",
      shippingFee: 50,
      isActive: true,
    });
    const line = (skuId: Id<"skus">, quantity: number, total: number, shipping: number) =>
      ctx.db.insert("orders", {
        sessionId: "session-1",
        customerName: "Test Customer",
        customerPhone: PHONE,
        customerAddress: "Street 1",
        governorateId,
        appliedShippingFee: shipping,
        productId,
        skuId,
        quantity,
        total_price: total,
        state,
        shortCode: SHORT_CODE,
      });
    const firstLineId = await line(skuA, 2, 1000, 50);
    await line(skuB, 1, 500, 0);
    return { firstLineId, productId, skuA, skuB, governorateId };
  });
}

export async function readState(t: TestConvex) {
  return await t.run(async (ctx) => ({
    lines: await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", SHORT_CODE))
      .collect(),
    skus: await ctx.db.query("skus").collect(),
    metaEvents: await ctx.db.query("meta_events").collect(),
    audit: await ctx.db.query("audit_logs").collect(),
  }));
}
