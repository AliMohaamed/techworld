import { Link } from "@/navigation";
import { ArrowUpRight } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

type CategoryGridCardProps = {
  category: {
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    description_en?: string;
    description_ar?: string;
  };
};

export default async function CategoryGridCard({ category }: CategoryGridCardProps) {
  const t = await getTranslations("CategoriesPage");
  const locale = await getLocale();

  return (
    <Link
      href={`/categories/${category.slug || category._id}`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-10 transition-all duration-300 hover:border-primary/30 hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex min-h-[280px] flex-col justify-between gap-10">
        <div className="flex items-start justify-between">
          <span className="rounded-md border border-border bg-secondary px-3 py-1 text-[10px] font-semibold text-label-muted uppercase tracking-wider">
            {category.slug.replaceAll("-", " ")}
          </span>
          <span className="rounded-lg border border-border bg-secondary p-2.5 text-label-muted transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-45">
            <ArrowUpRight size={18} />
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-space-grotesk text-3xl sm:text-4xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary leading-none tracking-tight">
              {locale === "en" ? category.name_en : category.name_ar}
            </h2>
            <p className="text-sm text-primary/60 font-normal opacity-60 group-hover:opacity-100 transition-opacity">
              {locale === "en" ? category.name_ar : category.name_en}
            </p>
          </div>
          <p className="max-w-sm text-xs font-medium leading-relaxed text-label-muted group-hover:text-foreground transition-colors tracking-wide uppercase">
            {(locale === "en"
              ? category.description_en
              : category.description_ar) ?? t("card.defaultDescription")}
          </p>
        </div>
      </div>
    </Link>
  );
}