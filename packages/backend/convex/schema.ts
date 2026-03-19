import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { permissionValidators } from "./lib/permissions";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    identifier: v.optional(v.string()),
    permissions: v.array(v.union(...permissionValidators)),
  })
    .index("by_email", ["email"])
    .index("by_identifier", ["identifier"]),

  categories: defineTable({
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    thumbnailImageId: v.optional(v.string()),
    isActive: v.boolean(),
    slug: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),

  products: defineTable({
    display_stock: v.number(),
    real_stock: v.number(),
    categoryId: v.id("categories"),
    name_ar: v.string(),
    name_en: v.string(),
    description_ar: v.optional(v.string()),
    description_en: v.optional(v.string()),
    images: v.array(v.string()),
    selling_price: v.number(),
    cogs: v.optional(v.number()),
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED")),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
    slug: v.optional(v.string()),
  })
    .index("by_category", ["categoryId"])
    .index("by_status", ["status"])
    .index("by_category_status_price", ["categoryId", "status", "selling_price"])
    .index("by_status_price", ["status", "selling_price"])
    .index("by_slug", ["slug"])
    .searchIndex("search_name", { searchField: "name" }),

  cart_sessions: defineTable({
    sessionId: v.string(),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        addedAt: v.number(),
      })
    ),
    lastUpdated: v.number(),
  }).index("by_session", ["sessionId"]),

  webhook_receipts: defineTable({
    rawPayload: v.any(),
    payloadHash: v.string(),
    senderPhone: v.optional(v.string()),
    extractedOrderCode: v.optional(v.string()),
    mediaReferenceId: v.optional(v.string()),
    matchedOrderId: v.optional(v.id("orders")),
    processingStatus: v.union(
      v.literal("MATCHED"),
      v.literal("UNMATCHED"),
      v.literal("DUPLICATE"),
      v.literal("INVALID")
    ),
    receivedAt: v.number(),
  })
    .index("by_hash", ["payloadHash"])
    .index("by_status", ["processingStatus"]),

  orders: defineTable({
    userId: v.optional(v.id("users")),
    sessionId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    productId: v.id("products"),
    quantity: v.number(),
    total_price: v.number(),
    state: v.union(
      v.literal("PENDING_PAYMENT_INPUT"),
      v.literal("AWAITING_VERIFICATION"),
      v.literal("CONFIRMED"),
      v.literal("STALLED_PAYMENT"),
      v.literal("CANCELLED")
    ),
    shortCode: v.optional(v.string()),
    paymentReceiptRef: v.optional(v.string()),
  })
    .index("by_shortCode", ["shortCode"])
    .index("by_session", ["sessionId"]),

  audit_logs: defineTable({
    userId: v.optional(v.id("users")),
    entityId: v.string(),
    actionType: v.string(),
    timestamp: v.number(),
    changes: v.any(),
  }),
});
