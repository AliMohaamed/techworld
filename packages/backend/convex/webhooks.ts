import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Internal mutation to process inbound webhook payloads from Next.js.
 */
export const processWebhookReceipt = internalMutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Compute Hash for idempotency
    const payloadStr = typeof args.payload === "string" 
      ? args.payload 
      : JSON.stringify(args.payload);
      
    const hash = await sha256(payloadStr);

    const existing = await ctx.db
      .query("webhook_receipts")
      .withIndex("by_hash", (q) => q.eq("payloadHash", hash))
      .first();

    // 2. Return on DUPLICATE
    if (existing) {
      return { status: "duplicate" };
    }

    const payloadObj = typeof args.payload === "string" ? JSON.parse(args.payload) : args.payload;
    const { senderPhone, textBody, mediaId } = payloadObj || {};

    let extractedOrderCode: string | undefined;
    let matchedOrderId: Id<"orders"> | undefined;
    let processingStatus: "MATCHED" | "UNMATCHED" | "INVALID" = "UNMATCHED";

    // 3. Extract Order Short Code via regex
    if (typeof textBody === "string") {
      const match = textBody.match(/ORD-[A-Z0-9]+/i);
      if (match) {
        extractedOrderCode = match[0].toUpperCase();
      }
    }

    if (extractedOrderCode) {
      // 4. Query orders for matching order in AWAITING_VERIFICATION
      const order = await ctx.db
        .query("orders")
        .withIndex("by_shortCode", (q) => q.eq("shortCode", extractedOrderCode as string))
        .filter((q) => q.eq(q.field("state"), "AWAITING_VERIFICATION"))
        .first();

      if (order) {
        matchedOrderId = order._id;
        processingStatus = "MATCHED";

        // Attach media reference and update
        await ctx.db.patch(order._id, {
          paymentReceiptRef: mediaId,
        });

        // 6. Audit Logging on matched
        await ctx.runMutation(internal.audit.logAudit, {
          entityId: order._id,
          actionType: "WEBHOOK_RECEIPT_MATCHED",
          timestamp: Date.now(),
          changes: { paymentReceiptRef: mediaId, source: "WHATSAPP_WEBHOOK" },
        });
      }
    }

    // 5. Insert webhook_receipts
    await ctx.db.insert("webhook_receipts", {
      rawPayload: payloadObj,
      payloadHash: hash,
      senderPhone: senderPhone,
      extractedOrderCode: extractedOrderCode,
      mediaReferenceId: mediaId,
      matchedOrderId: matchedOrderId,
      processingStatus,
      receivedAt: Date.now(),
    });

    return { status: processingStatus === "MATCHED" ? "matched" : "unmatched" };
  },
});

/**
 * Super admin or verifier mutation to manually attach an uploaded screenshot.
 */
export const attachReceiptManually = mutation({
  args: {
    orderId: v.id("orders"),
    mediaStorageId: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "VERIFY_PAYMENTS");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    if (order.state !== "AWAITING_VERIFICATION" && order.state !== "PENDING_PAYMENT_INPUT") {
      throw new Error("Order is not in a payable state to attach receipts.");
    }

    await ctx.db.patch(args.orderId, {
      paymentReceiptRef: args.mediaStorageId,
    });

    const timestamp = Date.now();
    
    // We can insert directly into audit_logs or use logAudit internal mutation
    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.orderId,
      actionType: "MANUAL_RECEIPT_ATTACHED",
      timestamp,
      changes: { 
        paymentReceiptRef: args.mediaStorageId,
        notes: args.notes 
      },
    });

    return {
      success: true,
      timestamp,
    };
  },
});
