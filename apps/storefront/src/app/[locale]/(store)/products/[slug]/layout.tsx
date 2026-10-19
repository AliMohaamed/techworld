import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { api } from "@backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { OG_IMAGE_SIZE, absoluteUrl, pageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  children: React.ReactNode;
};

// Shared by generateMetadata and the layout so each request queries once.
const getProduct = cache((slug: string) => fetchQuery(api.products.getBySlug, { slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  type ProductSku = {
  _id: string;
  isDefault?: boolean;
  linkedImageId?: string;
  price?: number;
};

const mainSku = product.skus?.find((s: ProductSku) => s.isDefault) || product.skus?.[0];
  const isArabic = locale === 'ar';
  const name = (isArabic && product.name_ar) || product.name_en;
  const description = isArabic ? product.description_ar || product.description_en : product.description_en;
  const fallbackDescription = isArabic
    ? `تسوّق ${name} من TechWorld. إكسسوارات تقنية عالية الجودة والمزيد.`
    : `Shop ${name} at TechWorld. High-quality tech accessories and more.`;

  const hasImage = Boolean(product.thumbnail || product.images?.[0]);
  const seo = pageMetadata({
    locale,
    path: `/products/${slug}`,
    title: name,
    description,
    // Product photos are WebP, which Facebook doesn't reliably render; this route re-encodes to a 1200x630 JPG.
    image: hasImage
      ? { url: absoluteUrl(`/og/product/${encodeURIComponent(slug)}`), ...OG_IMAGE_SIZE, alt: name }
      : undefined,
  });

  return {
    title: `${name} | TechWorld Store`,
    description: description || fallbackDescription,
    ...seo,
    other: {
      'product:price:amount': mainSku?.price?.toString() || '0',
      'product:price:currency': 'EGP',
    }
  };
}

export default async function ProductLayout({ children, params }: Props) {
  // Missing products must be a real 404, not a 200 "not found" page.
  const { slug } = await params;
  if (!(await getProduct(slug))) notFound();

  return <>{children}</>;
}
