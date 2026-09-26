import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import {
  ArrowRight,
  CreditCard,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Undo2,
} from "lucide-react";
import SupportHero from "@/components/storefront/support/support-hero";
import HelpCenterBrowser, {
  HelpCategory,
} from "@/components/storefront/support/help-center-browser";
import ContactChannels from "@/components/storefront/support/contact-channels";
import { SUPPORT_HOURS } from "@/lib/contact";

const BASE_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://techworld-store.com";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HelpCenter.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/support`,
      languages: {
        en: `${BASE_URL}/en/support`,
        ar: `${BASE_URL}/ar/support`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${BASE_URL}/${locale}/support`,
      siteName: "TechWorld",
      type: "website",
    },
  };
}

/** Topic id → icon. Copy lives in messages; iconography stays in code. */
const TOPIC_ICONS = {
  orders: ShoppingBag,
  shipping: Truck,
  returns: Undo2,
  tracking: PackageSearch,
  payment: CreditCard,
  privacy: ShieldCheck,
} as const;

type TopicId = keyof typeof TOPIC_ICONS;

export default async function HelpCenterPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HelpCenter" });
  const tCommon = await getTranslations({ locale, namespace: "SupportShared" });

  const topics = t.raw("topics.items") as {
    id: TopicId;
    title: string;
    description: string;
    href: string;
    cta: string;
  }[];

  const categories = t.raw("categories") as HelpCategory[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: categories.flatMap((category) =>
      category.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      }))
    ),
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-24 pt-12 transition-colors md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-7xl space-y-16 md:space-y-24">
        <SupportHero
          badge={t("hero.badge")}
          title={t("hero.title")}
          accent={t("hero.accent")}
          description={t("hero.description")}
          breadcrumbs={[
            { label: tCommon("breadcrumbs.home"), href: "/" },
            { label: t("hero.title") },
          ]}
        >
          <p className="inline-flex items-center gap-3 rounded-full border border-border bg-background/60 px-5 py-2.5 text-xs font-medium text-label-muted backdrop-blur">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-primary"
            />
            {t("hero.hours", {
              from: SUPPORT_HOURS.fromHour,
              to: SUPPORT_HOURS.toHour,
            })}
          </p>
        </SupportHero>

        <section aria-labelledby="help-topics" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="help-topics"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("topics.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("topics.description")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => {
              const Icon = TOPIC_ICONS[topic.id] ?? ShoppingBag;
              return (
                <Link
                  key={topic.id}
                  href={topic.href}
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:p-8"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-110">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 className="font-space-grotesk text-base font-bold tracking-tight text-foreground">
                    {topic.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-label-muted">
                    {topic.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-2 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                    {topic.cta}
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="help-answers" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="help-answers"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("browser.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("browser.description")}
            </p>
          </div>
          <HelpCenterBrowser categories={categories} />
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
            prefilledMessage: tCommon("contact.prefilled.general"),
          }}
        />
      </div>
    </div>
  );
}
