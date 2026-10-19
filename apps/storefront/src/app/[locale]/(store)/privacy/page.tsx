import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import SupportHero from "@/components/storefront/support/support-hero";
import ContactChannels from "@/components/storefront/support/contact-channels";
import { SUPPORT_EMAIL, SUPPORT_PHONES, SUPPORT_WHATSAPP_DISPLAY } from "@/lib/contact";

const BASE_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://techworldegypt.com";

type Props = { params: Promise<{ locale: string }> };

type PolicyItem = { term?: string; text: string };
type PolicyLink = { label: string; href: string };
type PolicySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: PolicyItem[];
  after?: string[];
  links?: PolicyLink[];
};
type CookieRow = {
  name: string;
  provider: string;
  purpose: string;
  type: string;
  duration: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage.meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${BASE_URL}/${locale}/privacy`,
      languages: {
        en: `${BASE_URL}/en/privacy`,
        ar: `${BASE_URL}/ar/privacy`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${BASE_URL}/${locale}/privacy`,
      siteName: "TechWorld",
      type: "website",
    },
  };
}

function SectionBody({ section }: { section: PolicySection }) {
  return (
    <>
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-relaxed text-label-muted md:text-base">
          {paragraph}
        </p>
      ))}
      {section.items && (
        <ul className="space-y-3">
          {section.items.map((item) => (
            <li key={item.term ?? item.text} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-sm leading-relaxed text-label-muted md:text-base">
                {item.term && <strong className="font-semibold text-foreground">{item.term}: </strong>}
                {item.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      {section.after?.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-relaxed text-label-muted md:text-base">
          {paragraph}
        </p>
      ))}
      {section.links && (
        <ul className="flex flex-wrap gap-3">
          {section.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });
  const tCommon = await getTranslations({ locale, namespace: "SupportShared" });

  const sections = t.raw("sections") as PolicySection[];
  const cookieRows = t.raw("cookies.rows") as CookieRow[];
  const cookieColumns = ["name", "provider", "purpose", "type", "duration"] as const;

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
            { label: t("hero.breadcrumb") },
          ]}
        >
          <p className="pt-2 text-xs font-semibold uppercase tracking-[0.2em] text-label-muted">
            {t("lastUpdated", { date: t("effectiveDate") })}
          </p>
        </SupportHero>

        <div className="grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav aria-labelledby="privacy-toc" className="lg:sticky lg:top-28 lg:self-start">
            <h2
              id="privacy-toc"
              className="mb-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-label-muted"
            >
              {t("toc")}
            </h2>
            <ol className="space-y-2 border-border ltr:border-l rtl:border-r">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block py-1 text-sm text-label-muted transition-colors hover:text-primary ltr:pl-4 rtl:pr-4"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-12">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-28 space-y-5"
              >
                <h2
                  id={`${section.id}-title`}
                  className="font-space-grotesk text-xl font-black uppercase tracking-tightest text-foreground md:text-2xl"
                >
                  {section.title}
                </h2>
                <SectionBody section={section} />

                {section.id === "cookies" && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <caption className="sr-only">{t("cookies.caption")}</caption>
                        <thead>
                          <tr className="border-b border-border bg-secondary/50">
                            {cookieColumns.map((column) => (
                              <th
                                key={column}
                                scope="col"
                                className="px-5 py-4 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-label-muted ltr:text-left rtl:text-right"
                              >
                                {t(`cookies.columns.${column}`)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {cookieRows.map((row) => (
                            <tr key={row.name}>
                              <th
                                scope="row"
                                className="px-5 py-4 align-top font-mono text-xs font-semibold text-foreground ltr:text-left rtl:text-right"
                              >
                                {row.name}
                              </th>
                              <td className="px-5 py-4 align-top text-label-muted">{row.provider}</td>
                              <td className="px-5 py-4 align-top leading-relaxed text-label-muted">{row.purpose}</td>
                              <td className="px-5 py-4 align-top text-label-muted">{row.type}</td>
                              <td className="px-5 py-4 align-top text-label-muted">{row.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section.id === "contact" && (
                  <dl className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-[0.25em] text-label-muted">
                        {t("contactDetails.whatsapp")}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground" dir="ltr">
                        {SUPPORT_WHATSAPP_DISPLAY}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-[0.25em] text-label-muted">
                        {t("contactDetails.email")}
                      </dt>
                      <dd className="mt-1 break-all text-sm font-semibold text-foreground">
                        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary">
                          {SUPPORT_EMAIL}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-black uppercase tracking-[0.25em] text-label-muted">
                        {t("contactDetails.phone")}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground" dir="ltr">
                        {SUPPORT_PHONES.join(" · ")}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>
            ))}

            <p className="rounded-2xl border border-border bg-accent/30 p-6 text-xs leading-relaxed text-label-muted">
              {t("related.text")}{" "}
              <Link href="/returns" className="font-semibold text-foreground hover:text-primary">
                {t("related.returns")}
              </Link>
              {" · "}
              <Link href="/shipping" className="font-semibold text-foreground hover:text-primary">
                {t("related.shipping")}
              </Link>
            </p>
          </div>
        </div>

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
            prefilledMessage: t("prefilledMessage"),
          }}
        />
      </div>
    </div>
  );
}
