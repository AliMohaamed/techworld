"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const switchLanguage = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }
    const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPathname as any);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const USFlag = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-5 h-auto rounded-sm shadow-sm overflow-hidden border border-white/10">
      <path fill="#fff" d="M0 0h640v480H0z" />
      <path fill="#bf0a30" d="M0 0h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0zm0 74h640v37H0z" />
      <path fill="#002868" d="M0 0h254v258.5H0z" />
      <g fill="#fff">
        <circle cx="40" cy="40" r="8" />
        <circle cx="80" cy="80" r="8" />
        <circle cx="120" cy="120" r="8" />
        <circle cx="160" cy="160" r="8" />
        <circle cx="200" cy="200" r="8" />
        <circle cx="120" cy="40" r="8" />
        <circle cx="200" cy="40" r="8" />
        <circle cx="40" cy="120" r="8" />
        <circle cx="200" cy="120" r="8" />
        <circle cx="40" cy="200" r="8" />
        <circle cx="120" cy="200" r="8" />
        <circle cx="80" cy="160" r="8" />
        <circle cx="160" cy="160" r="8" />
        <circle cx="80" cy="40" r="8" />
        <circle cx="160" cy="40" r="8" />
        <circle cx="40" cy="80" r="8" />
        <circle cx="200" cy="80" r="8" />
        <circle cx="120" cy="80" r="8" />
        <circle cx="80" cy="120" r="8" />
        <circle cx="160" cy="120" r="8" />
        <circle cx="160" cy="80" r="8" />
        <circle cx="40" cy="160" r="8" />
        <circle cx="200" cy="160" r="8" />
        <circle cx="120" cy="160" r="8" />
        <circle cx="80" cy="200" r="8" />
        <circle cx="160" cy="200" r="8" />
      </g>
    </svg>
  );

  const EgyptFlag = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-5 h-auto rounded-sm shadow-sm overflow-hidden border border-white/10">
      <path fill="#fff" d="M0 0h640v480H0z" />
      <path fill="#ce1126" d="M0 0h640v160H0z" />
      <path d="M0 320h640v160H0z" />
      <path fill="#c09300" d="M320 220l-15-20-10 20 10 30-15 10v20l30 20 30-20v-20l-15-10 10-30-10-20z" />
    </svg>
  );

  const languages = [
    { code: "en", label: "English", shortLabel: "EN", flag: USFlag },
    { code: "ar", label: "العربية", shortLabel: "AR", flag: EgyptFlag },
  ];

  const currentLang = languages.find((l) => l.code === locale) || languages[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2 rounded-2xl border border-white/5 px-4 py-2 text-sm font-medium text-zinc-400 transition-all hover:border-[#ffc105]/30 hover:text-black dark:hover:text-white focus:outline-none"
      >
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span>{currentLang.shortLabel}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full ltr:right-0 rtl:left-0 mt-2 flex w-36 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/95 p-1   backdrop-blur-xl z-[100] animate-in fade-in slide-in-from-top-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => switchLanguage(lang.code)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${locale === lang.code
                  ? "bg-[#ffc105]/10 text-[#ffc105]"
                  : "text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white"
                }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
