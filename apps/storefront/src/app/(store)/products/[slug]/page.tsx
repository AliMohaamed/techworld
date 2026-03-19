"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import Image from "next/image";
import { ChevronRight, ShoppingBag, Truck, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);
  const product = useQuery(api.products.getBySlug, slug ? { slug: slug as string } : "skip");

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addToCart({
        sessionId,
        productId: product._id,
        quantity: 1
      });
      openCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
  };

  if (product === undefined) {
    return (
      <div className="container mx-auto p-4 md:p-8 animate-pulse">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-zinc-900" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 bg-zinc-900 rounded" />
            <div className="h-6 w-1/4 bg-zinc-900 rounded" />
            <div className="h-24 w-full bg-zinc-900 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-white">Product Not Found</h1>
        <p className="mt-2 text-zinc-500">The product you are looking for does not exist or has been removed.</p>
        <Link href="/" className="mt-6 font-space-grotesk text-sm font-bold uppercase text-[#ffc105]">
          Back to Store
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.display_stock <= 0;
  const isUnavailable = !product.isCategoryActive;

  return (
    <div className="min-h-screen bg-black pb-20">
      <nav className="container mx-auto p-4 text-xs font-medium text-zinc-500">
        <div className="flex items-center space-x-2">
          <Link href="/" className="hover:text-white transition-colors">STORE</Link>
          <ChevronRight size={12} />
          <Link href={`/categories/${product.categorySlug || product.categoryId}`} className="hover:text-white transition-colors truncate uppercase">{product.categoryName_en || "CATEGORY"}</Link>
          <ChevronRight size={12} />
          <span className="text-white truncate uppercase">{product.name_en}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Image Gallery */}
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-zinc-950">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name_en}
                fill
                className="object-contain p-4"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-800">No Image</div>
            )}
            
            {(isOutOfStock || isUnavailable) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-md">
                <span className="rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white uppercase tracking-widest">
                  {isUnavailable ? "Currently Unavailable" : "Sold Out"}
                </span>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <header className="mb-6 space-y-2">
              <h1 className="font-space-grotesk text-3xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
                {product.name_en}
              </h1>
              <p className="text-right font-arabic text-xl leading-relaxed text-zinc-400">
                {product.name_ar}
              </p>
            </header>

            <div className="mb-8 flex items-baseline space-x-4">
              <span className="font-space-grotesk text-4xl font-bold tracking-tighter text-[#ffc105]">
                {product.selling_price.toLocaleString()} EGP
              </span>
              <span className={`font-space-grotesk text-sm font-bold uppercase ${isOutOfStock ? 'text-red-500' : 'text-zinc-500'}`}>
                {product.display_stock} units left
              </span>
            </div>

            <div className="mb-10 space-y-4">
              <p className="text-sm leading-relaxed text-zinc-400">
                {product.description_en}
              </p>
              <p className="border-t border-white/5 pt-4 text-right font-arabic text-md leading-relaxed text-zinc-500">
                {product.description_ar}
              </p>
            </div>

            <div className="mt-auto space-y-6">
              <button 
                disabled={isOutOfStock || isUnavailable}
                onClick={handleAddToCart}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#ffc105] py-5 font-space-grotesk text-lg font-bold uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10 transition-transform group-hover:translate-x-full" />
                <ShoppingBag size={20} />
                Add To Cart
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                  <Truck size={18} className="text-[#ffc105]" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">Fast Shipping Anywhere in Egypt</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                  <ShieldCheck size={18} className="text-[#ffc105]" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">Secure COD Verification</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-2 rounded-lg bg-zinc-900/30 py-2 border border-zinc-900">
              <Zap size={10} className="fill-[#ffc105] text-[#ffc105]" />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Authentic Tech Inventory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





