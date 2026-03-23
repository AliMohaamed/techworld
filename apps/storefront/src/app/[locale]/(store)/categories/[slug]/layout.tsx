import { Metadata } from 'next';
import { api } from "@backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://techworld-store.com';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await fetchQuery(api.categories.getCategoryBySlug, { slug });

  if (!category) {
    return {
      title: 'Category Not Found | TechWorld',
    };
  }

  const ogImage = category.thumbnailImageId || undefined;

  return {
    title: `${category.name_en} Collection | TechWorld Store`,
    description: category.description_en || `Explore our ${category.name_en} collection. Premium quality tech accessories at TechWorld.`,
    openGraph: {
      title: category.name_en,
      description: category.description_en,
      url: `${BASE_URL}/categories/${slug}`,
      siteName: 'TechWorld',
      images: ogImage ? [{ url: ogImage }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: category.name_en,
      description: category.description_en,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default function CategoryLayout({ children }: Props) {
  return <>{children}</>;
}
