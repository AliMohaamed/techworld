"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingBag, Menu, X, ChevronRight } from "lucide-react";
import { Link } from "@/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher, ThemeToggle } from "@techworld/ui";

const CartDrawer = dynamic(() => import("./cart-drawer"), { ssr: false });

export default function Header() {
  const t = useTranslations("Header");
  const { sessionId } = useSession();
  const { toggleCart } = useCart();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const navItems = [
    { key: "shop", href: "/products" },
    { key: "categories", href: "/categories" },
    { key: "deals", href: "/deals" },
    { key: "support", href: "/support" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary/95 backdrop-blur-sm transition-all h-16 sm:h-20">
        <div className="container mx-auto flex h-full items-center justify-between px-4 sm:px-6 md:px-12">
          <div className="flex">
            <Link
              href="/"
              className="group flex items-center gap-2.5 min-h-[44px] outline-none"
            >
              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-sm bg-primary transition-transform group-hover:rotate-12 group-hover:scale-110" />
              <span className="font-space-grotesk text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
                TECH<span className="text-primary">WORLD</span>
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group relative text-sm font-medium text-label-muted hover:text-foreground transition-colors min-h-[44px] flex items-center"
              >
                {t(`nav.${item.key}`)}
                <span className="absolute bottom-1 left-0 w-0 h-[2px] bg-primary transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <button
              onClick={toggleCart}
              aria-label={t("cartAria")}
              className="group relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl bg-secondary border border-border text-foreground transition-all hover:bg-accent hover:border-primary/30"
            >
              <ShoppingBag
                size={20}
                className="group-hover:scale-105 transition-transform"
              />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center text-label-muted hover:text-foreground rounded-xl bg-secondary border border-border transition-all"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="lg:hidden absolute left-0 top-16 sm:top-20 w-full bg-background/98 backdrop-blur-xl border-t border-border animate-in slide-in-from-top-2 duration-300 z-[60]">
            <div className="px-4 sm:px-6 pt-6 pb-5 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-4 border-b border-border text-base font-medium text-foreground/80 hover:text-foreground transition-colors group"
                >
                  <span className="group-hover:text-primary transition-colors">
                    {t(`nav.${item.key}`)}
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-primary/70"
                  />
                </Link>
              ))}
            </div>

            <div className="px-4 sm:px-6 pb-3 flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <div className="px-4 sm:px-6 pb-6 pt-2">
              <Link
                href="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
              >
                {t("nav.shopNow")}
              </Link>
            </div>
          </nav>
        )}
      </header>
      <CartDrawer />
    </>
  );
}