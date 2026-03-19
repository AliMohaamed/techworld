"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";

export default function CartDrawer() {
  const { sessionId } = useSession();
  const { isOpen, closeCart } = useCart();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const addToCart = useMutation(api.cart.addToCart);
  const removeFromCart = useMutation(api.cart.removeFromCart);

  if (!isOpen) return null;

  const handleUpdateQuantity = async (productId: Id<"products">, currentQty: number, delta: number) => {
    const newQty = Math.max(1, currentQty + delta);
    try {
      await addToCart({ sessionId, productId, quantity: newQty });
    } catch (e) {
      console.error("Cart update failed", e);
    }
  };

  const handleRemove = async (productId: Id<"products">) => {
    await removeFromCart({ sessionId, productId });
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={closeCart} 
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-white/5 bg-[#0a0a0a] shadow-2xl transition-transform duration-300 ease-in-out">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 p-6">
            <h2 className="font-space-grotesk text-xl font-bold tracking-tight text-white uppercase flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#ffc105]" />
              MY SHOPPING <span className="text-[#ffc105]">CART</span>
            </h2>
            <button 
              onClick={closeCart}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!cart || cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-zinc-900/50 p-6">
                  <ShoppingBag size={48} className="text-zinc-700" />
                </div>
                <div>
                  <p className="font-space-grotesk text-sm font-bold text-white uppercase">Your cart is empty</p>
                  <p className="text-xs text-zinc-500 max-w-[200px] mt-1 mx-auto">Looks like you haven't added any products yet.</p>
                </div>
                <button 
                  onClick={closeCart}
                  className="mt-4 font-space-grotesk text-xs font-bold text-[#ffc105] hover:underline uppercase tracking-widest"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.productId} className="flex gap-4">
                  <div className="relative aspect-square h-24 w-24 overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
                    {item.product?.images?.[0] ? (
                      <Image
                        src={item.product?.images[0]}
                        alt={item.product?.name_en || "Product"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-800">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between py-1">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <Link 
                          href={`/products/${item.product?.slug || item.productId}`}
                          onClick={closeCart}
                          className="font-space-grotesk text-sm font-medium text-white hover:text-[#ffc105] transition-colors line-clamp-1 truncate"
                        >
                          {item.product?.name_en}
                        </Link>
                        <button 
                          onClick={() => handleRemove(item.productId)}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-right font-arabic text-[10px] text-zinc-500">
                        {item.product?.name_ar}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-zinc-900/50 p-1">
                        <button 
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity, -1)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[2ch] text-center font-space-grotesk text-sm font-bold text-white">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => handleUpdateQuantity(item.productId, item.quantity, 1)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-space-grotesk text-sm font-bold text-[#ffc105]">
                        {(item.product?.selling_price! * item.quantity).toLocaleString()} EGP
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Checkout button */}
          {cart && cart.items.length > 0 && (
            <div className="border-t border-white/5 bg-zinc-950 p-6 space-y-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
              <div className="space-y-2">
                <div className="flex justify-between text-zinc-400 text-xs font-medium uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span className="text-white">{(cart.total || 0).toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-xs font-medium uppercase tracking-widest">
                  <span>Shipping</span>
                  <span className="text-zinc-500 italic">CALCULATED AT NEXT STEP</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-4 text-white">
                  <span className="font-space-grotesk text-lg font-bold uppercase tracking-widest">Total</span>
                  <span className="font-space-grotesk text-2xl font-bold text-[#ffc105]">
                    {(cart.total || 0).toLocaleString()} EGP
                  </span>
                </div>
              </div>

              <Link 
                href="/checkout"
                onClick={closeCart}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffc105] py-4 font-space-grotesk text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95"
              >
                PROCEED TO CHECKOUT
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
