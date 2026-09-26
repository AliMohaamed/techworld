import {
  BatteryCharging,
  Bluetooth,
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  Droplets,
  Feather,
  Gauge,
  Headphones,
  Layers,
  Lock,
  MonitorSmartphone,
  Package,
  Plug,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Thermometer,
  Truck,
  Usb,
  Volume2,
  Watch,
  Waves,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * The fixed set of icons an admin can pick for a product feature.
 *
 * Icons are referenced by these string keys rather than by component, so a
 * product's features survive in the database as plain data. Keys are additive:
 * never rename or remove one that products may already reference — a missing
 * key falls back to `Sparkles` at render time.
 */
export const PRODUCT_FEATURE_ICONS = {
  sparkles: Sparkles,
  zap: Zap,
  "battery-charging": BatteryCharging,
  plug: Plug,
  usb: Usb,
  bluetooth: Bluetooth,
  wifi: Wifi,
  "shield-check": ShieldCheck,
  lock: Lock,
  "check-circle": CheckCircle2,
  star: Star,
  feather: Feather,
  gauge: Gauge,
  clock: Clock,
  "refresh-cw": RefreshCw,
  truck: Truck,
  package: Package,
  box: Box,
  layers: Layers,
  smartphone: Smartphone,
  "monitor-smartphone": MonitorSmartphone,
  headphones: Headphones,
  "volume-2": Volume2,
  watch: Watch,
  cpu: Cpu,
  droplets: Droplets,
  waves: Waves,
  thermometer: Thermometer,
  ruler: Ruler,
  wrench: Wrench,
} as const satisfies Record<string, LucideIcon>;

export type ProductFeatureIconKey = keyof typeof PRODUCT_FEATURE_ICONS;

export const PRODUCT_FEATURE_ICON_KEYS = Object.keys(
  PRODUCT_FEATURE_ICONS,
) as ProductFeatureIconKey[];

export const DEFAULT_PRODUCT_FEATURE_ICON: ProductFeatureIconKey = "sparkles";

export function isProductFeatureIconKey(value: string): value is ProductFeatureIconKey {
  return value in PRODUCT_FEATURE_ICONS;
}

/** Resolves a stored icon key to a component, tolerating unknown/legacy keys. */
export function getProductFeatureIcon(key: string | undefined): LucideIcon {
  if (key && isProductFeatureIconKey(key)) {
    return PRODUCT_FEATURE_ICONS[key];
  }
  return PRODUCT_FEATURE_ICONS[DEFAULT_PRODUCT_FEATURE_ICON];
}

export type ProductFeature = {
  icon: string;
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
};
