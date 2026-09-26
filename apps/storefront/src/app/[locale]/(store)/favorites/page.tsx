"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { useSession } from "@/providers/session-provider";
import ProductCard from "@/components/storefront/product-card";

export default function FavoritesPage() {
  const t = useTranslations("Favorites");
  const { sessionId } = useSession();
  const products = useQuery(api.favorites.listProducts, { sessionId });

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 md:px-8 transition-colors">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 font-space-grotesk text-3xl font-black uppercase tracking-tight text-foreground md:text-5xl">
            <Heart className="fill-destructive text-destructive" size={32} />
            {t("title")}
          </h1>
          <p className="text-sm text-label-muted">{t("subtitle")}</p>
        </header>

        {products === undefined ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="aspect-[3/5] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="text-label-muted">{t("empty")}</p>
            <Link
              href="/products"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              {t("browse")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
