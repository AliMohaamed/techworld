import { Link } from "@/navigation";
import { Button } from "@techworld/ui";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import Image from "next/image";

export default async function Hero() {
  const t = await getTranslations('Hero');
  const locale = await getLocale();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-visible bg-background px-4 md:px-8 pt-24 md:pt-16 pb-16">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          <div className="max-w-2xl space-y-8 lg:space-y-10 relative z-10">
            <div className="inline-flex items-center bg-secondary border border-border rounded-full px-5 py-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="ml-3 rtl:mr-3 text-xs font-semibold text-foreground">{t('badge')}</span>
            </div>

            <h1 className="font-space-grotesk text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.9] text-foreground">
              {t('title_part1')} <br className="hidden md:block" />
              <span className="text-primary">{t('title_part2')}</span> <br className="hidden md:block" />
              {t('title_part3')}
            </h1>

            <p className="text-lg md:text-xl text-label-muted leading-relaxed max-w-xl">
              {t('description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-4">
              <Button
                asChild
                size="lg"
                className="h-14 md:h-16 px-8 md:px-10 font-space-grotesk font-bold text-sm md:text-base tracking-wide rounded-xl w-full sm:w-auto"
              >
                <Link href="/products" className="flex items-center justify-center gap-3">
                  <ShoppingBag size={20} className="fill-primary-foreground/10" />
                  {t('cta')}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 md:h-16 px-8 md:px-10 font-space-grotesk font-bold text-sm md:text-base tracking-wide rounded-xl w-full sm:w-auto"
              >
                <Link href="/categories" className="flex items-center justify-center gap-3 group">
                  {t('explore', { defaultValue: 'Explore' })}
                  <ArrowRight size={20} className={locale === "ar" ? "rotate-180 group-hover:-translate-x-1 transition-transform" : "group-hover:translate-x-1 transition-transform"} />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative w-full aspect-[4/3] lg:aspect-square max-w-[600px] mx-auto lg:max-w-none lg:h-[75vh] flex items-center justify-center">
            <div className="relative w-full h-full overflow-hidden rounded-2xl lg:rounded-3xl border border-border bg-card">
              <Image
                src="/hero.png"
                alt="Premium Gadgets"
                fill
                className="object-cover object-center hover:scale-[1.02] transition-transform duration-700 ease-out"
                priority={true}
                quality={90}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 ltr:left-6 rtl:right-6 z-10">
                <div className="bg-card/90 backdrop-blur-sm border border-border p-4 rounded-xl">
                  <p className="text-primary font-bold text-[11px] tracking-wider uppercase">{t('newArrival', { defaultValue: 'NEW ARRIVAL' })}</p>
                  <p className="text-foreground font-space-grotesk text-lg font-bold tracking-tight">{t('featuredProduct', { defaultValue: 'Premium Wireless Audio' })}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}