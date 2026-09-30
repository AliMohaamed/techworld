import Hero from "@/components/storefront/hero";
import RecentlyViewed from "@/components/storefront/recently-viewed";
import CategorySection from "@/components/storefront/category-section";
import DealsSection, { type DealProduct } from "@/components/storefront/deals-section";
import FeaturedProducts, { FeaturedProduct } from "@/components/storefront/featured-products";
import NewArrivals from "@/components/storefront/new-arrivals";
import CustomerReviews from "@/components/storefront/customer-reviews";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";

export default async function StorefrontHomePage() {
  const [products, categoriesResult, deals, newArrivals] = await Promise.all([
    fetchQuery(api.products.getForStorefront),
    fetchQuery(api.categories.listActiveCategories),
    fetchQuery(api.offers.listDeals, { sort: "discount_desc", limit: 10 }),
    fetchQuery(api.products.listNewArrivals, { limit: 8 }),
  ]);

  const featuredProducts = (products as FeaturedProduct[] | null)?.filter((p) => p.isFeatured).slice(0, 4) || [];
  const categories = categoriesResult?.categories || [];

  // Journey: resume (returning visitors) → orient → urgency → curation → discovery → reassurance.
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Hero />
      <RecentlyViewed />
      <CategorySection categories={categories} />
      <DealsSection deals={deals.items as DealProduct[]} total={deals.total} />
      <FeaturedProducts products={featuredProducts} />
      <NewArrivals products={newArrivals} />
      <CustomerReviews />
    </div>
  );
}
