"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ProductCard from "@/components/storefront/product-card";

export default function StorefrontHomePage() {
  const products = useQuery(api.products.getForStorefront);

  if (products === undefined) {
    return (
      <div className="container mx-auto grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[4/5] rounded-xl bg-zinc-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero section could go here in future */}
      <section className="container mx-auto p-4 md:p-8">
        <header className="mb-8 border-l-4 border-[#ffc105] pl-4">
          <h2 className="font-space-grotesk text-3xl font-extrabold tracking-tighter text-white uppercase md:text-5xl">
            Latest <span className="text-[#ffc105]">Arrivals</span>
          </h2>
          <p className="max-w-md font-space-grotesk text-sm text-zinc-400">
            Exclusive flash-sale access to curated hardware collections. Limited stock, high demand.
          </p>
        </header>

        {products.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 text-zinc-500">
            <p>No published products available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
