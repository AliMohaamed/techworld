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
const getCategory = cache((slug: string) => fetchQuery(api.categories.getCategoryBySlug, { slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await getCategory(slug);

  if (!category) notFound();

  const isArabic = locale === 'ar';
  const name = (isArabic && category.name_ar) || category.name_en;
  const description = isArabic ? category.description_ar || category.description_en : category.description_en;

  return {
    title: isArabic ? `مجموعة ${name} | TechWorld Store` : `${name} Collection | TechWorld Store`,
    description:
      description ||
      (isArabic
        ? `استكشف مجموعة ${name}. إكسسوارات تقنية بجودة عالية من TechWorld.`
        : `Explore our ${name} collection. Premium quality tech accessories at TechWorld.`),
    ...pageMetadata({
      locale,
      path: `/categories/${slug}`,
      title: name,
      description,
      // thumbnailImageId is a storage ref, not a URL; the OG route resolves it and re-encodes to JPG.
      image: category.thumbnailImageId
        ? { url: absoluteUrl(`/og/category/${encodeURIComponent(slug)}`), ...OG_IMAGE_SIZE, alt: name }
        : undefined,
    }),
  };
}

export default async function CategoryLayout({ children, params }: Props) {
  // Missing categories must be a real 404, not a 200 "not found" page.
  const { slug } = await params;
  if (!(await getCategory(slug))) notFound();

  return <>{children}</>;
}
