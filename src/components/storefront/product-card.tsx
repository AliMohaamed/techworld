"use client";

import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: {
    _id: string;
    name_ar: string;
    name_en: string;
    selling_price: number;
    display_stock: number;
    images: string[];
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);
  const isOutOfStock = product.display_stock <= 0;

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
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#121212] transition-all hover:border-[#ffc105]/30">
      <Link href={`/products/${product._id}`} className="relative aspect-square overflow-hidden">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name_en}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">
            No Image
          </div>
        )}
        
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-widest">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <Link href={`/products/${product._id}`} className="block">
            <h3 className="line-clamp-1 font-space-grotesk text-sm font-medium text-white transition-colors group-hover:text-[#ffc105]">
              {product.name_en}
            </h3>
            <p className="line-clamp-1 text-right font-arabic text-xs text-zinc-400">
              {product.name_ar}
            </p>
          </Link>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div className="flex flex-col">
            <span className="font-space-grotesk text-lg font-bold text-[#ffc105]">
              {product.selling_price.toLocaleString()} EGP
            </span>
            <span className={`text-[10px] font-medium uppercase tracking-tighter ${product.display_stock < 5 ? 'text-red-400' : 'text-zinc-500'}`}>
              {product.display_stock} units left
            </span>
          </div>
          
          <button 
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-white transition-colors hover:bg-[#ffc105] hover:text-black disabled:opacity-20 disabled:hover:bg-zinc-800 disabled:hover:text-white"
          >
            <ShoppingCart size={18} />
            {/* <span className="sr-only">Add to Cart</span> */}
          </button>
        </div>
      </div>
    </div>
  );
}
