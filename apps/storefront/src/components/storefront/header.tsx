"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { Heart, ShoppingBag, Menu, X, ChevronRight, ChevronDown } from "lucide-react";
import { useFavorites } from "@/lib/use-favorites";
import { Link } from "@/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@techworld/ui";
import { LanguageSwitcher, ThemeToggle } from "@techworld/ui";

const CartDrawer = dynamic(() => import("./cart-drawer"), { ssr: false });

export default function Header() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const { sessionId } = useSession();
  const { toggleCart } = useCart();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const { count: favoritesCount } = useFavorites();
  // Only subscribe to categories while the mobile menu is open.
  const categoriesResult = useQuery(
    api.categories.listActiveCategories,
    isMobileMenuOpen ? {} : "skip",
  );
  const categories = categoriesResult?.categories;

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsCategoriesOpen(false);
  };

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

            <Link
              href="/favorites"
              aria-label={t("favoritesAria")}
              className="group relative h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl bg-secondary border border-border text-foreground transition-all hover:bg-accent hover:border-primary/30"
            >
              <Heart
                size={20}
                className="group-hover:scale-105 transition-transform"
              />
              {favoritesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-destructive text-[10px] font-bold text-white">
                  {favoritesCount}
                </span>
              )}
            </Link>

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
              onClick={() => (isMobileMenuOpen ? closeMobileMenu() : setIsMobileMenuOpen(true))}
              className="lg:hidden h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center text-label-muted hover:text-foreground rounded-xl bg-secondary border border-border transition-all"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <nav className="lg:hidden absolute left-0 top-16 sm:top-20 w-full bg-background/98 backdrop-blur-xl border-t border-border animate-in slide-in-from-top-2 duration-300 z-[60]">
            <div className="px-4 sm:px-6 pt-6 pb-5 space-y-1">
              {navItems.map((item) =>
                item.key === "categories" ? (
                  <div key={item.key} className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => setIsCategoriesOpen((open) => !open)}
                      aria-expanded={isCategoriesOpen}
                      aria-controls="mobile-categories"
                      className="flex w-full items-center justify-between py-4 text-base font-medium text-foreground/80 hover:text-foreground transition-colors group"
                    >
                      <span className={cn("group-hover:text-primary transition-colors", isCategoriesOpen && "text-primary")}>
                        {t(`nav.${item.key}`)}
                      </span>
                      <ChevronDown
                        size={18}
                        className={cn("text-primary/70 transition-transform duration-200", isCategoriesOpen && "rotate-180")}
                      />
                    </button>

                    {isCategoriesOpen && (
                      <div
                        id="mobile-categories"
                        className="pb-3 max-h-[45vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200"
                      >
                        {categories === undefined ? (
                          <div className="space-y-2 ltr:pl-3 rtl:pr-3">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="h-9 rounded-lg bg-secondary animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <ul className="space-y-0.5">
                            {categories.map((category) => (
                              <li key={category._id}>
                                <Link
                                  href={`/categories/${category.slug || category._id}`}
                                  onClick={closeMobileMenu}
                                  className="flex items-center rounded-lg py-2.5 ltr:pl-3 rtl:pr-3 text-sm text-label-muted hover:bg-secondary hover:text-foreground transition-colors"
                                >
                                  {locale === "en" ? category.name_en : category.name_ar}
                                </Link>
                              </li>
                            ))}
                            <li>
                              <Link
                                href={item.href}
                                onClick={closeMobileMenu}
                                className="flex items-center gap-1 rounded-lg py-2.5 ltr:pl-3 rtl:pr-3 text-sm font-semibold text-primary hover:bg-secondary transition-colors"
                              >
                                {t("nav.viewAllCategories")}
                                <ChevronRight size={16} className="rtl:rotate-180" />
                              </Link>
                            </li>
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileMenu}
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
                ),
              )}
            </div>

            <div className="px-4 sm:px-6 pb-3 flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <div className="px-4 sm:px-6 pb-6 pt-2">
              <Link
                href="/products"
                onClick={closeMobileMenu}
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