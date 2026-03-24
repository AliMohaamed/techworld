import { getTranslations } from "next-intl/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";
import CategoryGridCard from "@/components/storefront/category-grid-card";

export default async function CategoriesPage() {
  const t = await getTranslations("CategoriesPage");
  const categoriesResult = await fetchQuery(api.categories.listActiveCategories);
  const categories = categoriesResult?.categories || [];

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 md:px-8 transition-colors">
      <div className="mx-auto max-w-7xl space-y-12">
        <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-8 py-16 md:px-14 lg:py-20   transition-all hover:shadow-[#ffc105]/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,193,5,0.08),transparent_70%)]" />
          {/* Light mode decorative gradient */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden" />

          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[#ffc105] shadow-[0_0_10px_rgba(255,193,5,0.5)]" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                {t("badge")}
              </p>
            </div>
            <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tightest text-foreground md:text-7xl lg:text-8xl leading-none">
              {t("title")}
            </h1>
            <p className="max-w-xl text-sm md:text-base leading-relaxed text-muted-foreground/60 font-medium tracking-tight">
              {t("description")}
            </p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category: any) => (
            <CategoryGridCard key={category._id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}
