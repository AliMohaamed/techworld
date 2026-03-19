"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import CategoryGridCard from "@/components/storefront/category-grid-card";

export default function CategoriesPage() {
  const categoryResult = useQuery(api.categories.listActiveCategories);
  const categories = categoryResult?.categories;

  if (!categories) {
    return (
      <div className="min-h-screen bg-black px-4 pb-20 pt-8 md:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-6">
          <div className="h-24 rounded-[32px] bg-zinc-900" />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 rounded-[28px] bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,#2b2b2b,transparent_50%),linear-gradient(180deg,#111111,#050505)] px-6 py-10 md:px-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#ffc105]">
            Active Collections
          </p>
          <h1 className="mt-3 font-space-grotesk text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
            Explore Categories
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
            Every active category routes into a filtered storefront view so customers can browse broad themes before narrowing into exact products.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <CategoryGridCard key={category._id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
