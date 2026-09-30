/**
 * Testimonials shown on the landing page. This list is the only source for that
 * section: reviews submitted on product pages never appear there.
 *
 * Add real feedback you received from customers (e.g. WhatsApp messages), with
 * their permission. The section stays hidden while the list is empty; with 6+
 * entries it switches from a grid to two scrolling rows.
 *
 * Example:
 * {
 *   id: "t1",
 *   name: "Customer name",
 *   city: { ar: "القاهرة", en: "Cairo" },
 *   rating: 5,
 *   comment: { ar: "…", en: "…" },          // `en` optional: falls back to `ar`
 *   product: { slug: "headphone", ar: "هيد فون", en: "Headphone" }, // optional
 *   date: "2026-09",                        // YYYY-MM
 * },
 */

export type Testimonial = {
  id: string;
  name: string;
  city?: { ar: string; en: string };
  rating: 1 | 2 | 3 | 4 | 5;
  comment: { ar: string; en?: string };
  product?: { slug: string; ar: string; en: string };
  date: string;
};

export const testimonials: Testimonial[] = [];
