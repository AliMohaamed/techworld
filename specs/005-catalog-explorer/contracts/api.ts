// Phase 1: API Interface Contracts
// File: contracts/api.ts
// Details the exact shape of the new/required Convex Queries

interface CatalogProduct {
  _id: string;
  categoryId: string;
  name_ar: string;
  name_en: string;
  selling_price: number;
  display_stock: number;
  images: string[];
}

interface Category {
  _id: string;
  name_ar: string;
  name_en: string;
  slug: string;
}

/**
 * Convex Query: api.products.searchAndFilter
 * Designed for paginated fetching of the catalog adhering to absolute server authority.
 */
export interface SearchAndFilterArgs {
  categoryId?: string | null;  // Matches Convex Id<"categories">
  minPrice?: number | null;
  maxPrice?: number | null;
  sortOrder?: 'price_asc' | 'price_desc' | 'newest';
  searchQuery?: string | null;
  paginationOpts: {
    numItems: number;
    cursor: string | null;
  };
}

export interface SearchAndFilterResult {
  page: CatalogProduct[]; // Subset of product fields exposed to client (financials stripped)
  isDone: boolean;
  continueCursor: string;
}

/**
 * Convex Query: api.categories.listActiveCategories
 * Required to render the Grid Overview and dynamically populate the filter drawer.
 */
export interface ListActiveCategoriesResult {
  categories: Category[];
}

/**
 * Convex Query: api.products.getRecommendedProducts
 * Secondary query utilized specifically to populate UI fallback during Empty States.
 */
export interface GetRecommendedProductsResult {
  products: CatalogProduct[];
}
