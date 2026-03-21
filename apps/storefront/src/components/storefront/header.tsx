"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingBag, Menu, X, ChevronRight } from "lucide-react";
import { Link } from "@/navigation";
import CartDrawer from "./cart-drawer";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LanguageSwitcher, ThemeToggle } from "@techworld/ui";

export default function Header() {
  const t = useTranslations('Header');
  const locale = useLocale();
  const { sessionId } = useSession();
  const { toggleCart } = useCart();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const navItems = [
    { key: 'shop', href: '/' },
    { key: 'categories', href: '/categories' },
    { key: 'deals', href: '/deals' },
    { key: 'support', href: '/support' }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl transition-all h-24">
        <div className="container mx-auto flex h-full items-center justify-between px-6 md:px-12">
          {/* Logo */}
          <div className="flex">
            <Link
              href="/"
              className="group flex items-center gap-3 min-h-[44px] outline-none"
            >
              <div className="h-6 w-6 rounded-md bg-[#ffc105] shadow-[0_0_15px_rgba(255,193,5,0.4)] transition-all group-hover:rotate-12 group-hover:scale-110" />
              <span className="font-space-grotesk text-2xl font-black tracking-tightest text-foreground uppercase sm:text-3xl">
                TECH<span className="text-[#ffc105]">WORLD</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center ltr:space-x-12 rtl:space-x-reverse space-x-12 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group relative text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground transition-all min-h-[44px] flex items-center"
              >
                {t(`nav.${item.key}`)}
                <span className="absolute bottom-2 left-0 w-0 h-[2px] bg-[#ffc105] transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <button
              onClick={toggleCart}
              aria-label={t('cartAria')}
              className="group relative h-12 w-12 flex items-center justify-center rounded-2xl bg-secondary border border-border text-foreground transition-all hover:bg-accent hover:border-[#ffc105]/30 shadow-xl"
            >
              <ShoppingBag size={22} className="group-hover:scale-110 transition-transform" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-[#ffc105] text-[10px] font-black text-black ring-4 ring-background shadow-lg">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-2xl bg-secondary border border-border transition-all shadow-xl"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden fixed inset-x-0 top-24 bottom-0 bg-background/98 backdrop-blur-3xl border-t border-border p-8 flex flex-col space-y-4 shadow-2xl z-[60] animate-in slide-in-from-top-4 duration-300">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className=" text-2xl font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-[#ffc105] transition-all py-6 border-b border-border flex items-center justify-between group"
              >
                <span className="group-hover:translate-x-4 transition-transform ltr:group-hover:translate-x-4 rtl:group-hover:-translate-x-4">
                  {t(`nav.${item.key}`)}
                </span>
                <ChevronRight size={24} className={locale === 'ar' ? 'rotate-180' : ''} />
              </Link>
            ))}

            {/* Theme & Language switchers at the bottom of mobile menu */}
            <div className="pt-8 mt-auto flex flex-col gap-4">
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
              <LanguageSwitcher className="w-full justify-center py-5 text-base" />
            </div>
          </nav>
        )}
      </header>
      <CartDrawer />
    </>
  );
}
