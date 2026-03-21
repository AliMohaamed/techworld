'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    const newPathname = pathname.replace(`/${locale}`, `/${nextLocale}`);
    router.push(newPathname);
  };

  const isArabic = locale === 'ar';

  return (
    <button
      onClick={toggleLanguage}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-zinc-950 px-5 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 shadow-2xl transition-all hover:border-[#ffc105]/30 hover:text-white active:scale-95 ${className}`}
    >
      {/* Animated background highlight */}
      <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,193,5,0.1),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center gap-2">
        {/* <Languages size={15} className="text-zinc-500 group-hover:text-[#ffc105] transition-colors" /> */}

        {/* Character indicator */}
        <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-white/5 text-[9px] group-hover:bg-[#ffc105] group-hover:text-black transition-all font-black shadow-sm ">
          {isArabic ? 'EN' : 'ع'}
        </span>
      </div>

      {/* Label */}
      {/* <span className="relative leading-none">
        {isArabic ? 'English' : 'العربية'}
      </span> */}
    </button>
  );
}
