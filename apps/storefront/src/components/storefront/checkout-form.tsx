"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, Loader2, ArrowRight, MapPinned } from "lucide-react";
import { PromoCodeInput } from "@techworld/ui";

type GovernorateOption = {
  _id: Id<"governorates">;
  name_ar: string;
  name_en: string;
  shippingFee: number;
  isActive: boolean;
};

interface CheckoutFormProps {
  cartTotal: number;
  promoDiscount?: number;
  promoError?: string | null;
  appliedPromo?: string;
  onApplyPromo?: (code: string) => void;
  onRemovePromo?: () => void;
  governorates: GovernorateOption[];
  governoratesLoading?: boolean;
}

export default function CheckoutForm({
  cartTotal,
  promoDiscount = 0,
  promoError,
  appliedPromo,
  onApplyPromo,
  onRemovePromo,
  governorates,
  governoratesLoading,
}: CheckoutFormProps) {
  const { sessionId } = useSession();
  const router = useRouter();
  const placeOrder = useMutation(api.cart.placeOrderFromSession);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    governorateId: "",
  });

  const selectedGovernorate = useMemo(
    () => governorates.find((governorate) => governorate._id === formData.governorateId),
    [formData.governorateId, governorates],
  );
  const shippingFee = selectedGovernorate?.shippingFee ?? 0;
  const grandTotal = Math.max(0, cartTotal + shippingFee - promoDiscount);
  const deliveryUnavailable = !governoratesLoading && governorates.length === 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (deliveryUnavailable) {
      setErrorMessage("Delivery is currently unavailable. Please try again later.");
      return;
    }
    if (!formData.governorateId) {
      setErrorMessage("Select your governorate to calculate delivery and continue.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const shortCode = await placeOrder({
        sessionId,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        governorateId: formData.governorateId as Id<"governorates">,
        promoCode: appliedPromo,
      });

      router.push(`/success?code=${shortCode}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Order placement failed.";
      console.error("Order placement failed", err);
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

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
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
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
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
            />
          </div>

          <div className="relative">
            <MapPinned className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <select
              required
              className="w-full appearance-none rounded-xl border border-white/5 bg-zinc-900/50 py-4 pl-12 pr-4 text-sm text-white focus:border-[#ffc105]/50 focus:outline-none focus:ring-1 focus:ring-[#ffc105]/50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={deliveryUnavailable}
              value={formData.governorateId}
              onChange={(event) => setFormData({ ...formData, governorateId: event.target.value })}
            >
              <option value="">Select governorate</option>
              {governorates.map((governorate) => (
                <option key={governorate._id} value={governorate._id}>
                  {governorate.name_en} - {governorate.shippingFee.toLocaleString()} EGP
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-4 h-4 w-4 text-zinc-500" />
            <textarea
              required
              placeholder="Complete Delivery Address"
              rows={3}
              className="w-full rounded-xl border border-white/5 bg-zinc-900/50 py-4 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-[#ffc105]/50 focus:outline-none focus:ring-1 focus:ring-[#ffc105]/50"
              value={formData.address}
              onChange={(event) => setFormData({ ...formData, address: event.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/5 bg-zinc-950 p-6 shadow-sm">
        <h3 className="font-space-grotesk text-sm font-bold uppercase tracking-widest text-zinc-500">
          Discount Code
        </h3>
        <PromoCodeInput
          onApply={onApplyPromo || (() => {})}
          onRemove={onRemovePromo || (() => {})}
          appliedCode={appliedPromo}
          error={promoError}
          discountAmount={promoDiscount}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-white/5 bg-zinc-950 p-6 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span>Items subtotal</span>
          <span className="text-zinc-200">{cartTotal.toLocaleString()} EGP</span>
        </div>
        {promoDiscount > 0 ? (
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-emerald-400">
            <span>Promo Discount</span>
            <span>-{promoDiscount.toLocaleString()} EGP</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span>Shipping</span>
          <span className="text-zinc-200">
            {selectedGovernorate ? `${shippingFee.toLocaleString()} EGP` : governoratesLoading ? "Loading..." : deliveryUnavailable ? "Unavailable" : "Select governorate"}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Order Total</span>
          <span className="font-space-grotesk text-2xl font-black text-[#ffc105]">
            {grandTotal.toLocaleString()} EGP
          </span>
        </div>

        {governoratesLoading ? (
          <p className="text-sm text-zinc-500">Loading available delivery governorates...</p>
        ) : deliveryUnavailable ? (
          <p className="text-sm text-red-400">
            Delivery is currently unavailable because no active governorates are configured.
          </p>
        ) : null}
        {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}

        <button
          disabled={isLoading || governoratesLoading || deliveryUnavailable}
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
