import { getTranslations } from "next-intl/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";
import CategoryGridCard from "@/components/storefront/category-grid-card";

export default async function CategoriesPage() {
  const t = await getTranslations("CategoriesPage");
  const categoriesResult = await fetchQuery(api.categories.listActiveCategories);
  const categories = categoriesResult?.categories || [];
  
  type CategoryItem = {
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    description_en?: string;
    description_ar?: string;
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 md:px-8 transition-colors">
      <div className="mx-auto max-w-7xl space-y-12">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-16 md:px-14 lg:py-20 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent dark:hidden" />

          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                {t("badge")}
              </p>
            </div>
            <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tightest text-foreground md:text-7xl lg:text-8xl leading-none">
              {t("title")}
            </h1>
            <p className="max-w-xl text-sm md:text-base leading-relaxed text-label-muted font-medium tracking-tight">
              {t("description")}
            </p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category: CategoryItem) => (
            <CategoryGridCard key={category._id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
