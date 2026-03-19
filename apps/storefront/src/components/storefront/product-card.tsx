"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: {
    _id: Id<"products">;
    name_ar: string;
    name_en: string;
    description_en?: string;
    selling_price: number;
    compareAtPrice?: number;
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
  const hasSalePrice = product.compareAtPrice !== undefined && product.compareAtPrice > product.selling_price;

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await addToCart({
        sessionId,
        productId: product._id,
        quantity: 1,
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
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl border-b border-white/5 bg-zinc-900">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name_en}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-700">No Image</div>
        )}

        {hasSalePrice ? (
          <div className="absolute left-4 top-4 rounded-full bg-[#ffc105] px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-black">
            Sale
          </div>
        ) : null}

        {isOutOfStock ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
              Sold Out
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <span className="mb-2 text-xs font-bold uppercase tracking-widest text-[#ffc105]">
          {product.categoryName || "PROJECTORS"}
        </span>

        <h3 className="mb-2 line-clamp-2 font-space-grotesk text-[1.35rem] font-bold leading-tight text-white">
          {product.name_en} <span className="font-arabic font-normal text-zinc-400">| {product.name_ar}</span>
        </h3>

        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-300">
          {product.description_en || "Experience premium quality with this top-of-the-line product, designed to provide exceptional performance."}
        </p>

        <div className="mt-1 flex items-center gap-4">
          <div className="flex shrink-0 flex-col">
            {hasSalePrice ? (
              <s className="mb-1 font-space-grotesk text-sm font-bold tracking-tight text-zinc-500">
                {product.compareAtPrice?.toLocaleString()} EGP
              </s>
            ) : null}
            <span className="font-space-grotesk text-[1.5rem] font-bold tracking-tight text-[#ffc105]">
              {product.selling_price.toLocaleString()} <span className="text-lg">EGP</span>
            </span>
          </div>

          <button
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className="flex h-[3.25rem] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ffc105] px-4 font-bold text-black transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart size={20} className="shrink-0 fill-black/10" />
            <span className="whitespace-nowrap">Add to Cart</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
