"use client";

import { useState } from "react";
import { Tag, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";

interface PromoCodeInputProps {
  onApply: (code: string) => void;
  onRemove: () => void;
  appliedCode?: string;
  isLoading?: boolean;
  error?: string | null;
  discountAmount?: number;
}

export function PromoCodeInput({
  onApply,
  onRemove,
  appliedCode,
  isLoading,
  error,
  discountAmount,
}: PromoCodeInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleApply = () => {
    if (inputValue.trim()) {
      onApply(inputValue.trim().toUpperCase());
    }
  };

  if (appliedCode && !error) {
    return (
      <div className="group relative flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 transition-all hover:border-emerald-500/50">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="font-space-grotesk text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">
              Code Applied
            </p>
            <p className="font-mono text-sm font-bold text-white tracking-widest uppercase">
              {appliedCode}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-space-grotesk text-sm font-black text-emerald-400">
            -{discountAmount?.toLocaleString()} EGP
          </p>
          <button
            onClick={onRemove}
            className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-red-400"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="PROMO CODE"
            className={cn(
               "w-full rounded-xl border border-white/5 bg-zinc-900/50 py-4 pl-12 pr-4 font-mono text-sm font-bold tracking-widest text-white uppercase placeholder:text-zinc-600 focus:border-[#ffc105]/50 focus:outline-none focus:ring-1 focus:ring-[#ffc105]/50 transition-all",
               error && "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
            )}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={isLoading || !inputValue.trim()}
          className="h-auto px-6 font-space-grotesk text-xs font-black uppercase tracking-widest"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-red-400 animate-in fade-in duration-300">
          <AlertCircle size={14} />
          <p className="text-[10px] font-bold uppercase tracking-wider">{error}</p>
        </div>
      )}
    </div>
  );
}
