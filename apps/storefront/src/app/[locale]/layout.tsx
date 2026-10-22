import type { Metadata } from "next";
import { Cairo, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider, Toaster } from "@techworld/ui";
import { MetaPixel } from "@/components/storefront/meta-pixel";
import { SITE_URL } from "@/lib/seo";
import "../globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

// The code Meta Business Settings > Brand safety > Domains gives for the meta-tag method.
const FB_DOMAIN_VERIFICATION = process.env.NEXT_PUBLIC_FB_DOMAIN_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tech World",
  description: "Unified E-Commerce & Operations Engine",
  ...(FB_DOMAIN_VERIFICATION && {
    other: { "facebook-domain-verification": FB_DOMAIN_VERIFICATION },
  }),
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      {/* Browser extensions inject attributes into <body> before hydration; ignore those diffs. */}
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${cairo.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
        <MetaPixel />
      </body>
    </html>
  );
}
