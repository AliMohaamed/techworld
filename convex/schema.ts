import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    permissions: v.array(
      v.union(v.literal("VIEW_FINANCIALS"), v.literal("VERIFY_PAYMENTS"))
    ),
  }).index("by_email", ["email"]),

  products: defineTable({
    name: v.string(),
    price: v.number(),
    // Virtual stock available for new PENDING_PAYMENT_INPUT orders.
    display_stock: v.number(),
    // Physical stock. Strictly permitted to drop to -5 (Oversell Buffer). 
    // Mutations must throw error if below -5.
    real_stock: v.number(),
  }),

  orders: defineTable({
    userId: v.id("users"),
    productId: v.id("products"),
    quantity: v.number(),
    state: v.union(
      v.literal("PENDING_PAYMENT_INPUT"),
      v.literal("AWAITING_VERIFICATION"),
      v.literal("CONFIRMED"),
      v.literal("STALLED_PAYMENT"),
      v.literal("CANCELLED")
    ),
  }),

  audit_logs: defineTable({
    userId: v.optional(v.id("users")),
    entityId: v.string(),
    actionType: v.string(),
    timestamp: v.number(),
    changes: v.any(),
  }),
});
