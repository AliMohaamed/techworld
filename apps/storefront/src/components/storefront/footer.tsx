import { Link } from "@/navigation";
import { Github, Twitter, Instagram } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { NewsletterForm } from "./NewsletterForm";

export default async function Footer() {
  const t = await getTranslations('Footer');
  const locale = await getLocale();

  return (
    <footer className="border-t border-border bg-background pt-24 pb-12 px-6 md:px-12">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
          {/* Brand Info */}
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-2 outline-none group w-fit">
              <div className="h-4 w-4 rounded-[4px] bg-[#ffc105] group-hover:rotate-45 transition-transform" />
              <span className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground uppercase">
                TECH<span className="text-[#ffc105]">WORLD</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-xs ">
              {t('tagline')}
            </p>
            <div className="flex items-center gap-4 pt-4">
              <Link href="#" className="h-11 w-11 rounded-2xl border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-[#ffc105] hover:border-[#ffc105]/20 hover:scale-110 transition-all">
                <Github size={20} />
              </Link>
              <Link href="#" className="h-11 w-11 rounded-2xl border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-[#ffc105] hover:border-[#ffc105]/20 hover:scale-110 transition-all">
                <Twitter size={20} />
              </Link>
              <Link href="#" className="h-11 w-11 rounded-2xl border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-[#ffc105] hover:border-[#ffc105]/20 hover:scale-110 transition-all">
                <Instagram size={20} />
              </Link>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-space-grotesk text-foreground text-xs font-bold uppercase tracking-wider mb-10 ">{t('sections.explore')}</h4>
            <ul className="space-y-4">
              {[
                { key: 'newReleases', href: '#' },
                { key: 'bestSellers', href: '#' },
                { key: 'giftCards', href: '#' },
                { key: 'techGuide', href: '#' }
              ].map((item) => (
                <li key={item.key}>
                  <Link href={item.href as any} className="text-muted-foreground text-[15px] font-medium hover:text-[#ffc105] transition-all flex items-center gap-2 group">
                    <span className="h-1 w-1 bg-[#ffc105] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {t(`links.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-space-grotesk text-foreground text-xs font-bold uppercase tracking-wider mb-10 ">{t('sections.support')}</h4>
            <ul className="space-y-4">
              {[
                { key: 'shippingInfo', href: '#' },
                { key: 'returns', href: '#' },
                { key: 'orderTracking', href: '#' },
                { key: 'helpCenter', href: '#' }
              ].map((item) => (
                <li key={item.key}>
                  <Link href={item.href as any} className="text-muted-foreground text-[15px] font-medium hover:text-[#ffc105] transition-all flex items-center gap-2 group">
                    <span className="h-1 w-1 bg-[#ffc105] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {t(`links.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-8">
            <h4 className="font-space-grotesk text-foreground text-xs font-bold uppercase tracking-wider mb-10 ">{t('sections.newsletter')}</h4>
            <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-xs">{t('newsletter.text')}</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-10">
          <p className="text-muted-foreground text-xs font-medium text-center md:text-left ">
            {t('copyright', { year: 2026 })}
          </p>
          <div className="flex items-center gap-8 flex-wrap justify-center">
            {[
              { key: 'privacy', href: '#' },
              { key: 'terms', href: '#' },
              { key: 'cookieSettings', href: '#' }
            ].map((item) => (
              <Link key={item.key} href={item.href as any} className="text-muted-foreground text-xs font-medium hover:text-foreground transition-all opacity-70 hover:opacity-100">{t(`links.${item.key}`)}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
