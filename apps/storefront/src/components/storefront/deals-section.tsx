import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight, BadgePercent, Flame, Tag } from "lucide-react";
import { Link } from "@/navigation";
import FeaturedProductCard from "./featured-product-card";
import { ProductRail } from "./product-rail";
import type { FeaturedProduct } from "./featured-products";

export type DealProduct = FeaturedProduct & {
  discountPercent: number;
  savings: number;
  inStock: boolean;
};

interface DealsSectionProps {
  deals: DealProduct[];
  total: number;
}

/** With fewer offers than this, a rail would leave most of the stage empty. */
const RAIL_MIN = 3;

const RAIL_BREAKPOINTS = {
  480: { slidesPerView: 1.7 },
  640: { slidesPerView: 2.2 },
  768: { slidesPerView: 2.4, spaceBetween: 20 },
  1024: { slidesPerView: 2.3, spaceBetween: 20 },
  1280: { slidesPerView: 2.8, spaceBetween: 24 },
};

export default async function DealsSection({ deals, total }: DealsSectionProps) {
  const t = await getTranslations("DealsSection");
  const locale = await getLocale();

  const available = deals.filter((deal) => deal.inStock);
  if (available.length === 0) return null;

  const maxPercent = Math.max(...available.map((deal) => deal.discountPercent));
  const maxSavings = Math.max(...available.map((deal) => deal.savings));

  return (
    <section id="deals" className="px-3 py-10 md:px-6 md:py-14">
      {/* Always-dark stage, echoing the hero, so offers read as a distinct moment on the page. */}
      <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#0c0b09] px-5 py-10 text-white md:rounded-[2.5rem] md:px-10 md:py-14 lg:px-14">
        <div
          aria-hidden
          className="absolute -top-1/3 -z-10 h-[70%] w-[55%] rounded-full bg-destructive/20 blur-[120px] ltr:-left-[10%] rtl:-right-[10%]"
        />
        <div
          aria-hidden
          className="absolute -bottom-1/3 -z-10 h-[60%] w-[50%] rounded-full bg-primary/15 blur-[120px] ltr:right-0 rtl:left-0"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-50 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_22px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="space-y-7 lg:col-span-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/15 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-300">
              <Flame size={13} className="fill-current" />
              {t("badge")}
            </span>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white/60">{t("eyebrow")}</p>
              <h2 className="font-space-grotesk text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
                <span className="text-primary">{maxPercent.toLocaleString(locale)}%</span>
                <br />
                {t("off")}
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-white/55">{t("description")}</p>
            </div>

            <dl className="grid max-w-xs grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  <Tag size={12} />
                  {t("stats.liveDeals")}
                </dt>
                <dd className="mt-2 font-space-grotesk text-2xl font-bold">{total.toLocaleString(locale)}</dd>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  <BadgePercent size={12} />
                  {t("stats.saveUpTo")}
                </dt>
                <dd className="mt-2 font-space-grotesk text-2xl font-bold">
                  {maxSavings.toLocaleString(locale)}
                  <span className="text-xs font-semibold text-primary ltr:ml-1 rtl:mr-1">EGP</span>
                </dd>
              </div>
            </dl>

            <Link
              href="/deals"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98] ltr:pl-6 ltr:pr-2 rtl:pl-2 rtl:pr-6"
            >
              {t("cta")}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:rotate-45 rtl:-scale-x-100">
                <ArrowUpRight size={16} />
              </span>
            </Link>
          </div>

          <div className="min-w-0 lg:col-span-8">
            {available.length >= RAIL_MIN ? (
              <ProductRail products={available} breakpoints={RAIL_BREAKPOINTS} tone="dark" />
            ) : (
              <ul className="flex flex-wrap justify-center gap-5 lg:justify-end">
                {available.map((deal) => (
                  <li key={deal._id} className="w-full max-w-[320px] sm:w-[calc(50%-10px)]">
                    <FeaturedProductCard product={deal} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
