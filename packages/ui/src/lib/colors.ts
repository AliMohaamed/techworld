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

const COLOR_MAP: Array<{ nameEn: string; nameAr: string; keywords: string[]; hex: string }> = [
  // Red shades
  {
    nameEn: "Crimson",
    nameAr: "نبيتي",
    keywords: ["crimson", "maroon", "burgundy", "نبيتي", "عنابي", "قرمز"],
    hex: "#991b1b",
  },
  {
    nameEn: "Red",
    nameAr: "أحمر",
    keywords: ["red", "احمر", "أحمر", "rouge"],
    hex: "#dc2626",
  },
  // Blue shades
  {
    nameEn: "Navy",
    nameAr: "كحلي",
    keywords: ["navy", "كحلي", "نيلي", "dark blue"],
    hex: "#1e3a8a",
  },
  {
    nameEn: "Cyan",
    nameAr: "سماوي",
    keywords: ["sky", "سماوي", "light blue", "cyan", "فيروزي", "turquoise"],
    hex: "#0284c7",
  },
  {
    nameEn: "Blue",
    nameAr: "أزرق",
    keywords: ["blue", "ازرق", "أزرق", "bleu", "royal blue"],
    hex: "#2563eb",
  },
  // Black & Dark shades
  {
    nameEn: "Midnight Black",
    nameAr: "أسود داكن",
    keywords: ["midnight", "charcoal", "فحمي", "dark", "غامق"],
    hex: "#18181b",
  },
  {
    nameEn: "Black",
    nameAr: "أسود",
    keywords: ["black", "اسود", "أسود", "noir"],
    hex: "#09090b",
  },
  // White & Light shades
  {
    nameEn: "White",
    nameAr: "أبيض",
    keywords: ["white", "ابيض", "أبيض", "snow", "blanc", "فاتح"],
    hex: "#ffffff",
  },
  // Green shades
  {
    nameEn: "Lime Green",
    nameAr: "فسفوري",
    keywords: ["lime", "فسفوري", "ليموني", "mint", "نعناعي"],
    hex: "#84cc16",
  },
  {
    nameEn: "Olive Green",
    nameAr: "زيتي",
    keywords: ["olive", "زيتي"],
    hex: "#4d7c0f",
  },
  {
    nameEn: "Emerald",
    nameAr: "زمردي",
    keywords: ["emerald", "زمردي"],
    hex: "#059669",
  },
  {
    nameEn: "Green",
    nameAr: "أخضر",
    keywords: ["green", "اخضر", "أخضر", "vert"],
    hex: "#16a34a",
  },
  // Yellow & Gold shades
  {
    nameEn: "Gold",
    nameAr: "ذهبي",
    keywords: ["gold", "ذهبي", "golden"],
    hex: "#d97706",
  },
  {
    nameEn: "Yellow",
    nameAr: "أصفر",
    keywords: ["yellow", "اصفر", "أصفر", "jaune"],
    hex: "#eab308",
  },
  // Orange shades
  {
    nameEn: "Orange",
    nameAr: "برتقالي",
    keywords: ["orange", "برتقالي", "برتقان"],
    hex: "#ea580c",
  },
  // Purple shades
  {
    nameEn: "Lavender",
    nameAr: "موف",
    keywords: ["lavender", "خزامي", "موف", "mauve", "violet", "ارجواني", "أرجواني"],
    hex: "#a855f7",
  },
  {
    nameEn: "Purple",
    nameAr: "بنفسجي",
    keywords: ["purple", "بنفسجي", "pourpre"],
    hex: "#9333ea",
  },
  // Pink shades
  {
    nameEn: "Fuchsia",
    nameAr: "فوشيا",
    keywords: ["magenta", "fuchsia", "فوشيا"],
    hex: "#d946ef",
  },
  {
    nameEn: "Pink",
    nameAr: "وردي",
    keywords: ["rose", "روز", "pink", "وردي", "زهري", "بينك"],
    hex: "#ec4899",
  },
  // Gray & Silver shades
  {
    nameEn: "Silver",
    nameAr: "فضي",
    keywords: ["silver", "فضي"],
    hex: "#cbd5e1",
  },
  {
    nameEn: "Space Gray",
    nameAr: "رمادي فلكي",
    keywords: ["titanium", "تيتانيوم", "space gray", "رمادي فلكي"],
    hex: "#475569",
  },
  {
    nameEn: "Gray",
    nameAr: "رمادي",
    keywords: ["gray", "grey", "رمادي", "رصاصي", "gris"],
    hex: "#64748b",
  },
  // Brown & Warm shades
  {
    nameEn: "Brown",
    nameAr: "بني",
    keywords: ["brown", "بني", "قهوة", "عسلي", "chocolate", "شوكولاتة"],
    hex: "#78350f",
  },
  {
    nameEn: "Beige",
    nameAr: "بيج",
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

export function getColorDisplayName(
  colorInput?: string | null,
  locale: string = "en"
): string {
  if (!colorInput || typeof colorInput !== "string") return "";

  const trimmed = colorInput.trim();
  if (!trimmed) return "";

  const isAr = locale === "ar";

  // Handle "Default" variant name
  if (trimmed.toLowerCase() === "default") {
    return isAr ? "افتراضي" : "Default";
  }

  // Handle hex string inputs (e.g. "#2563eb")
  if (HEX_REGEX.test(trimmed)) {
    const targetHex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    const hexMatch = COLOR_MAP.find(
      (c) => c.hex.toLowerCase() === targetHex.toLowerCase()
    );
    if (hexMatch) {
      return isAr ? hexMatch.nameAr : hexMatch.nameEn;
    }
    return trimmed;
  }

  // Handle composite strings like "Blue - أزرق" or "Red / أحمر"
  if (trimmed.includes("-") || trimmed.includes("/") || trimmed.includes("|")) {
    const parts = trimmed.split(/[-/|]/).map((p) => p.trim());
    const arPart = parts.find((p) => /[\u0600-\u06FF]/.test(p));
    const enPart = parts.find((p) => /[a-zA-Z]/.test(p));
    if (isAr && arPart) return arPart;
    if (!isAr && enPart) return enPart;
  }

  const normalized = normalizeArabic(trimmed);

  // 1. Exact match in COLOR_MAP
  for (const entry of COLOR_MAP) {
    for (const kw of entry.keywords) {
      if (normalized === normalizeArabic(kw)) {
        return isAr ? entry.nameAr : entry.nameEn;
      }
    }
  }

  // 2. Exact match in COLOR_PRESETS
  for (const preset of COLOR_PRESETS) {
    if (
      normalized === normalizeArabic(preset.nameEn) ||
      normalized === normalizeArabic(preset.nameAr)
    ) {
      return isAr ? preset.nameAr : preset.nameEn;
    }
  }

  // 3. Substring/Token match in COLOR_MAP
  const tokens = normalized.split(/[\s\-_/,+.]+/).filter(Boolean);
  for (const entry of COLOR_MAP) {
    for (const kw of entry.keywords) {
      const normalizedKw = normalizeArabic(kw);
      if (tokens.includes(normalizedKw) || normalized.includes(normalizedKw)) {
        return isAr ? entry.nameAr : entry.nameEn;
      }
    }
  }

  // 4. Fallback if no color match found
  return trimmed;
}

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
