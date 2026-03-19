"use client";

import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingCart, Star, StarHalf } from "lucide-react";

interface ProductCardProps {
  product: {
    _id: string;
    name_ar: string;
    name_en: string;
    description_en?: string;
    selling_price: number;
    display_stock: number;
    images: string[];
    slug?: string;
    categoryName?: string;
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
    <Link 
      href={`/products/${product.slug || product._id}`} 
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-[#1c1c1e] transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50"
    >
      {/* Top section: Full-width Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-zinc-900 border-b border-white/5">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name_en}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
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
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-5">
        
        {/* Category Label */}
        <span className="mb-2 text-xs font-bold tracking-widest text-[#ffc105] uppercase">
          {product.categoryName || "PROJECTORS"}
        </span>

        {/* Product Name (English & Arabic) */}
        <h3 className="mb-2 line-clamp-2 font-space-grotesk text-[1.35rem] font-bold leading-tight text-white">
          {product.name_en} <span className="font-arabic font-normal text-zinc-400">| {product.name_ar}</span>
        </h3>

        {/* Brief Product Description */}
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-300">
          {product.description_en || "Experience premium quality with this top-of-the-line product, designed to provide exceptional performance."}
        </p>

        {/* Star Rating */}
        {/* <div className="mb-6 flex items-center gap-1.5 mt-auto">
          <div className="flex">
            <Star className="h-[16px] w-[16px] fill-[#ff6b00] text-[#ff6b00]" />
            <Star className="h-[16px] w-[16px] fill-[#ff6b00] text-[#ff6b00]" />
            <Star className="h-[16px] w-[16px] fill-[#ff6b00] text-[#ff6b00]" />
            <Star className="h-[16px] w-[16px] fill-[#ff6b00] text-[#ff6b00]" />
            <StarHalf className="h-[16px] w-[16px] fill-[#ff6b00] text-[#ff6b00]" />
          </div>
          <span className="ml-1 text-sm font-bold text-[#ff6b00]">4.8</span>
        </div> */}

        {/* Bottom Section (Price & Add to Cart) */}
        <div className="mt-1 flex items-center gap-4">
          <div className="flex flex-col shrink-0">
            <span className="font-space-grotesk text-[1.5rem] font-bold tracking-tight text-[#ffc105]">
              {product.selling_price.toLocaleString()} <span className="text-lg">EGP</span>
            </span>
          </div>
          
          <button 
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-xl bg-[#ffc105] px-4 font-bold text-black transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <ShoppingCart size={20} className="fill-black/10 shrink-0" />
            <span className="whitespace-nowrap">Add to Cart</span>
          </button>
        </div>
      </div>
    </Link>
  );
}




