"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type CategoryGridCardProps = {
  category: {
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    description_en?: string;
  };
};

export default function CategoryGridCard({ category }: CategoryGridCardProps) {
  return (
    <Link
      href={`/categories/${category._id}`}
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#2a2a2a,transparent_55%),linear-gradient(135deg,#111111,#050505)] p-6 transition-all hover:-translate-y-1 hover:border-[#ffc105]/40"
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,193,5,0.12),transparent_40%)] opacity-60 transition-opacity group-hover:opacity-100" />
      <div className="relative flex min-h-64 flex-col justify-between gap-10">
        <div className="flex items-start justify-between">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
            {category.slug.replaceAll("-", " ")}
          </span>
          <span className="rounded-full border border-white/10 p-2 text-zinc-500 transition-colors group-hover:text-[#ffc105]">
            <ArrowUpRight size={18} />
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="font-space-grotesk text-3xl font-black uppercase tracking-tight text-white transition-colors group-hover:text-[#ffc105]">
              {category.name_en}
            </h2>
            <p className="font-arabic text-lg text-zinc-400">{category.name_ar}</p>
          </div>
          <p className="max-w-sm text-sm leading-6 text-zinc-500">
            {category.description_en ?? "Browse every live product mapped to this category."}
          </p>
        </div>
      </div>
    </Link>
  );
}
