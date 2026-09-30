import Image from "next/image";
import { Link } from "@/navigation";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

type CategoryGridCardProps = {
  category: {
    _id: string;
    name_en: string;
    name_ar: string;
    slug: string;
    description_en?: string;
    description_ar?: string;
    thumbnailUrl?: string | null;
  };
};

export default async function CategoryGridCard({ category }: CategoryGridCardProps) {
  const t = await getTranslations("CategoriesPage");
  const locale = await getLocale();
  const name = locale === "en" ? category.name_en : category.name_ar;
  const description =
    (locale === "en" ? category.description_en : category.description_ar) ?? t("card.defaultDescription");

  return (
    <Link
      href={`/categories/${category.slug || category._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-2 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary">
        {category.thumbnailUrl ? (
          <Image
            src={category.thumbnailUrl}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary">
            <LayoutGrid size={40} strokeWidth={1.5} />
          </div>
        )}
        <span className="absolute top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground backdrop-blur-md transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground ltr:right-2.5 rtl:left-2.5">
          <ArrowUpRight size={16} className="rtl:-scale-x-100" />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2 pt-3 sm:px-3 sm:pt-4">
        <h2 className="line-clamp-1 font-space-grotesk text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
          {name}
        </h2>
        <p className="line-clamp-2 text-xs leading-relaxed text-label-muted sm:text-sm">
          {description}
        </p>
      </div>
    </Link>
  );
}
