import { Link } from "@/navigation";
import { ArrowUpRight, Cpu, MousePointer2, Headphones } from "lucide-react";

import { CategorySwiper } from "./CategorySwiper";
import { getTranslations, getLocale } from "next-intl/server";


interface CategorySectionProps {
  categories: Array<{
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  }>;
}

export default async function CategorySection({ categories }: CategorySectionProps) {
  const t = await getTranslations('CategorySection');
  const locale = await getLocale();

  const getCategoryIcon = (slug: string) => {
    switch (slug?.toLowerCase()) {
      case "hardware": return <Cpu size={22} />;
      case "peripheral":
      case "mice": return <MousePointer2 size={22} />;
      case "audio": return <Headphones size={22} />;
      default: return <Cpu size={22} />;
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-20 px-4 md:px-8 bg-background">
      <div className="container mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <h2 className="font-space-grotesk text-2xl md:text-4xl font-bold text-foreground tracking-tight">
            {t('title')} <span className="text-primary">{t('accentTitle')}</span>
          </h2>
          <Link href="/categories" className="group flex items-center gap-2 text-label-muted hover:text-foreground transition-colors">
            <span className="text-xs font-semibold">{t('viewAll')}</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <CategorySwiper
          categories={categories}
          locale={locale}
        />

        <div className="hidden md:grid md:grid-cols-3 gap-5">
          {categories.slice(0, 3).map((category) => (
            <Link
              key={category._id}
              href={`/categories/${category.slug || category._id}`}
              className="group relative h-56 overflow-hidden rounded-xl bg-card border border-border p-7 flex flex-col justify-between hover:border-primary/30 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {getCategoryIcon(category.slug)}
              </div>

              <div className="space-y-1">
                <h3 className="font-space-grotesk text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                  {locale === 'en' ? category.name_en : category.name_ar}
                </h3>
                <p className="text-label-muted text-xs font-medium">
                  {category.slug.replace('-', ' ')}
                </p>
              </div>

              <div className="absolute top-7 right-7 h-8 w-8 rounded-lg border border-border flex items-center justify-center text-foreground/40 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 bg-card">
                <ArrowUpRight size={16} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}