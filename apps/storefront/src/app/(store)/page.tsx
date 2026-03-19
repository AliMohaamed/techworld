"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import Hero from "@/components/storefront/hero";
import CategorySection from "@/components/storefront/category-section";
import FeaturedProducts from "@/components/storefront/featured-products";

export default function StorefrontHomePage() {
  const products = useQuery(api.products.getForStorefront);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <Hero />
      <CategorySection />
      
      {products && (
        <FeaturedProducts products={products} />
      )}

      {/* Trust Badges / Social Proof */}
      {/* <section className="py-20 border-t border-white/5 bg-zinc-950/50">
        <div className="container mx-auto px-4 text-center space-y-8">
          <p className="font-space-grotesk text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-600">Global Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-20 grayscale filter">
            <span className="text-3xl font-black text-white italic">NVIDIA</span>
            <span className="text-3xl font-black text-white">RAZER</span>
            <span className="text-3xl font-black text-white italic">SONY</span>
            <span className="text-3xl font-black text-white">LOGITECH</span>
          </div>
        </div>
      </section> */}
    </div>
  );
}




