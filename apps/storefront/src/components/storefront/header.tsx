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
  const t = useTranslations("Header");
  const locale = useLocale();
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
      <header className="sticky top-0 z-50 w-full border-b border-border bg-secondary/30 backdrop-blur-xl transition-all h-20">
        <div className="container mx-auto flex h-full items-center justify-between px-6 md:px-12">
          {/* Logo */}
          <div className="flex">
            <Link
              href="/"
              className="group flex items-center gap-3 min-h-[44px] outline-none"
            >
              <div className="h-6 w-6 rounded-md bg-[#ffc105] shadow-[0_0_15px_rgba(255,193,5,0.4)] transition-all group-hover:rotate-12 group-hover:scale-110" />
              <span className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground uppercase sm:text-3xl">
                TECH<span className="text-[#ffc105]">WORLD</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center ltr:space-x-8 rtl:space-x-reverse space-x-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group relative text-base font-medium text-muted-foreground hover:text-foreground transition-all min-h-[44px] flex items-center"
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
              aria-label={t("cartAria")}
              className="group relative h-12 w-12 flex items-center justify-center rounded-2xl bg-secondary border border-border text-foreground transition-all hover:bg-accent hover:border-[#ffc105]/30 "
            >
              <ShoppingBag
                size={22}
                className="group-hover:scale-110 transition-transform"
              />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-[#ffc105] text-[10px] font-black text-black ring-4 ring-background  ">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden h-12 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-2xl bg-secondary border border-border transition-all "
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden absolute left-0 top-24 w-full min-h-[calc(100vh-96px)] bg-black/95 backdrop-blur-xl border-t border-white/5 p-8 flex flex-col shadow-2xl z-[60] animate-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-medium text-white/80 hover:text-[#ffc105] transition-all py-5 border-b border-white/5 flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-2 transition-transform ltr:group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                    {t(`nav.${item.key}`)}
                  </span>
                  <ChevronRight
                    size={20}
                    className={locale === "ar" ? "rotate-180 text-[#ffc105]" : "text-[#ffc105]"}
                  />
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex-1">                <div className="flex items-center gap-3 text-white">
                <ThemeToggle />
                {/* <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t("theme") || "Mode"}</span> */}
              </div>
              </div>
              <div className="flex-1 flex flex-col items-end">                 
                <div className="flex items-center gap-3 ">
                {/* <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t("language") || "Language"}</span> */}
                <LanguageSwitcher />
              </div>
              </div>
            </div>

            <div className="pt-8 mt-auto">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center w-full py-4 rounded-2xl bg-[#ffc105] text-black text-lg font-semibold shadow-[0_0_30px_rgba(255,193,5,0.15)] active:scale-95 transition-all"
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
