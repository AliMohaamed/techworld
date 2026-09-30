import Image from "next/image";
import { Link } from "@/navigation";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

interface CategorySectionProps {
  categories: Array<{
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    thumbnailUrl?: string | null;
  }>;
}

export default async function CategorySection({ categories }: CategorySectionProps) {
  const t = await getTranslations('CategorySection');
  const locale = await getLocale();

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-16 md:py-20 px-4 md:px-8 bg-background">
      <div className="container mx-auto space-y-8 md:space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="font-space-grotesk text-2xl md:text-4xl font-bold text-foreground tracking-tight">
            {t('title')} <span className="text-primary">{t('accentTitle')}</span>
          </h2>
          <Link href="/categories" className="group flex items-center gap-2 text-label-muted hover:text-foreground transition-colors">
            <span className="text-xs font-semibold">{t('viewAll')}</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
          </Link>
        </div>

        {/* Mobile: swipeable row that bleeds to the screen edge. Desktop: grid. */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
          {categories.map((category) => {
            const name = locale === 'en' ? category.name_en : category.name_ar;
            return (
              <li key={category._id} className="w-28 shrink-0 snap-start sm:w-32 md:w-auto">
                <Link
                  href={`/categories/${category.slug || category._id}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5">
                    {category.thumbnailUrl ? (
                      <Image
                        src={category.thumbnailUrl}
                        alt={name}
                        fill
                        sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 128px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
                        <LayoutGrid size={32} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                  <span className="line-clamp-2 text-center text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                    {name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
