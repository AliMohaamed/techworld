import { Link } from "@/navigation";
import { Instagram, Facebook } from "lucide-react";
import { getTranslations } from "next-intl/server";

function TikTokIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export default async function Footer() {
  const t = await getTranslations('Footer');

  const socialLinks = [
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@techworld.1?_t=ZS-8yJQZYbTHOB&_r=1",
      icon: TikTokIcon,
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/tech_world012?igsh=N2hiZGV1d2pxdDR5",
      icon: Instagram,
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/share/1YedGVnzFA/?mibextid=wwXIfr",
      icon: Facebook,
    },
  ];

  return (
    <footer className="border-t border-border bg-background pt-20 pb-10 px-4 sm:px-6 md:px-12">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mb-16">
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
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    className="h-10 w-10 rounded-lg border border-border bg-secondary flex items-center justify-center text-label-muted hover:text-primary hover:border-primary/30 hover:scale-105 transition-all"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
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
                { key: 'shippingInfo', href: '/shipping' },
                { key: 'returns', href: '/returns' },
                { key: 'orderTracking', href: '/track' },
                { key: 'helpCenter', href: '/support' }
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