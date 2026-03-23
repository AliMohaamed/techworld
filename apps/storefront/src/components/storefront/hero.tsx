'use client';

import { Link } from "@/navigation";
import { Button } from "@techworld/ui";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";

export default function Hero() {
  const t = useTranslations('Hero');
  const locale = useLocale();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-visible bg-background px-4 md:px-8 pt-24 md:pt-16 pb-16">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ffc105]/5 rounded-full blur-[100px] -z-10 opacity-70 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#ffc105]/5 rounded-full blur-[120px] -z-10" />

      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          <div className="max-w-2xl space-y-8 lg:space-y-10 relative z-10">
            <div className="inline-flex items-center space-x-3 rtl:space-x-reverse bg-secondary/80 backdrop-blur-md border border-border rounded-full px-5 py-2.5 shadow-lg">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc105] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffc105]"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-foreground">{t('badge')}</span>
            </div>
            
            <h1 className="font-space-grotesk text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tighter leading-[1] text-foreground uppercase">
              {t('title_part1')} <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffc105] to-[#ff9900]">
                {t('title_part2')}
              </span> <br className="hidden md:block" />
              {t('title_part3')}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-xl">
              {t('description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-4">
              <Button
                asChild
                size="lg"
                className="h-14 md:h-16 px-8 md:px-10 font-space-grotesk font-black text-sm md:text-lg uppercase tracking-widest rounded-2xl w-full sm:w-auto bg-[#ffc105] hover:bg-white text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,193,5,0.4)]"
              >
                <Link href="/products" className="flex items-center justify-center gap-3">
                  <ShoppingBag size={22} className="fill-black/10" />
                  {t('cta')}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 md:h-16 px-8 md:px-10 font-space-grotesk font-black text-sm md:text-lg uppercase tracking-widest rounded-2xl w-full sm:w-auto border-border hover:border-[#ffc105] hover:text-[#ffc105] bg-transparent transition-all"
              >
                <Link href="/categories" className="flex items-center justify-center gap-3 group">
                  {t('explore', { defaultValue: 'EXPLORE' })}
                  <ArrowRight size={22} className={locale === "ar" ? "rotate-180 group-hover:-translate-x-1 transition-transform" : "group-hover:translate-x-1 transition-transform"} />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative w-full aspect-[4/3] lg:aspect-square max-w-[600px] mx-auto lg:max-w-none lg:h-[75vh] flex items-center justify-center animate-in fade-in duration-1000 slide-in-from-right-8">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ffc105]/10 to-transparent rounded-[3rem] -z-10 rotate-3 scale-105 blur-2xl opacity-50" />
            
            <div className="relative w-full h-full overflow-hidden rounded-[2.5rem] lg:rounded-[3.5rem] border border-white/5 shadow-2xl bg-black">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/30 via-transparent to-transparent z-10" />
              <Image 
                src="/hero.png" 
                alt="Premium Gadgets" 
                fill 
                className="object-cover object-center hover:scale-[1.03] transition-transform duration-[1.5s] ease-out"
                priority
                quality={100}
              />
              <div className="absolute bottom-8 ltr:left-8 rtl:right-8 ltr:right-8 rtl:left-8 z-20 flex justify-between items-end">
                <div className="space-y-2 backdrop-blur-md bg-white/5 border border-white/10 p-5 rounded-3xl">
                  <p className="text-[#ffc105] font-black uppercase tracking-[0.4em] text-[9px] drop-shadow-sm">{t('newArrival', { defaultValue: 'NEW ARRIVAL' })}</p>
                  <p className="text-white font-space-grotesk text-xl font-black tracking-tight drop-shadow-md">{t('featuredProduct', { defaultValue: 'Premium Wireless Audio' })}</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
