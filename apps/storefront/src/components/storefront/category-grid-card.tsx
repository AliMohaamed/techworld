"use client";

import { Link } from "@/navigation";
import { ArrowUpRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

type CategoryGridCardProps = {
  category: {
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    description_en?: string;
    description_ar?: string;
  };
};

export default function CategoryGridCard({ category }: CategoryGridCardProps) {
  const t = useTranslations('CategoriesPage');
  const locale = useLocale();

  return (
    <Link
      href={`/categories/${category.slug || category._id}`}
      className="group relative overflow-hidden rounded-[40px] border border-white/5 bg-[#080808] p-10 transition-all duration-500 hover:-translate-y-2 hover:border-[#ffc105]/30 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,193,5,0.1),transparent_50%)] opacity-40 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex min-h-[320px] flex-col justify-between gap-12">
        <div className="flex items-start justify-between">
          <span className="rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 shadow-sm">
            {category.slug.replaceAll("-", " ")}
          </span>
          <span className="rounded-2xl border border-white/5 bg-zinc-950 p-3 text-zinc-600 transition-all duration-500 group-hover:bg-[#ffc105] group-hover:text-black group-hover:rotate-45 shadow-lg">
            <ArrowUpRight size={22} />
          </span>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="font-space-grotesk text-4xl font-black uppercase tracking-tightest text-white transition-all duration-500 group-hover:text-[#ffc105] group-hover:scale-105 origin-left rtl:origin-right leading-none">
              {locale === 'en' ? category.name_en : category.name_ar}
            </h2>
            <p className="font-arabic text-xl text-[#ffc105]/70 font-light opacity-60 group-hover:opacity-100 transition-opacity">
              {locale === 'en' ? category.name_ar : category.name_en}
            </p>
          </div>
          <p className="max-w-sm text-[11px] font-black uppercase tracking-widest leading-relaxed text-zinc-600 group-hover:text-zinc-400 transition-colors">
            {(locale === 'en' ? category.description_en : category.description_ar) ?? t('card.defaultDescription')}
          </p>
        </div>
      </div>
    </Link>
  );
}
