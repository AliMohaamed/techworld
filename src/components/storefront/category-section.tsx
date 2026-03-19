"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowUpRight, Cpu, MousePointer2, Headphones } from "lucide-react";

export default function CategorySection() {
  const categories = useQuery(api.categories.listActiveCategories);

  const getCategoryIcon = (slug: string) => {
    switch (slug?.toLowerCase()) {
      case "hardware": return <Cpu size={24} />;
      case "peripheral": 
      case "mice": return <MousePointer2 size={24} />;
      case "audio": return <Headphones size={24} />;
      default: return <Cpu size={24} />;
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-24 px-4 md:px-8 bg-zinc-950">
      <div className="container mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <h2 className="font-space-grotesk text-2xl md:text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter">
            Shop by <span className="text-[#ffc105]">Category</span>
          </h2>
          <Link href="/categories" className="group flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">View All</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((category) => (
            <Link 
              key={category._id} 
              href={`/categories/${category.slug}`}
              className="group relative h-64 overflow-hidden rounded-[24px] bg-zinc-900 border border-white/5 p-8 flex flex-col justify-between hover:border-[#ffc105]/40 transition-all"
            >
              <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-[#ffc105] group-hover:scale-110 transition-transform">
                {getCategoryIcon(category.slug)}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-space-grotesk text-2xl font-black text-white uppercase tracking-tighter group-hover:text-[#ffc105] transition-colors line-clamp-1">
                  {category.name_en}
                </h3>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">
                  {category.slug.replace('-', ' ')}
                </p>
                <p className="font-arabic text-zinc-600 text-sm pt-1">
                  {category.name_ar}
                </p>
              </div>

              {/* Decorative Arrow */}
              <div className="absolute top-8 right-8 h-10 w-10 rounded-full border border-white/5 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
