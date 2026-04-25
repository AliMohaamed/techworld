"use client";

import { useState } from "react";
import { Tag, Loader2, X, CheckCircle2, AlertCircle, Truck } from "lucide-react";
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

  const isFreeShipping = promoType === "free_shipping";

  if (appliedCode && !error) {
    return (
      <div className="group relative flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 transition-all hover:border-emerald-500/40">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500 shadow-sm">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="font-space-grotesk text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500/80">
              {appliedLabel}
            </p>
            <p className="font-mono text-sm font-black text-foreground uppercase mt-0.5">
              {appliedCode}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1.5">
          {isFreeShipping ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <Truck size={14} />
              <span className="text-[10px] uppercase font-black">{freeShippingLabel}</span>
            </div>
          ) : (
            <p className="font-space-grotesk text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              -{discountAmount?.toLocaleString()} <span className="text-[10px]">EGP</span>
            </p>
          )}
          <button
            onClick={onRemove}
            className="text-[10px] font-black uppercase text-muted-foreground transition-colors hover:text-red-500"
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
          <Tag className="absolute ltr:left-5 rtl:right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-[#ffc105] transition-colors" />
          <input
            type="text"
            placeholder={placeholder}
            className={cn(
              "w-full rounded-2xl border border-border bg-card py-5 ltr:pl-14 rtl:pr-14 ltr:pr-5 rtl:pl-5 font-mono text-sm font-black text-foreground uppercase placeholder:text-muted-foreground/30 focus:border-[#ffc105]/30 focus:outline-none transition-all",
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
          className="h-auto px-8 font-space-grotesk text-[11px] font-black uppercase rounded-2xl bg-secondary text-foreground border border-border hover:bg-[#ffc105] hover:text-black transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : applyLabel}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/5 border border-red-500/20 p-4 text-red-500 dark:text-red-400 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle size={16} />
          <p className="text-[10px] font-black uppercase leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
