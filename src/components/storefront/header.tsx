"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import CartDrawer from "./cart-drawer";

export default function Header() {
  const { sessionId } = useSession();
  const { toggleCart } = useCart();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const categories = useQuery(api.categories.listActiveCategories);
  
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
          <div className="flex">
            <Link 
              href="/" 
              className="group flex items-center space-x-1 outline-none"
            >
              <div className="h-4 w-4 rounded-sm bg-[#ffc105] transition-transform group-hover:rotate-45" />
              <span className="font-space-grotesk text-2xl font-black tracking-tighter text-white uppercase sm:text-3xl">
                TECH<span className="text-[#ffc105]">WORLD</span>
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            <nav className="hidden items-center space-x-8 md:flex">
              {categories?.map((category) => (
                <Link 
                  key={category._id}
                  href={`/categories/${category.slug}`} 
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-[#ffc105] transition-all"
                >
                  {category.name_en}
                </Link>
              ))}
            </nav>

            <button 
              onClick={toggleCart}
              className="group relative flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-zinc-900/50 text-white transition-all hover:bg-zinc-900 hover:border-[#ffc105]/50"
            >
              <ShoppingBag size={20} className="transition-transform group-hover:scale-110" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#ffc105] px-1 font-space-grotesk text-[10px] font-black leading-none text-black ring-4 ring-black">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
