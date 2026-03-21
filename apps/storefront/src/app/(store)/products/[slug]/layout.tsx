import { Metadata } from 'next';
import { api } from "@backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

type Props = {
  params: { slug: string };
  children: React.ReactNode;
};

const BASE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL || 'https://techworld-store.com';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetchQuery(api.products.getBySlug, { slug: params.slug });

  if (!product) {
    return {
      title: 'Product Not Found | TechWorld',
    };
  }

  const mainSku = product.skus?.find((s: any) => s.isDefault) || product.skus?.[0];
  const ogImage = product.thumbnail || product.images?.[0];

  return {
    title: `${product.name_en} | TechWorld Store`,
    description: product.description_en || `Shop ${product.name_en} at TechWorld. High-quality tech accessories and more.`,
    openGraph: {
      title: product.name_en,
      description: product.description_en,
      url: `${BASE_URL}/products/${params.slug}`,
      siteName: 'TechWorld',
      images: ogImage ? [{ url: ogImage }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name_en,
      description: product.description_en,
      images: ogImage ? [ogImage] : [],
    },
    other: {
      'product:price:amount': mainSku?.price?.toString() || '0',
      'product:price:currency': 'EGP',
    }
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
