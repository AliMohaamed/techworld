import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { SessionProvider } from "@/providers/session-provider";
import { CartProvider } from "@/providers/cart-provider";
import { ReactNode } from "react";
import Header from "@/components/storefront/header";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <ConvexClientProvider>
      <SessionProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
        </CartProvider>
      </SessionProvider>
    </ConvexClientProvider>
  );
}
