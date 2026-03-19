"use client";

import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ArrowRight, ShoppingCart, Zap } from "lucide-react";

interface FeaturedProductCardProps {
  product: {
    _id: string;
    name_ar: string;
    name_en: string;
    selling_price: number;
    display_stock: number;
    images: string[];
    description_en?: string;
  };
}

export default function FeaturedProductCard({ product }: FeaturedProductCardProps) {
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);
  
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addToCart({
        sessionId,
        productId: product._id as any,
        quantity: 1
      });
      openCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
  };

  return (
    <Link href={`/products/${product._id}`} className="block group relative w-full h-[500px] overflow-hidden rounded-[32px] bg-zinc-900/40 border border-white/5 transition-all hover:border-[#ffc105]/20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name_en}
            fill
            className="object-cover opacity-60 transition-transform duration-700 group-hover:scale-105 group-hover:rotate-1"
          />
        ) : (
          <div className="w-full h-full bg-zinc-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 z-20 p-8 flex flex-col justify-end items-start space-y-4">
        <div className="flex items-center space-x-2 bg-[#ffc105] rounded-full px-3 py-1 scale-90 origin-left">
          <Zap size={12} className="text-black fill-black" />
          <span className="text-[10px] font-black text-black uppercase tracking-widest">Featured Drop</span>
        </div>

        <div className="space-y-1">
          <h3 className="font-space-grotesk text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter leading-none">
            {product.name_en}
          </h3>
          <p className="font-arabic text-zinc-400 text-sm">
            {product.name_ar}
          </p>
        </div>

        <p className="text-zinc-400 text-sm line-clamp-2 max-w-sm">
          {product.description_en || "Premium quality, limited edition performance gear."}
        </p>

        <div className="w-full pt-4 flex items-center justify-between border-t border-white/10">
          <span className="font-space-grotesk text-2xl font-black text-[#ffc105]">
            {product.selling_price.toLocaleString()} EGP
          </span>
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-all">
              <ArrowRight size={20} />
            </div>
            <button 
              onClick={handleAddToCart}
              className="h-12 px-6 rounded-2xl bg-[#ffc105] text-black font-space-grotesk font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 hover:bg-[#e6ae00] transition-colors"
            >
              <ShoppingCart size={16} />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
