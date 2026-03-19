"use client";

import type { Id } from "@backend/convex/_generated/dataModel";
import FeaturedProductCard from "./featured-product-card";

type FeaturedProduct = {
  _id: Id<"products">;
  name_ar: string;
  name_en: string;
  selling_price: number;
  compareAtPrice?: number;
  display_stock?: number;
  images: string[];
  description_en?: string;
  slug?: string;
  skus?: Array<{
    _id: Id<"skus">;
    price: number;
    display_stock: number;
    isDefault?: boolean;
  }>;
};

interface FeaturedProductsProps {
  products: FeaturedProduct[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section id="featured" className="bg-black px-4 py-24 md:px-8">
      <div className="container mx-auto space-y-12">
        <div className="flex flex-col justify-between gap-6 border-b border-white/5 pb-8 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2">
              <div className="h-1 w-8 bg-[#ffc105]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffc105]">Premium Collection</span>
            </div>
            <h2 className="font-space-grotesk text-4xl font-black uppercase tracking-tighter text-white md:text-5xl lg:text-6xl">
              Featured <span className="text-zinc-800 outline-zinc-800">Gadgets</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
            Curated selection of our highest performing hardware. Tested for perfection.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <FeaturedProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
