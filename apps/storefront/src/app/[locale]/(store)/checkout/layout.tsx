import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page is a client component, so its metadata lives here.
type Props = { params: Promise<{ locale: string }>; children: React.ReactNode };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    ...pageMetadata({ locale, path: "/checkout" }),
    // Per-visitor page with nothing worth indexing.
    robots: { index: false, follow: true },
  };
}

export default function CheckoutLayout({ children }: Props) {
  return <>{children}</>;
}
