import Hero from "@/components/storefront/hero";
import CategorySection from "@/components/storefront/category-section";
import FeaturedProducts from "@/components/storefront/featured-products";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";

type ProductItem = {
  _id: string;
  name_ar: string;
  name_en: string;
  selling_price: number;
  compareAtPrice?: number;
  display_stock?: number;
  images: string[];
  description_en?: string;
  slug?: string;
  skus?: Array<{
    _id: string;
    price: number;
    display_stock: number;
    isDefault?: boolean;
  }>;
  isFeatured?: boolean;
};

export default async function StorefrontHomePage() {
  const [products, categoriesResult] = await Promise.all([
    fetchQuery(api.products.getForStorefront),
    fetchQuery(api.categories.listActiveCategories)
  ]);
  
  const featuredProducts = (products as ProductItem[] | null)?.filter((p) => p.isFeatured).slice(0, 4) || [];
  const categories = categoriesResult?.categories || [];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Hero />
      <CategorySection categories={categories} />
      <FeaturedProducts products={featuredProducts} />
    </div>
  );
}
