import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@backend/convex/_generated/api";
import { Link } from "@/navigation";
import {
  BadgeCheck,
  Boxes,
  CalendarClock,
  MapPin,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";
import SupportHero from "@/components/storefront/support/support-hero";
import ProcessSteps, {
  ProcessStep,
} from "@/components/storefront/support/process-steps";
import ShippingRatesTable, {
  ShippingRate,
} from "@/components/storefront/support/shipping-rates-table";
import FaqAccordion, {
  FaqItem,
} from "@/components/storefront/support/faq-accordion";
import ContactChannels from "@/components/storefront/support/contact-channels";

const BASE_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://techworld-store.com";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShippingPage.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/shipping`,
      languages: {
        en: `${BASE_URL}/en/shipping`,
        ar: `${BASE_URL}/ar/shipping`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${BASE_URL}/${locale}/shipping`,
      siteName: "TechWorld",
      type: "website",
    },
  };
}

const ZONE_ICONS = [MapPin, Boxes, CalendarClock, PackageCheck] as const;

export default async function ShippingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShippingPage" });
  const tCommon = await getTranslations({
    locale,
    namespace: "SupportShared",
  });

  const governorates = await fetchQuery(api.governorates.listActiveGovernorates);

  const rates: ShippingRate[] = (governorates ?? []).map((governorate) => ({
    id: governorate._id,
    name_en: governorate.name_en,
    name_ar: governorate.name_ar,
    shippingFee: governorate.shippingFee,
  }));

  const cheapest = rates.length
    ? Math.min(...rates.map((rate) => rate.shippingFee))
    : null;

  const steps = t.raw("process.steps") as ProcessStep[];
  const zones = t.raw("zones.items") as {
    name: string;
    areas: string;
    estimate: string;
  }[];
  const expectations = t.raw("expectations.items") as {
    title: string;
    description: string;
  }[];
  const faqs = (t.raw("faq.items") as { question: string; answer: string }[]).map(
    (item, index) => ({ id: `shipping-faq-${index}`, ...item })
  ) satisfies FaqItem[];

  const highlights = [
    {
      icon: CalendarClock,
      label: t("highlights.dispatch.label"),
      value: t("highlights.dispatch.value"),
    },
    {
      icon: MapPin,
      label: t("highlights.coverage.label"),
      value: t("highlights.coverage.value", { count: rates.length }),
    },
    {
      icon: BadgeCheck,
      label: t("highlights.from.label"),
      value:
        cheapest === null
          ? t("highlights.from.fallback")
          : t("highlights.from.value", {
              amount: cheapest.toLocaleString(locale),
            }),
    },
  ];

  // Structured data so shipping terms can surface directly in search results.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
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
            { label: tCommon("breadcrumbs.support"), href: "/support" },
            { label: t("hero.title") },
          ]}
        >
          <dl className="grid gap-4 pt-4 sm:grid-cols-3">
            {highlights.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-xl border border-border bg-background/60 p-4 backdrop-blur"
              >
                <Icon size={20} className="shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-[10px] font-black uppercase tracking-[0.25em] text-label-muted">
                    {label}
                  </dt>
                  <dd className="font-space-grotesk text-sm font-bold tracking-tight text-foreground">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </SupportHero>

        <section aria-labelledby="shipping-process" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="shipping-process"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("process.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("process.description")}
            </p>
          </div>
          <ProcessSteps steps={steps} />
        </section>

        <section aria-labelledby="shipping-zones" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="shipping-zones"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("zones.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("zones.description")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {zones.map((zone, index) => {
              const Icon = ZONE_ICONS[index % ZONE_ICONS.length];
              return (
                <article
                  key={zone.name}
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg md:p-8"
                >
                  <Icon
                    size={22}
                    className="text-label-muted/50 transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="font-space-grotesk text-base font-bold tracking-tight text-foreground">
                    {zone.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-label-muted">
                    {zone.areas}
                  </p>
                  <p className="mt-auto font-space-grotesk text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                    {zone.estimate}
                  </p>
                </article>
              );
            })}
          </div>

          <p className="rounded-2xl border border-border bg-accent/30 p-6 text-xs leading-relaxed text-label-muted">
            {t("zones.disclaimer")}
          </p>
        </section>

        <section aria-labelledby="shipping-rates" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="shipping-rates"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("rates.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("rates.description")}
            </p>
          </div>
          <ShippingRatesTable rates={rates} />
        </section>

        <section aria-labelledby="shipping-expectations" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="shipping-expectations"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("expectations.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("expectations.description")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {expectations.map((item) => (
              <article
                key={item.title}
                className="space-y-3 rounded-2xl border border-border bg-card p-6 md:p-8"
              >
                <ShieldCheck size={20} className="text-primary" aria-hidden="true" />
                <h3 className="font-space-grotesk text-sm font-bold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-label-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="shipping-faq" className="space-y-8">
          <h2
            id="shipping-faq"
            className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
          >
            {t("faq.title")}
          </h2>
          <FaqAccordion items={faqs} defaultOpenIndex={0} />
        </section>

        <section className="grid gap-6 rounded-2xl border border-border bg-card p-8 md:grid-cols-2 md:items-center md:p-12">
          <div className="space-y-3">
            <h2 className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-3xl">
              {t("trackCta.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("trackCta.description")}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 md:justify-end">
            <Link
              href="/track"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground transition-all hover:bg-foreground hover:text-background"
            >
              {t("trackCta.primary")}
            </Link>
            <Link
              href="/returns"
              className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted transition-all hover:border-primary/30 hover:text-foreground"
            >
              {t("trackCta.secondary")}
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
            prefilledMessage: tCommon("contact.prefilled.shipping"),
          }}
        />
      </div>
    </div>
  );
}
