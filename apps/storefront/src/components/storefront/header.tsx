"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import Link from "next/link";
import CartDrawer from "./cart-drawer";
import { useState } from "react";

export default function Header() {
  const { sessionId } = useSession();
  const { toggleCart } = useCart();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl transition-all">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
          {/* Logo */}
          <div className="flex">
            <Link 
              href="/" 
              className="group flex items-center space-x-2 min-h-[44px] outline-none"
            >
              <div className="h-5 w-5 rounded-sm bg-[#ffc105] transition-transform group-hover:rotate-45" />
              <span className="font-space-grotesk text-2xl font-black tracking-tighter text-white uppercase sm:text-3xl">
                TECH<span className="text-[#ffc105]">WORLD</span>
              </span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden items-center space-x-10 lg:flex">
            {["Shop", "Categories", "Deals", "Support"].map((item) => (
              <Link 
                key={item}
                href={item === "Shop" ? "/" : `/${item.toLowerCase()}`}
                className="group relative text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500 hover:text-white transition-colors min-h-[44px] flex items-center"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#ffc105] transition-all group-hover:w-full" />
              </Link>
            ))}
          </nav>
          
          {/* Actions */}
          <div className="flex items-center space-x-4">

            <button 
              onClick={toggleCart}
              className="group relative h-11 w-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-white/5 text-white transition-all hover:bg-zinc-800 hover:border-[#ffc105]/30 active:scale-95"
            >
              <ShoppingBag size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ffc105] text-[10px] font-black text-black ring-4 ring-black">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Trigger */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden h-11 w-11 flex items-center justify-center text-zinc-400 hover:text-white rounded-xl bg-white/5 transition-all"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden absolute top-20 left-0 w-full min-h-[calc(100vh-80px)] bg-black/95 backdrop-blur-xl border-t border-white/5 p-4 flex flex-col space-y-6 shadow-2xl z-50">
            {["Shop", "Categories", "Deals", "Support"].map((item) => (
              <Link 
                key={item}
                href={item === "Shop" ? "/" : `/${item.toLowerCase()}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-bold uppercase tracking-[0.25em] text-zinc-300 hover:text-[#ffc105] transition-colors py-4 border-b border-white/5 flex items-center min-h-[44px]"
              >
                {item}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <CartDrawer />
    </>
  );
}




