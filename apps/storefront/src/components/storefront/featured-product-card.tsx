"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ArrowRight, ShoppingCart, Zap } from "lucide-react";

interface FeaturedProductCardProps {
  product: {
    _id: Id<"products">;
    name_ar: string;
    name_en: string;
    selling_price: number;
    compareAtPrice?: number;
    display_stock?: number;
    images: string[];
    description_en?: string;
    slug?: string;
    skus?: Array<{
      _id: Id<"skus">;
      price: number;
      display_stock: number;
      isDefault?: boolean;
    }>;
  };
}

export default function FeaturedProductCard({ product }: FeaturedProductCardProps) {
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);

  // Resolve default SKU for stock and cart purposes
  const defaultSku = product.skus?.find((s) => s.isDefault) ?? product.skus?.[0];
  const hasSalePrice = product.compareAtPrice !== undefined && product.compareAtPrice > product.selling_price;

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!defaultSku) return;
    try {
      await addToCart({
        sessionId,
        productId: product._id,
        skuId: defaultSku._id,
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
      className="group relative block h-[500px] w-full overflow-hidden rounded-[32px] border border-white/5 bg-zinc-900/40 transition-all hover:border-[#ffc105]/20"
    >
      <div className="absolute inset-0 z-0">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name_en}
            fill
            className="object-cover opacity-60 transition-transform duration-700 group-hover:rotate-1 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-zinc-950" />
        )}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="absolute inset-0 z-20 flex flex-col items-start justify-end space-y-4 p-8">
        <div className="flex items-center space-x-2 rounded-full bg-[#ffc105] px-3 py-1 scale-90 origin-left">
          <Zap size={12} className="fill-black text-black" />
          <span className="text-[10px] font-black uppercase tracking-widest text-black">Featured Drop</span>
        </div>

        <div className="space-y-1">
          <h3 className="font-space-grotesk text-2xl font-black uppercase tracking-tighter leading-none text-white lg:text-3xl">
            {product.name_en}
          </h3>
          <p className="font-arabic text-sm text-zinc-400">{product.name_ar}</p>
        </div>

        <p className="max-w-sm line-clamp-2 text-sm text-zinc-400">
          {product.description_en || "Premium quality, limited edition performance gear."}
        </p>

        <div className="w-full border-t border-white/10 pt-4 flex items-center justify-between">
          <div>
            {hasSalePrice ? (
              <s className="mb-1 block font-space-grotesk text-sm font-bold text-zinc-500">
                {product.compareAtPrice?.toLocaleString()} EGP
              </s>
            ) : null}
            <span className="font-space-grotesk text-2xl font-black text-[#ffc105]">
              {product.selling_price.toLocaleString()} EGP
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white transition-all group-hover:bg-white/20">
              <ArrowRight size={20} />
            </div>
            <button
              onClick={handleAddToCart}
              className="flex h-12 items-center justify-center space-x-2 rounded-2xl bg-[#ffc105] px-6 font-space-grotesk text-xs font-black uppercase tracking-widest text-black transition-colors hover:bg-[#e6ae00]"
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
