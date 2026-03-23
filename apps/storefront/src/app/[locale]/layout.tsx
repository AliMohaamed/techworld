import type { Metadata } from "next";
import { Cairo, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider, Toaster } from "@techworld/ui";
import "../globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});
const cairo = Cairo({ subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "TechWorld",
  description: "Unified E-Commerce & Operations Engine",
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
  const bodyFontClassName = locale === "ar" ? cairo.className : spaceGrotesk.variable;

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body
        className={`${bodyFontClassName} antialiased`}
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
      </body>
    </html>
  );
}
