import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ThemeProvider, Toaster } from "@techworld/ui";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { AdminAuthShell } from "@/components/auth/admin-auth-shell";
import { getToken } from "@/lib/auth-server";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });
const cairo = Cairo({ subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "TechWorld Admin",
  description: "E-Commerce Management System",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [messages, initialToken] = await Promise.all([
    getMessages(),
    getToken()
  ]);
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const bodyFontClassName = locale === "ar" ? cairo.className : inter.className;

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <body className={`${bodyFontClassName} overflow-x-hidden`}>
        <ConvexClientProvider initialToken={initialToken}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <AdminAuthShell>
                {children}
              </AdminAuthShell>
              <Toaster />
            </NextIntlClientProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
