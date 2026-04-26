import { internalAction, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { buildMessageForState, formatChatId, sendViaGreenApi, sendViaStub } from "./lib/whatsapp";

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Internal mutation to process inbound webhook receipts from the Next.js adapter.
 * Matches orders by TW- short code (primary) or sender phone (fallback).
 * Media download is scheduled as a separate action — mutations cannot call fetch.
 */
export const processInboundReceipt = mutation({
  args: {
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // 1. Idempotency via SHA-256 over the raw payload
    const payloadStr =
      typeof args.payload === "string" ? args.payload : JSON.stringify(args.payload);
    const hash = await sha256(payloadStr);

    const existing = await ctx.db
      .query("webhook_receipts")
      .withIndex("by_hash", (q) => q.eq("payloadHash", hash))
      .first();

    if (existing) {
      return { status: "duplicate" };
    }

    const payloadObj =
      typeof args.payload === "string" ? JSON.parse(args.payload) : args.payload;
    const { senderPhone, textBody, mediaUrl } = payloadObj || {};

    let extractedOrderCode: string | undefined;
    let matchedOrderId: Id<"orders"> | undefined;
    let processingStatus: "MATCHED" | "UNMATCHED" | "INVALID" = "UNMATCHED";

    // 2. Primary match: TW- short code extracted from textBody or image caption.
    // Short codes are issued by cart.ts as TW-XXXXXX (six base-36 chars).
    if (typeof textBody === "string") {
      const match = textBody.match(/TW-[A-Z0-9]+/i);
      if (match) {
        extractedOrderCode = match[0].toUpperCase();
      }
    }

    let matchedOrder = null;

    if (extractedOrderCode) {
      matchedOrder = await ctx.db
        .query("orders")
        .withIndex("by_shortCode", (q) =>
          q.eq("shortCode", extractedOrderCode as string),
        )
        .filter((q) =>
          q.or(
            q.eq(q.field("state"), "PENDING_PAYMENT_INPUT"),
            q.eq(q.field("state"), "AWAITING_VERIFICATION"),
          ),
        )
        .first();
    }

    // 3. Fallback: match by sender phone — picks the most recent eligible order
    if (!matchedOrder && typeof senderPhone === "string" && senderPhone.length > 0) {
      matchedOrder = await ctx.db
        .query("orders")
        .withIndex("by_customerPhone", (q) => q.eq("customerPhone", senderPhone))
        .filter((q) =>
          q.or(
            q.eq(q.field("state"), "PENDING_PAYMENT_INPUT"),
            q.eq(q.field("state"), "AWAITING_VERIFICATION"),
          ),
        )
        .order("desc")
        .first();
    }

    if (matchedOrder) {
      matchedOrderId = matchedOrder._id;
      processingStatus = "MATCHED";

      // Schedule media download — fetch is not allowed inside a mutation
      if (typeof mediaUrl === "string" && mediaUrl.length > 0) {
        await ctx.scheduler.runAfter(0, internal.webhooks.downloadAndAttachMedia, {
          orderId: matchedOrder._id,
          mediaUrl,
        });
      }

      await ctx.runMutation(internal.audit.logAudit, {
        entityId: matchedOrder._id,
        actionType: "WEBHOOK_RECEIPT_MATCHED",
        changes: { senderPhone, hasMedia: !!mediaUrl, source: "WHATSAPP_WEBHOOK" },
      });
    }

    // 4. Insert receipt row for audit trail regardless of match outcome
    await ctx.db.insert("webhook_receipts", {
      rawPayload: payloadObj,
      payloadHash: hash,
      senderPhone,
      extractedOrderCode,
      mediaReferenceId: typeof mediaUrl === "string" ? mediaUrl : undefined,
      matchedOrderId,
      processingStatus,
      receivedAt: Date.now(),
    });

    return { status: processingStatus === "MATCHED" ? "matched" : "unmatched" };
  },
});

/**
 * Internal action that downloads a WhatsApp media URL and stores it in Convex storage.
 * Scheduled by processInboundReceipt — the separation is required because mutations
 * cannot call fetch.
 */
export const downloadAndAttachMedia = internalAction({
  args: {
    orderId: v.id("orders"),
    mediaUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(args.mediaUrl);
      if (!response.ok) {
        console.error(`Media download failed: ${response.status} — ${args.mediaUrl}`);
        await ctx.runMutation(internal.audit.logAudit, {
          entityId: args.orderId,
          actionType: "WEBHOOK_MEDIA_DOWNLOAD_FAILED",
          changes: { statusCode: response.status, mediaUrl: args.mediaUrl },
        });
        return;
      }

      const blob = await response.blob();
      const storageId = await ctx.storage.store(blob);

      await ctx.runMutation(internal.webhooks.applyReceiptToOrder, {
        orderId: args.orderId,
        storageId,
      });
    } catch (e) {
      console.error("Error downloading or storing media:", e);
      await ctx.runMutation(internal.audit.logAudit, {
        entityId: args.orderId,
        actionType: "WEBHOOK_MEDIA_DOWNLOAD_FAILED",
        changes: { error: String(e), mediaUrl: args.mediaUrl },
      });
    }
  },
});

