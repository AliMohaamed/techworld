'use client';

import { Link } from "@/navigation";
import { Button } from "@techworld/ui";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations('Hero');

  return (
    <section className="relative min-h-[85vh] flex items-center pt-20 overflow-hidden bg-background px-4 md:px-8">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ffc105]/10 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-muted/20 rounded-full blur-[100px] -z-10" />

      <div className="container mx-auto">
        <div className="max-w-4xl space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-secondary border border-border rounded-full px-4 py-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#ffc105] animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t('badge')}</span>
            </div>
            <h1 className="font-space-grotesk text-5xl md:text-6xl lg:text-7xl font-black tracking-tightest leading-[0.9] text-foreground uppercase">
              {t('title_part1')} <span className="text-[#ffc105]">{t('title_part2')}</span> {t('title_part3')}
            </h1>
            <p className="max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed font-arabic-regular">
              {t('description')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Button
              asChild
              size="lg"
              className="h-16 px-10 font-space-grotesk font-black text-lg uppercase tracking-widest rounded-2xl w-full sm:w-auto text-black"
            >
              <Link href="/products">
                {t('cta')}
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  );
}
