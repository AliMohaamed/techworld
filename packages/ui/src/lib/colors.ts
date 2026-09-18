export interface ColorPreset {
  nameEn: string;
  nameAr: string;
  hex: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { nameEn: "Black", nameAr: "أسود", hex: "#18181b" },
  { nameEn: "White", nameAr: "أبيض", hex: "#ffffff" },
  { nameEn: "Red", nameAr: "أحمر", hex: "#dc2626" },
  { nameEn: "Blue", nameAr: "أزرق", hex: "#2563eb" },
  { nameEn: "Navy", nameAr: "كحلي", hex: "#1e3a8a" },
  { nameEn: "Green", nameAr: "أخضر", hex: "#16a34a" },
  { nameEn: "Yellow", nameAr: "أصفر", hex: "#eab308" },
  { nameEn: "Orange", nameAr: "برتقالي", hex: "#ea580c" },
  { nameEn: "Purple", nameAr: "بنفسجي", hex: "#9333ea" },
  { nameEn: "Pink", nameAr: "وردي", hex: "#ec4899" },
  { nameEn: "Gray", nameAr: "رمادي", hex: "#64748b" },
  { nameEn: "Silver", nameAr: "فضي", hex: "#cbd5e1" },
  { nameEn: "Gold", nameAr: "ذهبي", hex: "#d97706" },
  { nameEn: "Brown", nameAr: "بني", hex: "#78350f" },
  { nameEn: "Beige", nameAr: "بيج", hex: "#d4b996" },
  { nameEn: "Cyan", nameAr: "سماوي", hex: "#06b6d4" },
];

const COLOR_MAP: Array<{ keywords: string[]; hex: string }> = [
  // Red shades
  {
    keywords: ["crimson", "maroon", "burgundy", "نبيتي", "عنابي", "قرمز"],
    hex: "#991b1b",
  },
  {
    keywords: ["red", "احمر", "أحمر", "rouge"],
    hex: "#dc2626",
  },
  // Blue shades
  {
    keywords: ["navy", "كحلي", "نيلي", "dark blue"],
    hex: "#1e3a8a",
  },
  {
    keywords: ["sky", "سماوي", "light blue", "cyan", "فيروزي", "turquoise"],
    hex: "#0284c7",
  },
  {
    keywords: ["blue", "ازرق", "أزرق", "bleu", "royal blue"],
    hex: "#2563eb",
  },
  // Black & Dark shades
  {
    keywords: ["midnight", "charcoal", "فحمي", "dark", "غامق"],
    hex: "#18181b",
  },
  {
    keywords: ["black", "اسود", "أسود", "noir"],
    hex: "#09090b",
  },
  // White & Light shades
  {
    keywords: ["white", "ابيض", "أبيض", "snow", "blanc", "فاتح"],
    hex: "#ffffff",
  },
  // Green shades
  {
    keywords: ["lime", "فسفوري", "ليموني", "mint", "نعناعي"],
    hex: "#84cc16",
  },
  {
    keywords: ["olive", "زيتي"],
    hex: "#4d7c0f",
  },
  {
    keywords: ["emerald", "زمردي"],
    hex: "#059669",
  },
  {
    keywords: ["green", "اخضر", "أخضر", "vert"],
    hex: "#16a34a",
  },
  // Yellow & Gold shades
  {
    keywords: ["gold", "ذهبي", "golden"],
    hex: "#d97706",
  },
  {
    keywords: ["yellow", "اصفر", "أصفر", "jaune"],
    hex: "#eab308",
  },
  // Orange shades
  {
    keywords: ["orange", "برتقالي", "برتقان"],
    hex: "#ea580c",
  },
  // Purple shades
  {
    keywords: ["lavender", "خزامي", "موف", "mauve", "violet", "ارجواني", "أرجواني"],
    hex: "#a855f7",
  },
  {
    keywords: ["purple", "بنفسجي", "pourpre"],
    hex: "#9333ea",
  },
  // Pink shades
  {
    keywords: ["magenta", "fuchsia", "فوشيا"],
    hex: "#d946ef",
  },
  {
    keywords: ["rose", "روز", "pink", "وردي", "زهري", "بينك"],
    hex: "#ec4899",
  },
  // Gray & Silver shades
  {
    keywords: ["silver", "فضي"],
    hex: "#cbd5e1",
  },
  {
    keywords: ["titanium", "تيتانيوم", "space gray", "رمادي فلكي"],
    hex: "#475569",
  },
  {
    keywords: ["gray", "grey", "رمادي", "رصاصي", "gris"],
    hex: "#64748b",
  },
  // Brown & Warm shades
  {
    keywords: ["brown", "بني", "قهوة", "عسلي", "chocolate", "شوكولاتة"],
    hex: "#78350f",
  },
  {
    keywords: ["beige", "بيج", "كريمي", "cream", "sand", "رملي"],
    hex: "#d4b996",
  },
];

function normalizeArabic(text: string): string {
  return text
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "") // Diacritics
    .toLowerCase()
    .trim();
}

const HEX_REGEX = /^#?([a-f\d]{3,4}|[a-f\d]{6}|[a-f\d]{8})$/i;
const HEX_SEARCH_REGEX = /#([a-f\d]{6}|[a-f\d]{3})/i;

export function resolveColor(
  colorInput?: string | null,
  fallbackName?: string | null
): string | null {
  const candidates = [colorInput, fallbackName].filter(
    (c): c is string => typeof c === "string" && c.trim().length > 0
  );

  for (const candidate of candidates) {
    const trimmed = candidate.trim();

    // 1. Direct hex match
    if (HEX_REGEX.test(trimmed)) {
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }

    // 2. Embedded hex (e.g. "Space Blue #1e3a8a")
    const embeddedHex = trimmed.match(HEX_SEARCH_REGEX);
    if (embeddedHex) {
      return embeddedHex[0];
    }

    // 3. Normalized exact match first
    const normalized = normalizeArabic(trimmed);

    for (const entry of COLOR_MAP) {
      for (const kw of entry.keywords) {
        if (normalized === normalizeArabic(kw)) {
          return entry.hex;
        }
      }
    }

    // 4. Token & substring match (e.g. "BLUE - ازرق" or "Midnight Black")
    const tokens = normalized.split(/[\s\-_/,+.]+/).filter(Boolean);

    for (const entry of COLOR_MAP) {
      for (const kw of entry.keywords) {
        const normalizedKw = normalizeArabic(kw);
        if (tokens.includes(normalizedKw) || normalized.includes(normalizedKw)) {
          return entry.hex;
        }
      }
    }
  }

  return null;
}

/**
 * Calculates whether a given hex color is light (relative luminance > 0.5)
 * Useful to render contrasting borders and rings.
 */
export function isLightColor(hexColor: string): boolean {
  if (!hexColor) return false;
  const hex = hexColor.replace("#", "");
  let r = 0, g = 0, b = 0;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length >= 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    return false;
  }

  // Perceived brightness formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
}
