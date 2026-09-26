import { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import SupportHero from "@/components/storefront/support/support-hero";
import OrderTracker from "@/components/storefront/support/order-tracker";
import FaqAccordion, {
  FaqItem,
} from "@/components/storefront/support/faq-accordion";
import ContactChannels from "@/components/storefront/support/contact-channels";

const BASE_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://techworld-store.com";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "TrackPage.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/track`,
      languages: {
        en: `${BASE_URL}/en/track`,
        ar: `${BASE_URL}/ar/track`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${BASE_URL}/${locale}/track`,
      siteName: "TechWorld",
      type: "website",
    },
    // Lookup results are personal and parameterised; keep them out of indexes.
    robots: { index: true, follow: true, noarchive: true },
  };
}

export default async function TrackPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "TrackPage" });
  const tCommon = await getTranslations({ locale, namespace: "SupportShared" });

  const faqs = (t.raw("faq.items") as { question: string; answer: string }[]).map(
    (item, index) => ({ id: `track-faq-${index}`, ...item })
  ) satisfies FaqItem[];

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 transition-colors md:px-8">
      <div className="mx-auto max-w-7xl space-y-16 md:space-y-24">
        <SupportHero
          badge={t("hero.badge")}
          title={t("hero.title")}
          accent={t("hero.accent")}
          description={t("hero.description")}
          breadcrumbs={[
            { label: tCommon("breadcrumbs.home"), href: "/" },
            { label: tCommon("breadcrumbs.support"), href: "/support" },
            { label: t("hero.title") },
          ]}
        />

        <Suspense
          fallback={
            <div className="rounded-2xl border border-border bg-card py-24 text-center font-space-grotesk text-[10px] font-black uppercase tracking-[0.5em] text-label-muted">
              {t("states.loading")}
            </div>
          }
        >
          <OrderTracker />
        </Suspense>

        <section aria-labelledby="track-faq" className="space-y-8">
          <h2
            id="track-faq"
            className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
          >
            {t("faq.title")}
          </h2>
          <FaqAccordion items={faqs} defaultOpenIndex={0} />
        </section>

        <section className="grid gap-6 rounded-2xl border border-border bg-card p-8 md:grid-cols-2 md:items-center md:p-12">
          <div className="space-y-3">
            <h2 className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-3xl">
              {t("cta.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("cta.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 md:justify-end">
            <Link
              href="/shipping"
              className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted transition-all hover:border-primary/30 hover:text-foreground"
            >
              {t("cta.shipping")}
            </Link>
            <Link
              href="/returns"
              className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted transition-all hover:border-primary/30 hover:text-foreground"
            >
              {t("cta.returns")}
            </Link>
          </div>
        </section>

        <ContactChannels
          labels={{
            title: tCommon("contact.title"),
            description: tCommon("contact.description"),
            whatsapp: {
              label: tCommon("contact.whatsapp.label"),
              detail: tCommon("contact.whatsapp.detail"),
            },
            email: {
              label: tCommon("contact.email.label"),
              detail: tCommon("contact.email.detail"),
            },
            phone: {
              label: tCommon("contact.phone.label"),
              detail: tCommon("contact.phone.detail"),
            },
            prefilledMessage: tCommon("contact.prefilled.tracking"),
          }}
        />
      </div>
    </div>
  );
}
