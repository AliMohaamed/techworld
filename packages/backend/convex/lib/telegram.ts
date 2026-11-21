/**
 * Pure helpers for the Telegram order notification: config, HTML escaping and
 * message formatting. No Convex context here, so it stays easy to test.
 */

/** Telegram rejects messages longer than this (after entity parsing). */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export type TelegramConfig = {
  botToken: string;
  chatId: string;
  /** Forum topic inside a supergroup, when the team uses topics. */
  messageThreadId?: number;
};

/**
 * Convex env vars:
 * - TELEGRAM_BOT_TOKEN          token from @BotFather, never exposed to clients
 * - TELEGRAM_CHAT_ID            group/channel/user id that receives the orders
 * - TELEGRAM_MESSAGE_THREAD_ID  optional forum topic id
 * - ADMIN_URL                   optional admin base URL for the "open order" link
 *                               (falls back to SITE_URL)
 */
export function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) return null;
  const threadId = Number(process.env.TELEGRAM_MESSAGE_THREAD_ID?.trim());
  return {
    botToken,
    chatId,
    messageThreadId: Number.isInteger(threadId) && threadId > 0 ? threadId : undefined,
  };
}

/** Admin order page URL, or null when the admin only runs on localhost. */
export function adminOrderUrl(orderId: string): string | null {
  const base = (process.env.ADMIN_URL ?? process.env.SITE_URL)?.trim().replace(/\/+$/, "");
  if (!base) return null;
  try {
    const { hostname, protocol } = new URL(base);
    if (protocol !== "https:" || hostname === "localhost" || hostname === "127.0.0.1") return null;
  } catch {
    return null;
  }
  return `${base}/ar/orders/${orderId}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Egyptian mobile number to a wa.me link, matching lib/whatsapp.ts formatChatId. */
function whatsappLink(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  const intl = digits.startsWith("20") ? digits : digits.startsWith("0") ? `20${digits.slice(1)}` : `20${digits}`;
  return `https://wa.me/${intl}`;
}

function formatMoney(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} ج.م`;
}

function formatCairoTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

export type OrderNotificationLine = {
  productName: string;
  variantName?: string;
  quantity: number;
  /** Line total before the promo discount. */
  subtotal: number;
  discount: number;
};

export type OrderNotification = {
  orderId: string;
  shortCode: string;
  placedAt: number;
  flaggedFraud: boolean;
  customerName: string;
  customerPhone?: string;
  customerAltPhone?: string;
  customerEmail?: string;
  governorate?: string;
  address?: string;
  buildingNumber?: string;
  floorNumber?: string;
  apartmentNumber?: string;
  promoCode?: string;
  shippingFee: number;
  lines: OrderNotificationLine[];
};

export function buildOrderMessage(order: OrderNotification): string {
  const e = escapeHtml;
  const subtotal = order.lines.reduce((sum, line) => sum + line.subtotal, 0);
  const discount = order.lines.reduce((sum, line) => sum + line.discount, 0);
  const total = subtotal - discount + order.shippingFee;
  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  const header: string[] = [`🛒 <b>طلب جديد</b> <code>${e(order.shortCode)}</code>`];
  if (order.flaggedFraud) {
    header.push("⚠️ <b>رقم الهاتف في القائمة السوداء — تم تعليم الطلب كاحتيال</b>");
  }
  header.push(`🕒 ${e(formatCairoTime(order.placedAt))}`);

  const customer: string[] = ["👤 <b>العميل</b>", e(order.customerName)];
  if (order.customerPhone) {
    customer.push(
      `📞 <code>${e(order.customerPhone)}</code> · <a href="${whatsappLink(order.customerPhone)}">واتساب</a>`,
    );
  }
  if (order.customerAltPhone) customer.push(`📞 <code>${e(order.customerAltPhone)}</code> (رقم إضافي)`);
  if (order.customerEmail) customer.push(`✉️ ${e(order.customerEmail)}`);

  const address: string[] = ["📍 <b>العنوان</b>"];
  if (order.governorate) address.push(e(order.governorate));
  if (order.address) address.push(e(order.address));
  const unit = [
    order.buildingNumber && `عمارة ${order.buildingNumber}`,
    order.floorNumber && `دور ${order.floorNumber}`,
    order.apartmentNumber && `شقة ${order.apartmentNumber}`,
  ].filter(Boolean);
  if (unit.length > 0) address.push(e(unit.join("، ")));

  const items: string[] = [`🧾 <b>المنتجات</b> (${itemCount})`];
  order.lines.forEach((line, index) => {
    const variant = line.variantName ? ` — ${e(line.variantName)}` : "";
    const unitPrice = line.quantity > 0 ? line.subtotal / line.quantity : line.subtotal;
    items.push(
      `${index + 1}. ${e(line.productName)}${variant}\n` +
        `    ${line.quantity} × ${formatMoney(unitPrice)} = ${formatMoney(line.subtotal)}`,
    );
  });

  const totals: string[] = [`المجموع الفرعي: ${formatMoney(subtotal)}`];
  if (discount > 0) {
    const code = order.promoCode ? ` (<code>${e(order.promoCode)}</code>)` : "";
    totals.push(`الخصم${code}: −${formatMoney(discount)}`);
  }
  totals.push(`الشحن: ${order.shippingFee > 0 ? formatMoney(order.shippingFee) : "مجاني"}`);
  totals.push(`💰 <b>الإجمالي: ${formatMoney(total)}</b>`);
  totals.push("💵 الدفع عند الاستلام");

  const sections = [header, customer, address, items, totals].map((s) => s.join("\n"));
  const link = adminOrderUrl(order.orderId);
  if (link) sections.push(`<a href="${e(link)}">فتح الطلب في لوحة التحكم</a>`);

  return truncateMessage(sections.join("\n\n"));
}

/** Keeps the message under Telegram's limit without cutting an HTML tag in half. */
function truncateMessage(text: string): string {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return text;
  const suffix = "\n…";
  let cut = text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - suffix.length);
  cut = cut.slice(0, cut.lastIndexOf("\n"));
  // Drop any tag left open on the last kept line.
  const openTags = (cut.match(/<(b|code|a)[\s>]/g) ?? []).length;
  const closeTags = (cut.match(/<\/(b|code|a)>/g) ?? []).length;
  if (openTags !== closeTags) cut = cut.replace(/<[^>]*>/g, "");
  return cut + suffix;
}
