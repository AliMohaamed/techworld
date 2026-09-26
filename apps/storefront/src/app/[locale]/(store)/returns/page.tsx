import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { CalendarDays, Check, RefreshCcw, Wallet, X } from "lucide-react";
import SupportHero from "@/components/storefront/support/support-hero";
import ProcessSteps, {
  ProcessStep,
} from "@/components/storefront/support/process-steps";
import FaqAccordion, {
  FaqItem,
} from "@/components/storefront/support/faq-accordion";
import ContactChannels from "@/components/storefront/support/contact-channels";

const BASE_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://techworld-store.com";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReturnsPage.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/returns`,
      languages: {
        en: `${BASE_URL}/en/returns`,
        ar: `${BASE_URL}/ar/returns`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${BASE_URL}/${locale}/returns`,
      siteName: "TechWorld",
      type: "website",
    },
  };
}

export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReturnsPage" });
  const tCommon = await getTranslations({ locale, namespace: "SupportShared" });

  const eligible = t.raw("eligibility.eligible.items") as string[];
  const notEligible = t.raw("eligibility.notEligible.items") as string[];
  const steps = t.raw("process.steps") as ProcessStep[];
  const refunds = t.raw("refunds.rows") as {
    method: string;
    window: string;
    note: string;
  }[];
  const warranty = t.raw("warranty.items") as {
    title: string;
    description: string;
  }[];
  const faqs = (t.raw("faq.items") as { question: string; answer: string }[]).map(
    (item, index) => ({ id: `returns-faq-${index}`, ...item })
  ) satisfies FaqItem[];

  const highlights = [
    {
      icon: CalendarDays,
      label: t("highlights.window.label"),
      value: t("highlights.window.value"),
    },
    {
      icon: RefreshCcw,
      label: t("highlights.exchange.label"),
      value: t("highlights.exchange.value"),
    },
    {
      icon: Wallet,
      label: t("highlights.refund.label"),
      value: t("highlights.refund.value"),
    },
  ];

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

        <section aria-labelledby="returns-eligibility" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="returns-eligibility"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("eligibility.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("eligibility.description")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-6 md:p-8">
              <h3 className="font-space-grotesk text-sm font-black uppercase tracking-[0.2em] text-foreground">
                {t("eligibility.eligible.title")}
              </h3>
              <ul className="space-y-4">
                {eligible.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary"
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="text-sm leading-relaxed text-label-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5 rounded-2xl border border-border bg-card p-6 md:p-8">
              <h3 className="font-space-grotesk text-sm font-black uppercase tracking-[0.2em] text-foreground">
                {t("eligibility.notEligible.title")}
              </h3>
              <ul className="space-y-4">
                {notEligible.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-destructive/15 text-destructive"
                    >
                      <X size={12} strokeWidth={3} />
                    </span>
                    <span className="text-sm leading-relaxed text-label-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="returns-process" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="returns-process"
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

        <section aria-labelledby="returns-refunds" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="returns-refunds"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("refunds.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("refunds.description")}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">{t("refunds.caption")}</caption>
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {(
                      [
                        "method",
                        "window",
                        "note",
                      ] as const
                    ).map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-6 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-label-muted ltr:text-left rtl:text-right"
                      >
                        {t(`refunds.columns.${column}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refunds.map((row) => (
                    <tr key={row.method} className="transition-colors hover:bg-accent/40">
                      <th
                        scope="row"
                        className="px-6 py-5 font-medium text-foreground ltr:text-left rtl:text-right"
                      >
                        {row.method}
                      </th>
                      <td className="whitespace-nowrap px-6 py-5 font-space-grotesk font-bold tracking-tight text-primary">
                        {row.window}
                      </td>
                      <td className="px-6 py-5 leading-relaxed text-label-muted">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="rounded-2xl border border-border bg-accent/30 p-6 text-xs leading-relaxed text-label-muted">
            {t("refunds.disclaimer")}
          </p>
        </section>

        <section aria-labelledby="returns-warranty" className="space-y-8">
          <div className="max-w-2xl space-y-3">
            <h2
              id="returns-warranty"
              className="font-space-grotesk text-2xl font-black uppercase tracking-tightest text-foreground md:text-4xl"
            >
              {t("warranty.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("warranty.description")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {warranty.map((item) => (
              <article
                key={item.title}
                className="space-y-3 rounded-2xl border border-border bg-card p-6 md:p-8"
              >
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

        <section
          aria-labelledby="returns-failed-delivery"
          className="rounded-2xl border border-border bg-card p-8 md:p-12"
        >
          <div className="max-w-3xl space-y-4">
            <h2
              id="returns-failed-delivery"
              className="font-space-grotesk text-xl font-black uppercase tracking-tightest text-foreground md:text-2xl"
            >
              {t("failedDelivery.title")}
            </h2>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("failedDelivery.description")}
            </p>
            <p className="text-sm leading-relaxed text-label-muted">
              {t("failedDelivery.note")}
            </p>
          </div>
        </section>

        <section aria-labelledby="returns-faq" className="space-y-8">
          <h2
            id="returns-faq"
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
              href="/track"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-primary-foreground transition-all hover:bg-foreground hover:text-background"
            >
              {t("cta.primary")}
            </Link>
            <Link
              href="/shipping"
              className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-label-muted transition-all hover:border-primary/30 hover:text-foreground"
            >
              {t("cta.secondary")}
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
            prefilledMessage: tCommon("contact.prefilled.returns"),
          }}
        />
      </div>
    </div>
  );
}
