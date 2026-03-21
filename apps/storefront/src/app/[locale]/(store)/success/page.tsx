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
    const messageTemplate = t('whatsappMessage');
    const message = encodeURIComponent(messageTemplate.replace("{code}", shortCode));
    return `https://wa.me/${BUSINESS_WHATSAPP}?text=${message}`;
  };

  if (!shortCode) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center bg-black">
        <h1 className="font-space-grotesk text-3xl font-black uppercase tracking-[0.3em] text-white">{t('errors.notFound')}</h1>
        <Link href="/" className="mt-8 font-space-grotesk text-xs font-black uppercase tracking-[0.2em] text-[#ffc105] border border-[#ffc105]/20 px-8 py-3 rounded-full hover:bg-[#ffc105]/10 mt-10 transition-all">
          {t('errors.backToStore')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-12 md:px-8">
      <div className="container mx-auto max-w-3xl">
        <div className="flex flex-col items-center justify-center text-center space-y-10">
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 animate-ping rounded-full bg-[#ffc105]/10 duration-[3000ms]" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-[#ffc105]/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-[32px] bg-[#ffc105] text-black shadow-[0_0_50px_rgba(255,193,5,0.3)]">
              <CheckCircle2 size={56} strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="font-space-grotesk text-5xl font-black tracking-tighter text-white uppercase md:text-7xl leading-none">
              {t('title')} <span className="text-[#ffc105]">{t('accentTitle')}</span>
            </h1>
            <p className="text-zinc-600 max-w-lg mx-auto font-medium leading-relaxed uppercase tracking-widest text-[10px]">
              {t('description')}
            </p>
          </div>

          <div className="w-full rounded-[40px] border border-white/5 bg-zinc-950/50 p-10 md:p-14 space-y-10 shadow-2xl backdrop-blur-3xl ring-1 ring-white/5">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700">{t('orderRef')}</span>
              <span className="font-space-grotesk text-5xl md:text-6xl font-black text-white selection:bg-[#ffc105] selection:text-black tracking-tightest">
                {shortCode}
              </span>
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="space-y-6 text-left rtl:text-right">
              <h4 className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] shadow-sm">{t('nextSteps.title')}</h4>
              <ul className="space-y-6">
                <li className="flex items-start gap-5 group">
                  <div className="mt-1 h-6 w-6 rounded-lg bg-[#ffc105]/10 border border-[#ffc105]/20 text-[11px] font-black text-[#ffc105] flex items-center justify-center shrink-0 group-hover:bg-[#ffc105] group-hover:text-black transition-colors">1</div>
                  <p className="text-sm leading-relaxed text-zinc-400 font-medium" dangerouslySetInnerHTML={{ __html: t('nextSteps.step1') }} />
                </li>
                <li className="flex items-start gap-5 group">
                  <div className="mt-1 h-6 w-6 rounded-lg bg-[#ffc105]/10 border border-[#ffc105]/20 text-[11px] font-black text-[#ffc105] flex items-center justify-center shrink-0 group-hover:bg-[#ffc105] group-hover:text-black transition-colors">2</div>
                  <p className="text-sm leading-relaxed text-zinc-400 font-medium" dangerouslySetInnerHTML={{ __html: t('nextSteps.step2') }} />
                </li>
                <li className="flex items-start gap-5 group">
                  <div className="mt-1 h-6 w-6 rounded-lg bg-[#ffc105]/10 border border-[#ffc105]/20 text-[11px] font-black text-[#ffc105] flex items-center justify-center shrink-0 group-hover:bg-[#ffc105] group-hover:text-black transition-colors">3</div>
                  <p className="text-sm leading-relaxed text-zinc-400 font-medium" dangerouslySetInnerHTML={{ __html: t('nextSteps.step3') }} />
                </li>
              </ul>
            </div>

            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-4 rounded-2xl bg-[#ffc105] py-6 font-space-grotesk text-xl font-black uppercase tracking-[0.3em] text-black transition-all hover:bg-white active:scale-[0.98] shadow-[0_10px_30px_rgba(255,193,5,0.2)]"
            >
              <MessageSquare size={24} className="fill-black" />
              {t('actions.verify')}
            </a>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/5 bg-zinc-900/10 p-6 shadow-sm">
              <Package size={28} className="text-zinc-700" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-black text-center leading-relaxed">{t('badges.stock')}</span>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/5 bg-zinc-900/10 p-6 shadow-sm">
              <ShieldCheck size={28} className="text-zinc-700" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-black text-center leading-relaxed">{t('badges.secure')}</span>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/5 bg-zinc-900/10 p-6 shadow-sm">
              <Truck size={28} className="text-zinc-700" />
              <span className="text-[9px] uppercase tracking-[0.25em] text-zinc-600 font-black text-center leading-relaxed">{t('badges.delivery')}</span>
            </div>
          </div>

          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700 hover:text-white transition-all pt-10"
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-white bg-black font-space-grotesk text-[10px] font-black uppercase tracking-[0.5em]">{t('loading')}</div>}>
      <SuccessContent />
    </Suspense>
  );
}
