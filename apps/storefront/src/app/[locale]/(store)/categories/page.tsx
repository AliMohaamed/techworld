"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import CategoryGridCard from "@/components/storefront/category-grid-card";
import { useTranslations } from "next-intl";

export default function CategoriesPage() {
  const t = useTranslations('CategoriesPage');
  const categoryResult = useQuery(api.categories.listActiveCategories);
  const categories = categoryResult?.categories;

  if (!categories) {
    return (
      <div className="min-h-screen bg-black px-4 pb-24 pt-12 md:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-8">
          <div className="h-48 rounded-[40px] bg-zinc-900 shadow-inner" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] rounded-[32px] bg-zinc-900 shadow-inner" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-12 md:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <section className="relative overflow-hidden rounded-[40px] border border-white/5 bg-[#050505] px-8 py-16 md:px-14 lg:py-20 shadow-2xl ring-1 ring-white/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.08),transparent_70%)]" />
          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#ffc105] shadow-[0_0_10px_rgba(255,193,5,0.5)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                {t('badge')}
              </p>
            </div>
            <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tightest text-white md:text-7xl lg:text-8xl leading-none">
              {t('title')}
            </h1>
            <p className="max-w-xl text-sm md:text-base leading-relaxed text-zinc-500 font-medium">
              {t('description')}
            </p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryGridCard key={category._id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