/**
 * Internal mutation to apply a downloaded receipt to an order.
 * Auto-advances PENDING_PAYMENT_INPUT → AWAITING_VERIFICATION once a receipt is attached.
 */
export const applyReceiptToOrder = internalMutation({
  args: {
    orderId: v.id("orders"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      console.error(`Order ${args.orderId} not found when applying receipt`);
      return;
    }

    const patch: {
      paymentReceiptRef: Id<"_storage">;
      state?: "AWAITING_VERIFICATION";
    } = { paymentReceiptRef: args.storageId };

    if (order.state === "PENDING_PAYMENT_INPUT") {
      patch.state = "AWAITING_VERIFICATION";
    }

    await ctx.db.patch(args.orderId, patch);

    await ctx.runMutation(internal.audit.logAudit, {
      entityId: args.orderId,
      actionType: "WEBHOOK_RECEIPT_ATTACHED",
      changes: {
        storageId: args.storageId,
        previousState: order.state,
        newState: patch.state ?? order.state,
        source: "WHATSAPP_WEBHOOK",
      },
    });
  },
});

/**
 * Super admin or verifier mutation to manually attach an uploaded screenshot.
 */
export const attachReceiptManually = mutation({
  args: {
    orderId: v.id("orders"),
    mediaStorageId: v.id("_storage"),
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

    await ctx.runMutation(internal.audit.logAudit, {
      userId: user._id,
      entityId: args.orderId,
      actionType: "MANUAL_RECEIPT_ATTACHED",
      changes: {
        paymentReceiptRef: args.mediaStorageId,
        notes: args.notes,
      },
    });

    return { success: true };
  },
});

/**
 * Internal action to dispatch WhatsApp notifications for order state transitions.
 * Provider is selected via WHATSAPP_PROVIDER env var: "stub" (default) or "green-api".
 * States without a defined message template are silently skipped.
 */
export const dispatchWhatsAppMessage = internalAction({
  args: {
    orderId: v.id("orders"),
    shortCode: v.string(),
    customerPhone: v.string(),
    customerName: v.string(),
    newState: v.string(),
    totalPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const text = buildMessageForState({
      state: args.newState,
      shortCode: args.shortCode,
      customerName: args.customerName,
      totalPrice: args.totalPrice,
    });

    if (!text) return;

    const chatId = formatChatId(args.customerPhone);
    const provider = process.env.WHATSAPP_PROVIDER ?? "stub";

    try {
      if (provider === "green-api") {
        const res = await sendViaGreenApi(chatId, text);
        if (!res.ok) {
          await ctx.runMutation(internal.audit.logAudit, {
            entityId: args.orderId,
            actionType: "WHATSAPP_DISPATCH_FAILED",
            changes: { statusCode: res.status, state: args.newState, provider },
          });
        }
      } else {
        await sendViaStub(chatId, text);
      }
    } catch (e) {
      console.error("Error dispatching WhatsApp message:", e);
      await ctx.runMutation(internal.audit.logAudit, {
        entityId: args.orderId,
        actionType: "WHATSAPP_DISPATCH_FAILED",
        changes: { error: String(e), state: args.newState, provider },
      });
    }
  },
});
