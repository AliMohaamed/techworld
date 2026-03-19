import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { SessionProvider } from "@/providers/session-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ReactNode } from "react";
import Header from "@/components/storefront/header";
import Footer from "@/components/storefront/footer";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <SessionProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </CartProvider>
      </SessionProvider>
    </ConvexClientProvider>
  );
}
