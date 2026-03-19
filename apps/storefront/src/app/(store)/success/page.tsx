"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { CheckCircle2, MessageSquare, ArrowRight, Package, Truck, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const shortCode = searchParams.get("code") || "";
  const orders = useQuery(api.orders.getOrdersByShortCode, { shortCode });

  // Placeholder for real business number
  const BUSINESS_WHATSAPP = "201099684535"; 
  
  const generateWhatsAppLink = () => {
    if (!shortCode) return "#";
    const message = encodeURIComponent(`Hello TechWorld! My Order ID is ${shortCode}. I'm attaching my payment receipt for verification.`);
    return `https://wa.me/${BUSINESS_WHATSAPP}?text=${message}`;
  };

  if (!shortCode) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold text-white uppercase tracking-widest">Order Not Found</h1>
        <Link href="/" className="mt-6 font-space-grotesk text-sm font-black uppercase text-[#ffc105] hover:underline">
          Back to Store
        </Link>
      </div>
    );
  }

  const total = orders?.reduce((sum: number, o: any) => sum + o.total_price, 0) || 0;

  return (
    <div className="min-h-screen bg-black px-4 pb-20 pt-8 md:px-8">
      <div className="container mx-auto max-w-2xl">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 animate-pulse rounded-full bg-[#ffc105]/20" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-[#ffc105] text-black">
              <CheckCircle2 size={48} strokeWidth={2.5} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-space-grotesk text-4xl font-black tracking-tight text-white uppercase md:text-5xl">
              Order <span className="text-[#ffc105]">Placed!</span>
            </h1>
            <p className="text-zinc-500 max-w-md mx-auto">
              Your session has been converted to a pending order. Please follow the instructions below to verify your purchase.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-dashed border-[#ffc105]/30 bg-zinc-950 p-8 space-y-6">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Your Order ID</span>
              <span className="font-space-grotesk text-3xl font-black text-white selection:bg-[#ffc105] selection:text-black">
                {shortCode}
              </span>
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="space-y-4 text-left">
              <h4 className="font-space-grotesk text-xs font-bold uppercase tracking-widest text-zinc-400">Next Steps:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-[#ffc105] text-[10px] font-bold text-black flex items-center justify-center shrink-0">1</div>
                  <p className="text-xs leading-relaxed text-zinc-300">Click the <span className="text-white font-bold">VERIFY ON WHATSAPP</span> button below.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-[#ffc105] text-[10px] font-bold text-black flex items-center justify-center shrink-0">2</div>
                  <p className="text-xs leading-relaxed text-zinc-300">Send the pre-filled message without modifying the <span className="text-white font-bold">Order ID</span>.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 h-4 w-4 rounded-full bg-[#ffc105] text-[10px] font-bold text-black flex items-center justify-center shrink-0">3</div>
                  <p className="text-xs leading-relaxed text-zinc-300">Attach a screenshot of your <span className="text-white font-bold">Instapay / Wallet</span> transfer as proof.</p>
                </li>
              </ul>
            </div>

            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#ffc105] py-5 font-space-grotesk text-sm font-black uppercase tracking-[0.2em] text-black transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,193,5,0.2)]"
            >
              <MessageSquare size={18} className="fill-black" />
              VERIFY ON WHATSAPP
            </a>
          </div>

          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-zinc-900/10 p-4">
              <Package size={20} className="text-zinc-600" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Virtual Stock Reserved</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-zinc-900/10 p-4">
              <ShieldCheck size={20} className="text-zinc-600" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Secure Verification</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-zinc-900/10 p-4">
              <Truck size={20} className="text-zinc-600" />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Delivery Post-Approval</span>
            </div>
          </div>

          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
          >
            Return to Homepage
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading order data...</div>}>
      <SuccessContent />
    </Suspense>
  );
}




