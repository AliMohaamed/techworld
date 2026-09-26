/**
 * Single source of truth for the customer-facing contact channels.
 * Values can be overridden per-environment; the defaults keep local dev usable.
 */
export const SUPPORT_WHATSAPP = (
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "201099684535"
).replace(/\D/g, "");

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@techworld-store.com";

export const SUPPORT_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+20 109 968 4535";

/** Support desk opening hours, Africa/Cairo. */
export const SUPPORT_HOURS = { fromHour: 10, toHour: 22 } as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
