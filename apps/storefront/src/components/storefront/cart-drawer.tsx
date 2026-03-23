"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { Link } from "@/navigation";
import { Id } from "@backend/convex/_generated/dataModel";
import { useState } from "react";
import { PromoCodeInput } from "@techworld/ui";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

export default function CartDrawer() {
  const t = useTranslations("CartDrawer");
  const locale = useLocale();
  const { sessionId } = useSession();
  const { isOpen, closeCart } = useCart();
  const [appliedPromo, setAppliedPromo] = useState<string | undefined>(
    undefined,
  );
  const cart = useQuery(api.cart.getCart, {
    sessionId,
    promoCode: appliedPromo,
  });
  const addToCart = useMutation(api.cart.addToCart);
  const removeFromCart = useMutation(api.cart.removeFromCart);

  if (!isOpen) return null;

  const handleUpdateQuantity = async (
    productId: Id<"products">,
    skuId: Id<"skus">,
    currentQty: number,
    delta: number,
    displayStock: number,
  ) => {
    const newQty = Math.max(1, currentQty + delta);
    if (delta > 0 && newQty > displayStock) {
      toast.error(t("item.stockLimit"));
      return;
    }

    try {
      await addToCart({ sessionId, productId, skuId, quantity: newQty });
    } catch (e) {
      console.error("Cart update failed", e);
    }
  };

  const handleRemove = async (productId: Id<"products">, skuId: Id<"skus">) => {
    await removeFromCart({ sessionId, productId, skuId });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-md transition-all duration-500 animate-in fade-in"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 ${locale === "ar" ? "left-0 border-r" : "right-0 border-l"} z-[70] w-full max-w-md border-border bg-background shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-in ${locale === "ar" ? "slide-in-from-left" : "slide-in-from-right"}`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-8">
            <h2 className="font-space-grotesk text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-[#ffc105]/10 flex items-center justify-center text-[#ffc105]">
                <ShoppingBag size={20} />
              </div>
              <span>
                {t("title")}{" "}
                <span className="text-[#ffc105]">{t("accentTitle")}</span>
              </span>
            </h2>
            <button
              onClick={closeCart}
              className="rounded-2xl p-3 text-muted-foreground transition-all hover:bg-muted/10 hover:text-foreground active:scale-95"
            >
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            {!cart || cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-muted/20" />
                  <div className="relative rounded-full bg-muted/10 p-10 ring-1 ring-border  ">
                    <ShoppingBag
                      size={64}
                      className="text-muted-foreground/30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-space-grotesk text-lg font-black text-foreground uppercase tracking-tight">
                    {t("empty.title")}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                    {t("empty.description")}
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="mt-6 font-space-grotesk text-xs font-black text-[#ffc105] hover:text-foreground transition-all uppercase tracking-[0.3em] border border-[#ffc105]/20 px-8 py-3 rounded-full"
                >
                  {t("empty.cta")}
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={`${item.productId}-${item.skuId}`}
                  className="flex gap-6 group animate-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="relative aspect-square h-24 w-24 flex-shrink-0 overflow-hidden rounded-[24px] border border-border bg-card   group-hover:border-[#ffc105]/20 transition-all">
                    {item.product?.images?.[0] ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={item.product.images[0]}
                          alt={
                            locale === "en"
                              ? item.product.name_en
                              : item.product.name_ar
                          }
                          fill
                          className="object-cover transition-transform group-hover:scale-110"
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-[9px] font-black uppercase tracking-widest text-center px-2">
                        {t("item.noImage")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between py-1 min-w-0">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <Link
                          href={`/products/${item.product?.slug || item.productId}`}
                          onClick={closeCart}
                          className="font-space-grotesk text-sm font-black text-foreground hover:text-[#ffc105] transition-colors line-clamp-1 uppercase tracking-tight"
                        >
                          {locale === "en"
                            ? item.product?.name_en
                            : item.product?.name_ar}
                        </Link>
                        <button
                          onClick={() =>
                            handleRemove(item.productId, item.skuId)
                          }
                          className="text-muted-foreground/50 hover:text-destructive transition-all active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground bg-secondary w-fit px-2 py-0.5 rounded shadow-sm">
                        {item.sku?.variantName &&
                        item.sku.variantName !== "Default"
                          ? item.sku.variantName
                          : t("item.defaultVariant")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-1.5  ">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.skuId,
                              item.quantity,
                              -1,
                              item.sku?.display_stock ?? 0,
                            )
                          }
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-[2ch] text-center font-space-grotesk text-sm font-black text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.skuId,
                              item.quantity,
                              1,
                              item.sku?.display_stock ?? 0,
                            )
                          }
                          disabled={
                            item.quantity >= (item.sku?.display_stock ?? 0)
                          }
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-space-grotesk text-base font-black text-foreground tracking-tight">
                        {(
                          (item.sku?.price ??
                            item.product?.selling_price ??
                            0) * item.quantity
                        ).toLocaleString(locale)}{" "}
                        <span className="text-[10px] text-[#ffc105]">EGP</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Checkout button */}
          {cart && cart.items.length > 0 && (
            <div className="border-t border-border bg-background p-8 space-y-8 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-15px_40px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
              <div className="space-y-4">
                <p className="font-space-grotesk text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/50 ml-1">
                  {t("promo.label")}
                </p>
                <PromoCodeInput
                  onApply={(code: string) => setAppliedPromo(code)}
                  onRemove={() => setAppliedPromo(undefined)}
                  appliedCode={appliedPromo}
                  error={cart.promoError}
                  discountAmount={cart.promoDiscount}
                  placeholder={t("promo.placeholder")}
                  applyLabel={t("promo.apply")}
                  appliedLabel={t("promo.applied")}
                  removeLabel={t("promo.remove")}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  <span>{t("summary.subtotal")}</span>
                  <span className="text-foreground/80">
                    {(cart.subtotal || 0).toLocaleString(locale)} EGP
                  </span>
                </div>
                {cart.promoDiscount ? (
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500">
                    <span>{t("summary.discount")}</span>
                    <span className="font-mono">
                      -{cart.promoDiscount.toLocaleString(locale)} EGP
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  <span>{t("summary.shipping")}</span>
                  <span className="text-muted-foreground/60 italic lowercase tracking-wide font-medium">
                    {t("summary.shippingNote")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-8 text-foreground items-end">
                  <span className="font-space-grotesk text-sm font-black uppercase tracking-[0.5em] text-muted-foreground/50 leading-none">
                    {t("summary.total")}
                  </span>
                  <span className="font-space-grotesk text-4xl font-black text-[#ffc105] tracking-tightest leading-none">
                    {(cart.total || 0).toLocaleString(locale)}{" "}
                    <span className="text-lg">EGP</span>
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ffc105] py-5 font-space-grotesk text-lg font-black uppercase tracking-[0.3em] text-black transition-all hover:bg-foreground hover:text-background active:scale-[0.98] shadow-[0_10px_30px_rgba(255,193,5,0.2)]"
              >
                {t("summary.checkout")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
