"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { Link } from "@/navigation";
import CheckoutForm from "@/components/storefront/checkout-form";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";

export default function CheckoutPage() {
  const t = useTranslations('CheckoutPage');
  const locale = useLocale();
  const { sessionId } = useSession();
  const cart = useQuery(api.cart.getCart, { sessionId });

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 px-4 bg-black">
        <div className="rounded-full bg-zinc-900/40 p-10 ring-1 ring-white/5 shadow-2xl">
          <ShoppingBag size={80} className="text-zinc-800" />
        </div>
        <div className="text-center space-y-4">
          <h1 className="font-space-grotesk text-3xl font-black uppercase tracking-tighter text-white">
            {t('empty.title')}
          </h1>
          <Link 
            href="/" 
            className="inline-block font-space-grotesk text-sm font-bold text-[#ffc105] hover:text-white transition-colors uppercase tracking-[0.25em] border border-[#ffc105]/20 px-8 py-3 rounded-full"
          >
            {t('empty.back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 pt-12">
      <div className="container mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 hover:text-white transition-all w-fit group"
          >
            <ChevronLeft size={16} className={`transition-transform group-hover:-translate-x-1 ${locale === 'ar' ? 'rotate-180 group-hover:translate-x-1' : ''}`} />
            {t('backToShopping')}
          </Link>
          <h1 className="font-space-grotesk text-5xl font-black uppercase tracking-tighter text-white sm:text-7xl leading-none">
            {t('title')} <span className="text-[#ffc105]">{t('accentTitle')}</span>
          </h1>
        </div>

        <div className="grid gap-16 lg:grid-cols-12 items-start">
          {/* Form Side */}
          <div className="lg:col-span-7">
            <CheckoutForm />
          </div>

          {/* Summary Side - Sticky */}
          <div className="lg:sticky lg:top-32 lg:col-span-5">
            <div className="rounded-[40px] border border-white/5 bg-zinc-900/30 p-10 backdrop-blur-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                 <h2 className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105]">
                   {t('summary.title')}
                 </h2>
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">{cart.items.length} items</span>
              </div>
              
              <div className="max-h-[450px] overflow-y-auto ltr:pr-4 rtl:pl-4 space-y-8 mb-10 scrollbar-hide">
                {cart.items.map((item) => (
                  <div key={`${item.productId}-${item.skuId}`} className="flex gap-6 group">
                    <div className="relative aspect-square h-24 w-24 flex-shrink-0 overflow-hidden rounded-[24px] border border-white/5 bg-zinc-950 shadow-inner group-hover:border-[#ffc105]/20 transition-colors">
                      {item.product?.images?.[0] ? (
                        <Image
                          src={item.product?.images[0]}
                          alt={locale === 'en' ? item.product?.name_en : item.product?.name_ar}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-800 text-[10px] font-black uppercase tracking-widest">
                          {t('summary.noImage')}
                        </div>
                      )}
                      <div className="absolute ltr:-top-2 ltr:-right-2 rtl:-top-2 rtl:-left-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#ffc105] text-[11px] font-black text-black ring-4 ring-zinc-900 shadow-lg">
                        {item.quantity}
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <p className="font-space-grotesk text-base font-black text-white line-clamp-1 uppercase tracking-tight group-hover:text-[#ffc105] transition-colors">
                        {locale === 'en' ? item.product?.name_en : item.product?.name_ar}
                      </p>
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-600 mt-2 bg-white/5 w-fit px-2 py-0.5 rounded">
                        {item.sku?.variantName && item.sku.variantName !== "Default" 
                          ? item.sku.variantName 
                          : t('summary.defaultVariant')}
                      </p>
                      <p className="font-space-grotesk text-lg font-black text-white mt-3">
                        {((item.sku?.price ?? item.product?.selling_price ?? 0) * item.quantity).toLocaleString(locale)} <span className="text-xs text-[#ffc105]">EGP</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-5 pt-10 border-t border-white/10">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                  <span>{t('summary.subtotal')}</span>
                  <span className="text-zinc-400">{(cart.subtotal || 0).toLocaleString(locale)} EGP</span>
                </div>
                {cart.promoDiscount ? (
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">
                    <span>{t('summary.discount')}</span>
                    <span className="font-mono">-{cart.promoDiscount.toLocaleString(locale)} EGP</span>
                  </div>
                ) : null}
                
                <div className="flex justify-between pt-8 text-white border-t border-white/10 items-end">
                  <div className="flex flex-col gap-1">
                     <span className="font-space-grotesk text-sm font-black uppercase tracking-[0.4em] text-zinc-500">{t('summary.total')}</span>
                     <span className="text-[9px] uppercase font-black text-zinc-700 tracking-[0.25em] max-w-[180px] leading-relaxed">
                       {t('summary.shippingNote')}
                     </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-space-grotesk text-5xl font-black text-[#ffc105] tracking-tightest">
                      {(cart.total || 0).toLocaleString(locale)} <span className="text-xl">EGP</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
