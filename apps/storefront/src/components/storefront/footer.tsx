import { Link } from "@/navigation";
import { Github, Twitter, Instagram } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NewsletterForm } from "./NewsletterForm";

export default async function Footer() {
  const t = await getTranslations('Footer');

  return (
    <footer className="border-t border-border bg-background pt-20 pb-10 px-4 sm:px-6 md:px-12">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-16 mb-16">
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2.5 outline-none group w-fit">
              <div className="h-4 w-4 rounded-[4px] bg-primary group-hover:rotate-45 transition-transform" />
              <span className="font-space-grotesk text-xl font-bold tracking-tight text-foreground uppercase">
                TECH<span className="text-primary">WORLD</span>
              </span>
            </Link>
            <p className="text-label-muted text-sm leading-relaxed max-w-xs">
              {t('tagline')}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link href="#" className="h-10 w-10 rounded-lg border border-border bg-secondary flex items-center justify-center text-label-muted hover:text-primary hover:border-primary/30 hover:scale-105 transition-all">
                <Github size={18} />
              </Link>
              <Link href="#" className="h-10 w-10 rounded-lg border border-border bg-secondary flex items-center justify-center text-label-muted hover:text-primary hover:border-primary/30 hover:scale-105 transition-all">
                <Twitter size={18} />
              </Link>
              <Link href="#" className="h-10 w-10 rounded-lg border border-border bg-secondary flex items-center justify-center text-label-muted hover:text-primary hover:border-primary/30 hover:scale-105 transition-all">
                <Instagram size={18} />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-space-grotesk text-foreground text-xs font-bold uppercase tracking-wider mb-6">{t('sections.explore')}</h4>
            <ul className="space-y-3">
              {[
                { key: 'newReleases', href: '/' },
                { key: 'bestSellers', href: '/' },
                { key: 'giftCards', href: '/' },
                { key: 'techGuide', href: '/' }
              ].map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-label-muted text-sm font-medium hover:text-primary transition-colors flex items-center gap-2 group">
                    <span className="h-1 w-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {t(`links.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-space-grotesk text-foreground text-xs font-bold uppercase tracking-wider mb-6">{t('sections.support')}</h4>
            <ul className="space-y-3">
              {[
                { key: 'shippingInfo', href: '/' },
                { key: 'returns', href: '/' },
                { key: 'orderTracking', href: '/' },
                { key: 'helpCenter', href: '/' }
              ].map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-label-muted text-sm font-medium hover:text-primary transition-colors flex items-center gap-2 group">
                    <span className="h-1 w-1 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {t(`links.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h4 className="font-space-grotesk text-foreground text-xs font-bold uppercase tracking-wider mb-6">{t('sections.newsletter')}</h4>
            <p className="text-label-muted text-sm leading-relaxed max-w-xs">{t('newsletter.text')}</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-label-muted text-xs text-center md:text-left">
            {t('copyright', { year: 2026 })}
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            {[
              { key: 'privacy', href: '/' },
              { key: 'terms', href: '/' },
              { key: 'cookieSettings', href: '/' }
            ].map((item) => (
              <Link key={item.key} href={item.href} className="text-label-muted text-xs font-medium hover:text-foreground transition-colors">{t(`links.${item.key}`)}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}