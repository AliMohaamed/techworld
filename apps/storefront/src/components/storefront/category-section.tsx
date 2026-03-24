import { Link } from "@/navigation";
import { ArrowUpRight, Cpu, MousePointer2, Headphones } from "lucide-react";

import { CategorySwiper } from "./CategorySwiper";
import { getTranslations, getLocale } from "next-intl/server";


interface CategorySectionProps {
  categories: any[];
}

export default async function CategorySection({ categories }: CategorySectionProps) {
  const t = await getTranslations('CategorySection');
  const locale = await getLocale();

  const getCategoryIcon = (slug: string) => {
    switch (slug?.toLowerCase()) {
      case "hardware": return <Cpu size={24} />;
      case "peripheral": 
      case "mice": return <MousePointer2 size={24} />;
      case "audio": return <Headphones size={24} />;
      default: return <Cpu size={24} />;
    }
  };

  if (!categories || categories.length === 0) return null;

  return (
    <section className="py-24 px-4 md:px-8 bg-background">
      <div className="container mx-auto space-y-12">
        <div className="flex items-center justify-between">
          <h2 className="font-space-grotesk text-2xl md:text-4xl lg:text-5xl font-black text-foreground uppercase tracking-tighter">
            {t('title')} <span className="text-[#ffc105]">{t('accentTitle')}</span>
          </h2>
          <Link href="/categories" className="group flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-all">
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{t('viewAll')}</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        <CategorySwiper 
          categories={categories} 
          locale={locale} 
        />

        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {categories.slice(0, 3).map((category) => (
            <Link 
              key={category._id} 
              href={`/categories/${category.slug || category._id}`}
              className="group relative h-64 overflow-hidden rounded-[24px] bg-card border border-border p-8 flex flex-col justify-between hover:border-[#ffc105]/40 transition-all shadow-xl hover:shadow-[#ffc105]/5"
            >
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-[#ffc105] group-hover:scale-110 transition-transform">
                {getCategoryIcon(category.slug)}
              </div>
              
              <div className="space-y-1">
                <h3 className="font-space-grotesk text-2xl font-black text-foreground uppercase tracking-tighter group-hover:text-[#ffc105] transition-colors line-clamp-1">
                  {locale === 'en' ? category.name_en : category.name_ar}
                </h3>
                <p className="text-muted-foreground/60 text-xs font-medium uppercase tracking-widest">
                  {category.slug.replace('-', ' ')}
                </p>
              </div>

              {/* Decorative Arrow */}
              <div className="absolute top-8 right-8 h-10 w-10 rounded-full border border-border flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 bg-accent">
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
