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
        className="w-full bg-card border border-border rounded-xl py-4 px-5 text-sm text-foreground placeholder:text-label-muted/40 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all ltr:pr-12 rtl:pl-12 font-medium"
      />
      <button className="absolute ltr:right-2.5 rtl:left-2.5 top-2 h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground hover:brightness-110 transition-all active:scale-95">
        <Mail size={16} />
      </button>
    </div>
  );
}