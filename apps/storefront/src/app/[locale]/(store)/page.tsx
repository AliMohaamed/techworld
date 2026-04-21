import Hero from "@/components/storefront/hero";
import CategorySection from "@/components/storefront/category-section";
import FeaturedProducts from "@/components/storefront/featured-products";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";

export default async function StorefrontHomePage() {
  const [products, categoriesResult] = await Promise.all([
    fetchQuery(api.products.getForStorefront),
    fetchQuery(api.categories.listActiveCategories)
  ]);
  
  const featuredProducts = (products as any)?.filter((p: any) => p.isFeatured).slice(0, 4) || [];
  const categories = categoriesResult?.categories || [];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Hero />
      <CategorySection categories={categories} />
      <FeaturedProducts products={featuredProducts} />
    </div>
  );
}
