"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import ProductCard from "@/components/storefront/product-card";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function CategoryPage() {
  const { slug } = useParams();
  const category = useQuery(api.categories.getCategoryBySlug, { slug: slug as string });
  const products = useQuery(api.products.listProductsByCategory, 
    category ? { categoryId: category._id } : "skip"
  );

  if (category === undefined) {
    return (
      <div className="container mx-auto p-8 animate-pulse">
        <div className="h-8 w-48 bg-zinc-900 rounded mb-8" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-xl bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tighter">Category Not Found</h1>
        <Link href="/" className="mt-4 text-sm font-bold text-[#ffc105] hover:underline uppercase tracking-widest">
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-8 px-4 md:px-8">
      <div className="container mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-8 flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <Link href="/" className="hover:text-white transition-colors">Store</Link>
          <ChevronRight size={10} />
          <span className="text-white">{category.name_en}</span>
        </nav>

        {/* Header */}
        <header className="mb-12 space-y-2">
          <h1 className="font-space-grotesk text-5xl font-black tracking-tighter text-white uppercase md:text-7xl">
            {category.name_en}
          </h1>
          <p className="text-right font-arabic text-xl text-zinc-500">
            {category.name_ar}
          </p>
          {category.description_en && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {category.description_en}
            </p>
          )}
        </header>

        {/* Product Grid */}
        {!products || products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/5 bg-zinc-900/10 py-20 text-center">
            <p className="font-space-grotesk text-sm font-bold uppercase tracking-widest text-zinc-600">No products available in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
