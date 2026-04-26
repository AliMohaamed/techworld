"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { CheckCircle2, MessageSquare, ArrowRight, Package, Truck, ShieldCheck } from "lucide-react";
import { Link } from "@/navigation";
import { Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";

function SuccessContent() {
  const t = useTranslations('SuccessPage');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const shortCode = searchParams.get("code") || "";

  // Placeholder for real business number
  const BUSINESS_WHATSAPP = "201099684535"; 
  
  const generateWhatsAppLink = () => {
    if (!shortCode) return "#";
    const message = encodeURIComponent(t('whatsappMessage', { code: shortCode }));
    return `https://wa.me/${BUSINESS_WHATSAPP}?text=${message}`;
  };

  if (!shortCode) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center bg-background transition-colors">
        <h1 className="font-space-grotesk text-3xl font-black uppercase tracking-[0.3em] text-foreground">{t('errors.notFound')}</h1>
        <Link href="/" className="mt-8 font-space-grotesk text-xs font-black uppercase tracking-[0.2em] text-[#ffc105] border border-[#ffc105]/20 px-8 py-3 rounded-full hover:bg-[#ffc105]/10 mt-10 transition-all font-black">
          {t('errors.backToStore')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 md:px-8 transition-colors relative overflow-hidden">
      {/* Decorative gradients for light mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_center,rgba(255,193,5,0.05),transparent_70%)] dark:hidden" />
      
      <div className="container mx-auto max-w-3xl relative z-10">
        <div className="flex flex-col items-center justify-center text-center space-y-10">
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#ffc105]/10 duration-[3000ms]" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-[#ffc105]/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-[32px] bg-[#ffc105] text-black shadow-[0_20px_40px_rgba(255,193,5,0.3)]">
              <CheckCircle2 size={56} strokeWidth={3} />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-space-grotesk text-5xl font-black tracking-tightest text-foreground uppercase md:text-7xl lg:text-8xl leading-none">
              {t('title')} <span className="text-[#ffc105]">{t('accentTitle')}</span>
            </h1>
            <p className="text-muted-foreground/60 max-w-lg mx-auto font-black leading-relaxed uppercase tracking-[0.3em] text-[10px]">
              {t('description')}
            </p>
          </div>

          <div className="w-full rounded-[48px] border border-border bg-card p-10 md:p-14 space-y-10 shadow-3xl backdrop-blur-3xl transition-all relative overflow-hidden group hover:shadow-[#ffc105]/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffc105]/5 rounded-full blur-3xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
            
            <div className="flex flex-col items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/30">{t('orderRef')}</span>
              <span className="font-space-grotesk text-5xl md:text-7xl font-black text-foreground selection:bg-[#ffc105] selection:text-black tracking-tightest transition-all group-hover:scale-105">
                {shortCode}
              </span>
            </div>

            <div className="h-px w-full bg-border" />

            <div className="space-y-8 text-left rtl:text-right">
              <h4 className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.5em] text-[#ffc105]">{t('nextSteps.title')}</h4>
              <ul className="space-y-8">
                <li className="flex items-start gap-5 group/item">
                  <div className="mt-1 h-7 w-7 rounded-xl bg-[#ffc105]/10 border border-[#ffc105]/20 text-[12px] font-black text-[#ffc105] flex items-center justify-center shrink-0 group-hover/item:bg-[#ffc105] group-hover/item:text-black transition-all group-hover/item:scale-110">1</div>
                  <p className="text-sm md:text-base leading-relaxed text-muted-foreground/60 font-medium" dangerouslySetInnerHTML={{ __html: t.raw('nextSteps.step1') }} />
                </li>
                <li className="flex items-start gap-5 group/item">
                  <div className="mt-1 h-7 w-7 rounded-xl bg-[#ffc105]/10 border border-[#ffc105]/20 text-[12px] font-black text-[#ffc105] flex items-center justify-center shrink-0 group-hover/item:bg-[#ffc105] group-hover/item:text-black transition-all group-hover/item:scale-110">2</div>
                  <p className="text-sm md:text-base leading-relaxed text-muted-foreground/60 font-medium" dangerouslySetInnerHTML={{ __html: t.raw('nextSteps.step2') }} />
                </li>
                <li className="flex items-start gap-5 group/item">
                  <div className="mt-1 h-7 w-7 rounded-xl bg-[#ffc105]/10 border border-[#ffc105]/20 text-[12px] font-black text-[#ffc105] flex items-center justify-center shrink-0 group-hover/item:bg-[#ffc105] group-hover/item:text-black transition-all group-hover/item:scale-110">3</div>
                  <p className="text-sm md:text-base leading-relaxed text-muted-foreground/60 font-medium" dangerouslySetInnerHTML={{ __html: t.raw('nextSteps.step3') }} />
                </li>
              </ul>
            </div>

            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-4 rounded-2xl bg-[#ffc105] py-6 font-space-grotesk text-xl font-black uppercase tracking-[0.3em] text-black transition-all hover:bg-foreground hover:text-background active:scale-[0.98] shadow-[0_20px_40px_rgba(255,193,5,0.2)]"
            >
              <MessageSquare size={24} className="fill-current" />
              {t('actions.verify')}
            </a>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center gap-4 rounded-[32px] border border-border bg-accent/30 p-8 shadow-sm transition-all hover:border-[#ffc105]/20 group">
              <Package size={32} className="text-muted-foreground/20 group-hover:text-[#ffc105] transition-colors" />
              <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-black text-center leading-relaxed">{t('badges.stock')}</span>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-[32px] border border-border bg-accent/30 p-8 shadow-sm transition-all hover:border-[#ffc105]/20 group">
              <ShieldCheck size={32} className="text-muted-foreground/20 group-hover:text-[#ffc105] transition-colors" />
              <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-black text-center leading-relaxed">{t('badges.secure')}</span>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-[32px] border border-border bg-accent/30 p-8 shadow-sm transition-all hover:border-[#ffc105]/20 group">
              <Truck size={32} className="text-muted-foreground/20 group-hover:text-[#ffc105] transition-colors" />
              <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 font-black text-center leading-relaxed">{t('badges.delivery')}</span>
            </div>
          </div>

          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 hover:text-foreground transition-all pt-10"
          >
            {t('actions.back')}
            <ArrowRight size={16} className={`transition-transform group-hover:translate-x-1 ${locale === 'ar' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const t = useTranslations('SuccessPage');
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-foreground bg-background font-space-grotesk text-[10px] font-black uppercase tracking-[0.5em]">{t('loading')}</div>}>
      <SuccessContent />
    </Suspense>
  );
}
