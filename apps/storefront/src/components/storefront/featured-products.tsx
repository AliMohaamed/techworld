"use client";

import FeaturedProductCard from "./featured-product-card";

interface FeaturedProductsProps {
  products: any[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section id="featured" className="py-24 px-4 md:px-8 bg-black">
      <div className="container mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2">
              <div className="h-1 w-8 bg-[#ffc105]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ffc105]">Premium Collection</span>
            </div>
            <h2 className="font-space-grotesk text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter">
              Featured <span className="text-zinc-800 outline-zinc-800">Gadgets</span>
            </h2>
          </div>
          <p className="max-w-xs text-zinc-500 text-sm leading-relaxed">
            Curated selection of our highest performing hardware. Tested for perfection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.slice(0, 4).map((product) => (
            <FeaturedProductCard key={product._id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}



