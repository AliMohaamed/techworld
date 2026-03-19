"use client";

import CheckoutForm from "@/components/storefront/checkout-form";
import { useQuery } from "convex/react";
import { useSession } from "@/providers/session-provider";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { api } from "../../../../convex/_generated/api";

export default function CheckoutPage() {
  const { sessionId } = useSession();
  const cart = useQuery(api.cart.getCart, { sessionId });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-6 text-center">
        <div className="rounded-full bg-zinc-900/50 p-6">
          <ShoppingBag size={48} className="text-zinc-700" />
        </div>
        <h1 className="font-space-grotesk text-2xl font-bold text-white uppercase tracking-tight">Your Cart is Empty</h1>
        <Link href="/" className="font-space-grotesk text-sm font-black uppercase tracking-widest text-[#ffc105] hover:underline">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-8 px-4 md:px-8">
      <div className="container mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
          <ChevronLeft size={16} />
          Back to Shopping
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Order Summary */}
          <div className="space-y-8 order-2 lg:order-1">
            <h2 className="font-space-grotesk text-3xl font-extrabold tracking-tighter text-white uppercase">
              Checkout <span className="text-[#ffc105]">Review</span>
            </h2>

            <div className="space-y-4">
              {cart.items.map((item: any) => (
                <div key={item.productId} className="flex gap-4 rounded-xl border border-white/5 bg-zinc-900/10 p-4">
                  <div className="relative aspect-square h-16 w-16 overflow-hidden rounded-lg bg-zinc-950">
                    {item.product?.images?.[0] ? (
                      <Image
                        src={item.product?.images[0]}
                        alt={item.product?.name_en || "Product"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-800">No Image</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <p className="font-space-grotesk text-sm font-medium text-white line-clamp-1">{item.product?.name_en}</p>
                    <div className="mt-1 flex justify-between">
                      <span className="text-xs text-zinc-500">{item.quantity} x {item.product?.selling_price.toLocaleString()} EGP</span>
                      <span className="text-xs font-bold text-[#ffc105]">{(item.quantity * item.product?.selling_price!).toLocaleString()} EGP</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-white/5 pt-6">
              <div className="flex justify-between text-xs uppercase tracking-widest text-zinc-500">
                <span>Items Subtotal</span>
                <span className="text-zinc-300">{(cart?.total || 0).toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-xs uppercase tracking-widest text-zinc-500">
                <span>Shipping</span>
                <span className="text-green-500">CALCULATED ON DELIVERY</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="order-1 lg:order-2">
            <CheckoutForm />
          </div>
        </div>
      </div>
    </div>
  );
}
