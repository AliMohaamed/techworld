"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export function NewsletterForm() {
  const t = useTranslations('Footer');

  return (
    <div className="relative group">
      <input 
        type="email" 
        placeholder={t('newsletter.placeholder')} 
        className="w-full bg-card border border-border rounded-2xl py-5 px-6 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#ffc105]/20 transition-all ltr:pr-14 rtl:pl-14  font-medium"
      />
      <button className="absolute ltr:right-3 rtl:left-3 top-2.5 h-10 w-10 bg-[#ffc105] rounded-xl flex items-center justify-center text-black hover:bg-white  transition-all active:scale-95">
        <Mail size={18} />
      </button>
    </div>
  );
}
