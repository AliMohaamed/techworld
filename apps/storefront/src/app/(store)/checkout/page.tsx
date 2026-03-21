"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useSession } from "@/providers/session-provider";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import CheckoutForm from "@/components/storefront/checkout-form";

export default function CheckoutPage() {
  const { sessionId } = useSession();
  const [appliedPromo, setAppliedPromo] = useState<string | undefined>(undefined);
  const cart = useQuery(api.cart.getCart, { sessionId, promoCode: appliedPromo });
  const governorates = useQuery(api.governorates.listActiveGovernorates);
  const governoratesLoading = governorates === undefined;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center space-y-6 text-center">
        <div className="rounded-full bg-zinc-900/50 p-6">
          <ShoppingBag size={48} className="text-zinc-700" />
        </div>
        <h1 className="font-space-grotesk text-2xl font-bold uppercase tracking-tight text-white">Your Cart is Empty</h1>
        <Link href="/" className="font-space-grotesk text-sm font-black uppercase tracking-widest text-[#ffc105] hover:underline">
          Back to Store
        </Link>
      </div>
    );
  }

  const itemsSubtotal = cart.subtotal || 0;
  const promoDiscount = cart.promoDiscount || 0;
  const grandTotal = cart.total || 0;
  const hasGovernorates = Boolean(governorates && governorates.length > 0);

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-8 md:px-8">
      <div className="container mx-auto max-w-5xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white">
          <ChevronLeft size={16} />
          Back to Shopping
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div className="order-2 space-y-8 lg:order-1">
            <h2 className="font-space-grotesk text-3xl font-extrabold uppercase tracking-tighter text-white">
              Checkout <span className="text-[#ffc105]">Review</span>
            </h2>

            <div className="space-y-4">
              {cart.items.map((item) => {
                const unitPrice = item.sku?.price ?? item.product?.selling_price ?? 0;
                const lineTotal = item.quantity * unitPrice;
                return (
                  <div key={`${item.productId}-${item.skuId}`} className="flex gap-4 rounded-xl border border-white/5 bg-zinc-900/10 p-4">
                    <div className="relative aspect-square h-16 w-16 overflow-hidden rounded-lg bg-zinc-950">
                      {item.product?.images?.[0] ? (
                        <Image
                          src={item.product.images[0]}
                          alt={item.product?.name_en || "Product"}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-800">No Image</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-center">
                      <p className="line-clamp-1 font-space-grotesk text-sm font-medium text-white">{item.product?.name_en}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                        {item.sku?.variantName || "Default variant"}
                      </p>
                      <div className="mt-1 flex justify-between">
                        <span className="text-xs text-zinc-500">
                          {item.quantity} x {unitPrice.toLocaleString()} EGP
                        </span>
                        <span className="text-xs font-bold text-[#ffc105]">{lineTotal.toLocaleString()} EGP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-white/5 pt-6">
              <div className="flex justify-between text-xs uppercase tracking-widest text-zinc-500">
                <span>Items Subtotal</span>
                <span className="text-zinc-300">{itemsSubtotal.toLocaleString()} EGP</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-xs uppercase tracking-widest text-emerald-400">
                  <span>Promo Discount</span>
                  <span>-{promoDiscount.toLocaleString()} EGP</span>
                </div>
              )}
              <div className="flex justify-between text-xs uppercase tracking-widest text-zinc-500">
                <span>Shipping</span>
                <span className="text-zinc-300">
                  {governoratesLoading ? "Loading..." : hasGovernorates ? "Select governorate" : "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <CheckoutForm 
              cartTotal={itemsSubtotal} 
              promoDiscount={promoDiscount}
              promoError={cart.promoError}
              appliedPromo={appliedPromo}
              onApplyPromo={(code) => setAppliedPromo(code)}
              onRemovePromo={() => setAppliedPromo(undefined)}
              governorates={governorates ?? []} 
              governoratesLoading={governoratesLoading} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

