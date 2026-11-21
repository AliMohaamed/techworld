import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  OrderNotification,
  TelegramConfig,
  buildOrderMessage,
  getTelegramConfig,
} from "./lib/telegram";

/**
 * Sends the full order details to the team's Telegram chat when a customer
 * places an order. `cart.placeOrderFromSession` schedules `notifyOrderPlaced`,
 * so nothing is sent unless the checkout commits, and a Telegram outage never
 * blocks a checkout. Failed sends are retried with backoff; the final failure
 * is written to audit_logs. Config: see getTelegramConfig in lib/telegram.ts.
 */
const TELEGRAM_API = "https://api.telegram.org";
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const BASE_RETRY_DELAY_MS = 30_000;

export const getOrderNotification = internalQuery({
  args: { shortCode: v.string() },
  handler: async (ctx, args): Promise<OrderNotification | null> => {
    const lines = await ctx.db
      .query("orders")
      .withIndex("by_shortCode", (q) => q.eq("shortCode", args.shortCode))
      .collect();
    if (lines.length === 0) return null;
    lines.sort((a, b) => a._creationTime - b._creationTime);
    const first = lines[0];
    const governorate = first.governorateId ? await ctx.db.get(first.governorateId) : null;

    return {
      orderId: first._id,
      shortCode: args.shortCode,
      placedAt: first._creationTime,
      flaggedFraud: lines.some((line) => line.state === "FLAGGED_FRAUD"),
      customerName: first.customerName || "—",
      customerPhone: first.customerPhone,
      customerAltPhone: first.customerAltPhone,
      customerEmail: first.customerEmail,
      governorate: governorate?.name_ar,
      address: first.customerAddress,
      buildingNumber: first.buildingNumber,
      floorNumber: first.floorNumber,
      apartmentNumber: first.apartmentNumber,
      promoCode: first.promo_code_snapshot,
      shippingFee: lines.reduce((sum, line) => sum + (line.appliedShippingFee ?? 0), 0),
      lines: await Promise.all(
        lines.map(async (line) => {
          const product = await ctx.db.get(line.productId);
          const sku = await ctx.db.get(line.skuId);
          const discount = line.discount_applied ?? 0;
          return {
            productName: product?.name_ar || product?.name_en || "منتج محذوف",
            variantName: sku?.variantName,
            quantity: line.quantity,
            subtotal: line.total_price + discount,
            discount,
          };
        }),
      ),
    };
  },
});

export const recordFailure = internalMutation({
  args: { shortCode: v.string(), attempts: v.number(), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("audit_logs", {
      entityId: args.shortCode,
      actionType: "TELEGRAM_NOTIFICATION_FAILED",
      timestamp: Date.now(),
      changes: { attempts: args.attempts, error: args.error.slice(0, 1000) },
    });
  },
});

type SendResult =
  | { ok: true }
  | { ok: false; retryable: boolean; error: string; retryAfterMs?: number };

async function callTelegram(config: TelegramConfig, method: string, body: Record<string, unknown>): Promise<SendResult & { result?: unknown }> {
  let response: Response;
  try {
    response = await fetch(`${TELEGRAM_API}/bot${config.botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network error or timeout: Telegram may or may not have the message, but
    // a rare duplicate beats a lost order notification.
    return { ok: false, retryable: true, error: error instanceof Error ? error.message : String(error) };
  }

  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    result?: unknown;
    description?: string;
    parameters?: { retry_after?: number };
  } | null;
  if (response.ok && payload?.ok) return { ok: true, result: payload.result };

  const error = `HTTP ${response.status}: ${payload?.description ?? "no description"}`;
  const retryAfter = payload?.parameters?.retry_after;
  return {
    ok: false,
    // 4xx other than rate limiting means bad token/chat id/markup; retrying won't help.
    retryable: response.status === 429 || response.status >= 500,
    error,
    retryAfterMs: retryAfter ? retryAfter * 1000 : undefined,
  };
}

function sendMessage(config: TelegramConfig, text: string) {
  return callTelegram(config, "sendMessage", {
    chat_id: config.chatId,
    message_thread_id: config.messageThreadId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

export const notifyOrderPlaced = internalAction({
  args: { shortCode: v.string(), attempt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
    const config = getTelegramConfig();
    if (!config) {
      console.warn(`[Telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set; skipped ${args.shortCode}`);
      return;
    }

    const order = await ctx.runQuery(internal.telegram.getOrderNotification, { shortCode: args.shortCode });
    if (!order) {
      console.warn(`[Telegram] order ${args.shortCode} not found`);
      return;
    }

    const result = await sendMessage(config, buildOrderMessage(order));
    if (result.ok) return;

    if (result.retryable && attempt < MAX_ATTEMPTS) {
      const delay = Math.max(result.retryAfterMs ?? 0, BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
      console.warn(`[Telegram] ${args.shortCode} attempt ${attempt} failed (${result.error}); retrying in ${delay}ms`);
      await ctx.scheduler.runAfter(delay, internal.telegram.notifyOrderPlaced, {
        shortCode: args.shortCode,
        attempt: attempt + 1,
      });
      return;
    }

    console.error(`[Telegram] ${args.shortCode} failed after ${attempt} attempt(s): ${result.error}`);
    await ctx.runMutation(internal.telegram.recordFailure, {
      shortCode: args.shortCode,
      attempts: attempt,
      error: result.error,
    });
  },
});

/**
 * Setup helper: `npx convex run telegram:listChats` after sending any message
 * to the bot (or adding it to the group) prints the chat ids it can see.
 */
export const listChats = internalAction({
  args: {},
  handler: async () => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!botToken) throw new Error("Set TELEGRAM_BOT_TOKEN first.");
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getUpdates`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: Array<Record<string, { chat?: { id: number; type: string; title?: string; username?: string; first_name?: string } }>>;
    };
    if (!payload.ok) throw new Error(payload.description ?? `HTTP ${response.status}`);

    const chats = new Map<number, { id: number; type: string; name?: string }>();
    for (const update of payload.result ?? []) {
      for (const value of Object.values(update)) {
        const chat = typeof value === "object" && value ? value.chat : undefined;
        if (chat) chats.set(chat.id, { id: chat.id, type: chat.type, name: chat.title ?? chat.username ?? chat.first_name });
      }
    }
    return [...chats.values()];
  },
});

/** Setup helper: `npx convex run telegram:sendTestMessage` verifies the token and chat id. */
export const sendTestMessage = internalAction({
  args: {},
  handler: async () => {
    const config = getTelegramConfig();
    if (!config) throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID first.");
    const result = await sendMessage(config, "✅ <b>TechWorld</b>: إشعارات الطلبات تعمل.");
    if (!result.ok) throw new Error(result.error);
    return "sent";
  },
});
