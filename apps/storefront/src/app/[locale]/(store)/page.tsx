"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import Hero from "@/components/storefront/hero";
import CategorySection from "@/components/storefront/category-section";
import FeaturedProducts from "@/components/storefront/featured-products";
import { Skeleton } from "@techworld/ui";
import { Suspense } from "react";

export default function StorefrontHomePage() {
  const products = useQuery(api.products.getForStorefront);
  const categories = useQuery(api.categories.listActiveCategories);

  const isLoading = products === undefined || categories === undefined;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Hero />
      
      <Suspense fallback={<div className="container mx-auto py-24 px-8"><Skeleton className="h-[400px] w-full rounded-[32px] bg-muted/20" /></div>}>
        <CategorySection />
      </Suspense>
      
      <Suspense fallback={<div className="container mx-auto py-24 px-8"><Skeleton className="h-[600px] w-full rounded-[32px] bg-muted/20" /></div>}>
        {products && (
          <FeaturedProducts products={products as any} />
        )}
      </Suspense>
    </div>
  );
}
