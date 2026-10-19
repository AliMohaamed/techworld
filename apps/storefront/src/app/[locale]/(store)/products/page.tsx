import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import CatalogExplorer from "@/components/storefront/catalog-explorer";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/products" });
}

export default function ProductsPage() {
  return <CatalogExplorer />;
}



