"use client";

import { useState } from "react";
import { Tag, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface PromoCodeInputProps {
  onApply: (code: string) => void;
  onRemove: () => void;
  appliedCode?: string;
  isLoading?: boolean;
  error?: string | null;
  discountAmount?: number;
  promoType?: string | null;
  placeholder?: string;
  applyLabel?: string;
  removeLabel?: string;
  appliedLabel?: string;
  freeShippingLabel?: string;
}

export function PromoCodeInput({
  onApply,
  onRemove,
  appliedCode,
  isLoading,
  error,
  discountAmount,
  promoType,
  placeholder = "PROMO CODE",
  applyLabel = "Apply",
  removeLabel = "Remove",
  appliedLabel = "Code Applied",
  freeShippingLabel = "Free Shipping",
}: PromoCodeInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleApply = () => {
    if (inputValue.trim()) {
      onApply(inputValue.trim().toUpperCase());
    }
  };

  if (appliedCode && !error) {
    return (
      <div className="group relative flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 transition-all hover:border-emerald-500/40  ">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500 shadow-sm">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/80">
              {appliedLabel}
            </p>
            <p className="font-mono text-sm font-black text-white tracking-widest uppercase mt-0.5">
              {appliedCode}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-space-grotesk text-base font-black text-emerald-400 tracking-tight">
            {promoType === "free_shipping" ? (
               <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{freeShippingLabel}</span>
            ) : (
               <>
                 -{discountAmount?.toLocaleString()} <span className="text-[10px]">EGP</span>
               </>
            )}
          </p>
          <button
            onClick={onRemove}
            className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-red-400"
          >
            {removeLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Tag className="absolute ltr:left-5 rtl:right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#ffc105] transition-colors" />
          <input
            type="text"
            placeholder={placeholder}
            className={cn(
              "w-full rounded-2xl border border-white/5 bg-zinc-900/50 py-5 ltr:pl-14 rtl:pr-14 ltr:pr-5 rtl:pl-5 font-mono text-sm font-black tracking-widest text-white uppercase placeholder:text-zinc-700 focus:border-[#ffc105]/30 focus:outline-none transition-all  ",
              error && "border-red-500/30 focus:border-red-500/50"
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={isLoading || !inputValue.trim()}
          className="h-auto px-8 font-space-grotesk text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl bg-zinc-900 text-white border border-white/5 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : applyLabel}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-red-400 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={16} />
          <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
