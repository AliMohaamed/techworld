"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, Loader2, ArrowRight } from "lucide-react";

export default function CheckoutForm() {
  const { sessionId } = useSession();
  const router = useRouter();
  const cart = useQuery(api.cart.getCart, { sessionId });
  const placeOrder = useMutation(api.orders.placeOrderFromSession);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart || cart.items.length === 0) return;

    setIsLoading(true);
    try {
      const shortCode = await placeOrder({
        sessionId,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.address,
      });

      router.push(`/success?code=${shortCode}`);
    } catch (err) {
      console.error("Order placement failed", err);
      setIsLoading(false);
    }
  };

  if (!cart || cart.items.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-space-grotesk text-sm font-bold uppercase tracking-widest text-[#ffc105]">
          Shipping Information
        </h3>
        
        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              required
              type="text"
              placeholder="Full Name"
              className="w-full rounded-xl border border-white/5 bg-zinc-900/50 py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#ffc105]/50 focus:outline-none focus:ring-1 focus:ring-[#ffc105]/50"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              required
              type="tel"
              placeholder="Phone Number (WhatsApp preferred)"
              className="w-full rounded-xl border border-white/5 bg-zinc-900/50 py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#ffc105]/50 focus:outline-none focus:ring-1 focus:ring-[#ffc105]/50"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-4 h-4 w-4 text-zinc-500" />
            <textarea
              required
              placeholder="Complete Delivery Address"
              rows={3}
              className="w-full rounded-xl border border-white/5 bg-zinc-900/50 py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#ffc105]/50 focus:outline-none focus:ring-1 focus:ring-[#ffc105]/50"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-zinc-950 p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Order Total</span>
          <span className="text-[#ffc105] font-space-grotesk text-2xl font-black">
            {(cart?.total || 0).toLocaleString()} EGP
          </span>
        </div>
        
        <button
          disabled={isLoading}
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#ffc105] py-5 font-space-grotesk text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              CONFIRM ORDER
              <ArrowRight size={18} />
            </>
          )}
        </button>
        
        <p className="text-center text-[10px] uppercase tracking-wider text-zinc-600">
          By confirming, you agree to receive a confirmation via WhatsApp.
        </p>
      </div>
    </form>
  );
}




