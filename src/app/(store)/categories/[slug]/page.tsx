"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import CatalogExplorer from "@/components/storefront/catalog-explorer";

export default function CategoryPage() {
  const { slug } = useParams();
  
  const category = useQuery(api.categories.getCategoryBySlug, 
    slug ? { slug: slug as string } : "skip"
  );

  if (category === undefined) return <div className="min-h-screen py-24 text-center">Loading...</div>;
  if (category === null) return <div className="min-h-screen py-24 text-center">Category not found</div>;

  return <CatalogExplorer lockedCategoryId={category._id} />;
}
