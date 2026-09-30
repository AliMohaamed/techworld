import type { Testimonial } from "./testimonials";

/**
 * DESIGN PREVIEW ONLY — invented sample content for evaluating the reviews
 * layout. Rendered only by `next dev` while `testimonials` is empty; never
 * shown in a production build. Do not move these into `testimonials.ts`.
 */
export const previewTestimonials: Testimonial[] = [
  {
    id: "preview-1",
    name: "أحمد سامي",
    city: { ar: "القاهرة", en: "Cairo" },
    rating: 5,
    comment: {
      ar: "السماعة وصلت في يومين والتغليف ممتاز. العزل قوي جداً والبطارية بتقعد معايا أسبوع تقريباً.",
      en: "The headphones arrived in two days, well packed. Noise isolation is strong and the battery lasts me about a week.",
    },
    product: { slug: "headphone-1", ar: "هيد فون", en: "Headphone" },
    date: "2026-09",
  },
  {
    id: "preview-2",
    name: "منة الله حسن",
    city: { ar: "الإسكندرية", en: "Alexandria" },
    rating: 5,
    comment: {
      ar: "البروجكتور صورته واضحة حتى والنور مش مطفي خالص. بقينا نتفرج على الماتشات على الحيطة.",
      en: "The projector image is clear even without turning the lights fully off. We watch matches on the wall now.",
    },
    date: "2026-08",
  },
  {
    id: "preview-3",
    name: "محمد عبد الرحمن",
    city: { ar: "المنصورة", en: "Mansoura" },
    rating: 4,
    comment: {
      ar: "السبيكر صوته عالي والبيز حلو. كنت أتمنى يكون أخف شوية بس في العموم يستاهل سعره.",
      en: "The speaker is loud with nice bass. I wish it were a bit lighter, but overall it's worth the price.",
    },
    date: "2026-08",
  },
  {
    id: "preview-4",
    name: "نورهان خالد",
    city: { ar: "الجيزة", en: "Giza" },
    rating: 5,
    comment: {
      ar: "الساعة شكلها شيك جداً وبتقيس النبض والنوم بدقة. خدمة العملاء ردوا عليا على واتساب بسرعة.",
      en: "The watch looks really elegant and tracks heart rate and sleep accurately. Support answered me quickly on WhatsApp.",
    },
    product: { slug: "watch", ar: "ساعة", en: "Watch" },
    date: "2026-09",
  },
  {
    id: "preview-5",
    name: "كريم مصطفى",
    city: { ar: "طنطا", en: "Tanta" },
    rating: 5,
    comment: {
      ar: "الإيربودز مريحة في الودن ومبتقعش وأنا بجري. الشحن سريع والعلبة صغيرة في الجيب.",
      en: "The earbuds are comfortable and don't fall out while running. Charging is fast and the case fits in a pocket.",
    },
    date: "2026-07",
  },
  {
    id: "preview-6",
    name: "سارة إبراهيم",
    city: { ar: "أسيوط", en: "Assiut" },
    rating: 4,
    comment: {
      ar: "الباور بانك بيشحن الموبايل مرتين ونص. الشحن لأسيوط أخد ٤ أيام بس المندوب كان محترم جداً.",
      en: "The power bank charges my phone two and a half times. Delivery to Assiut took 4 days, but the courier was very polite.",
    },
    date: "2026-08",
  },
  {
    id: "preview-7",
    name: "يوسف طارق",
    city: { ar: "الزقازيق", en: "Zagazig" },
    rating: 5,
    comment: {
      ar: "الكيبورد الميكانيكال إحساسه رائع والإضاءة قابلة للتحكم. أحسن حاجة اشتريتها للجيمنج السنة دي.",
      en: "The mechanical keyboard feels great and the lighting is customizable. Best gaming purchase I've made this year.",
    },
    date: "2026-09",
  },
  {
    id: "preview-8",
    name: "دينا فتحي",
    city: { ar: "بورسعيد", en: "Port Said" },
    rating: 5,
    comment: {
      ar: "طلبت سماعة هدية لأخويا ووصلت في معادها بالظبط. الدفع كان سهل بإنستاباي والتأكيد جه على طول.",
      en: "I ordered headphones as a gift for my brother and they arrived right on time. Paying with InstaPay was easy and confirmation came instantly.",
    },
    date: "2026-07",
  },
];
