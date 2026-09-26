import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";
import DealsExplorer from "@/components/storefront/deals-explorer";
import { Flame } from "lucide-react";

type DealsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: DealsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DealsPage" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
      type: "website",
    },
  };
}

export default async function DealsPage() {
  const t = await getTranslations("DealsPage");

  // Rendered server-side for the headline stats; the grid below re-queries
  // reactively so a price change lands without a reload.
  const deals = await fetchQuery(api.offers.listDeals, { sort: "discount_desc" });

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 md:px-8 transition-colors">
      <div className="mx-auto max-w-7xl space-y-12">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-8 py-16 md:px-14 lg:py-20 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-br from-primary/5 to-transparent dark:hidden" />

          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-3">
              <Flame size={14} className="text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                {t("badge")}
              </p>
            </div>
            <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tightest leading-none text-foreground md:text-7xl lg:text-8xl">
              {t("title")}
            </h1>
            <p className="max-w-xl text-sm font-medium leading-relaxed tracking-tight text-label-muted md:text-base">
              {t("description")}
            </p>

            {deals.total > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-primary">
                  {t("hero.liveDeals", { count: deals.total })}
                </span>
                <span className="rounded-full border border-border bg-background px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-label-muted">
                  {t("hero.upTo", { percent: deals.maxDiscountPercent })}
                </span>
              </div>
            )}
          </div>
        </section>

        <DealsExplorer />
      </div>
    </div>
  );
}
