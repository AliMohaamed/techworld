/**
 * Single source of truth for the customer-facing contact channels.
 * Values can be overridden per-environment; the defaults keep local dev usable.
 */
export const SUPPORT_WHATSAPP = (
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "201044467598"
).replace(/\D/g, "");

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "Techworldin11@gmail.com";

/** WhatsApp number as customers would type it locally. */
export const SUPPORT_WHATSAPP_DISPLAY = `0${SUPPORT_WHATSAPP.replace(/^20/, "")}`;

/** Call lines, comma-separated when overridden via env. */
export const SUPPORT_PHONES = (
  process.env.NEXT_PUBLIC_SUPPORT_PHONES || "01028010095,01044467598"
)
  .split(",")
  .map((phone) => phone.trim())
  .filter(Boolean);

export const telLink = (phone: string) => `tel:+20${phone.replace(/\D/g, "").replace(/^0/, "")}`;

/** Support desk opening hours, Africa/Cairo. */
export const SUPPORT_HOURS = { fromHour: 10, toHour: 22 } as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
