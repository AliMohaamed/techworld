"use client";

import { useParams } from "next/navigation";
import CatalogExplorer from "@/components/storefront/catalog-explorer";

export default function CategoryPage() {
  const { id } = useParams();

  return <CatalogExplorer lockedCategoryId={id as string} />;
}
