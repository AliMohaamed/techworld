import { Link } from "@/navigation";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export default async function Hero() {
  const t = await getTranslations('Hero');
  // Decorative brand ring (Latin-only: Arabic shaping breaks on SVG textPath)
  const ringText = "TECHWORLD ✦ NEW DROPS ✦ ".repeat(2);

  return (
    <section className="px-3 md:px-6 pt-4 md:pt-6 pb-4">
      {/* Always-dark stage so the product shot blends seamlessly in both themes */}
      <div className="relative isolate overflow-hidden rounded-[1.75rem] md:rounded-[2.5rem] bg-[#0c0b09] text-white">

        {/* Background: fine grid fading out from the product */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_65%_45%,black,transparent)]"
        />
        {/* Background: gold light beam + floor glow */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 hero-beam bg-[radial-gradient(ellipse_35%_60%_at_70%_20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_70%)] rtl:bg-[radial-gradient(ellipse_35%_60%_at_30%_20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="absolute bottom-[-30%] ltr:right-[5%] rtl:left-[5%] -z-10 h-[60%] w-[60%] rounded-full bg-primary/15 blur-[120px]"
        />
        {/* Background: oversized outlined wordmark */}
        <span
          aria-hidden
          className="pointer-events-none select-none absolute -bottom-[0.22em] inset-x-0 -z-10 text-center font-space-grotesk font-bold leading-none tracking-tighter text-transparent text-[15vw] [-webkit-text-stroke:1px_rgba(255,255,255,0.07)]"
        >
          TECHWORLD
        </span>

        <div className="relative grid lg:grid-cols-12 items-center gap-6 lg:gap-0 px-6 md:px-12 lg:px-16 pt-12 md:pt-16 lg:pt-0 min-h-[auto] lg:min-h-[620px]">

          {/* Copy */}
          <div className="lg:col-span-5 relative z-10 space-y-6 md:space-y-7 lg:py-20">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              <span className="text-[11px] font-medium tracking-wide text-white/70">{t('badge')}</span>
            </div>

            <h1 className="font-space-grotesk text-[2.5rem] md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.02]">
              {t('title_part1')}
              <br />
              <span className="relative inline-block text-primary">
                {t('title_part2')}
                <svg aria-hidden viewBox="0 0 120 12" preserveAspectRatio="none" className="absolute -bottom-1.5 inset-x-0 h-2.5 w-full text-primary/60">
                  <path d="M2 9 C 30 2, 70 2, 118 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="hero-underline" />
                </svg>
              </span>{" "}
              <span className="text-white/90">{t('title_part3')}</span>
            </h1>

            <p className="text-sm md:text-base text-white/55 leading-relaxed max-w-sm">
              {t('description')}
            </p>

            <div className="flex items-center gap-6 pt-1">
              <Link
                href="/products"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-primary ltr:pl-6 ltr:pr-2 rtl:pr-6 rtl:pl-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                {t('cta')}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground text-primary transition-transform group-hover:rotate-45 rtl:-scale-x-100">
                  <ArrowUpRight size={16} />
                </span>
              </Link>
              <Link
                href="/categories"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors"
              >
                {t('explore', { defaultValue: 'Explore' })}
                <ArrowRight size={16} className="rtl:rotate-180 transition-transform ltr:group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="lg:col-span-7 relative mx-auto w-full max-w-[420px] md:max-w-[520px] lg:max-w-[640px] aspect-square">
            {/* Orbit rings */}
            <div aria-hidden className="absolute inset-[6%] rounded-full border border-dashed border-white/10 hero-spin" />
            <div aria-hidden className="absolute inset-[16%] rounded-full border border-primary/15" />

            <div className="absolute inset-0 hero-float">
              <Image
                src="/hero.png"
                alt={t('featuredProduct', { defaultValue: 'Premium Wireless Audio' })}
                fill
                priority
                quality={90}
                sizes="(min-width: 1024px) 640px, (min-width: 768px) 520px, 90vw"
                className="object-contain [mask-image:radial-gradient(closest-side,black_72%,transparent)]"
              />
            </div>

            {/* Floating product tag */}
            <div className="absolute top-[14%] ltr:right-0 rtl:left-0 md:ltr:-right-2 md:rtl:-left-2 hero-float-delayed">
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.06] py-2 ltr:pl-2 ltr:pr-4 rtl:pr-2 rtl:pl-4 backdrop-blur-md">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-[10px] font-black text-primary-foreground">
                  NEW
                </span>
                <span className="text-xs font-semibold text-white/85 whitespace-nowrap">
                  {t('featuredProduct', { defaultValue: 'Premium Wireless Audio' })}
                </span>
              </div>
            </div>

            {/* Rotating circular CTA */}
            <Link
              href="/products"
              aria-label={t('cta')}
              className="group absolute bottom-[6%] ltr:left-0 rtl:right-0 h-24 w-24 md:h-28 md:w-28"
            >
              <svg viewBox="0 0 100 100" direction="ltr" className="absolute inset-0 h-full w-full hero-spin-fast" aria-hidden>
                <defs>
                  <path id="hero-ring-path" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                </defs>
                <text className="fill-white/60 text-[9px] font-semibold uppercase tracking-[0.2em]">
                  <textPath href="#hero-ring-path" textLength="238">{ringText}</textPath>
                </text>
              </svg>
              <span className="absolute inset-[30%] grid place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                <ArrowUpRight size={18} className="rtl:-scale-x-100" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
