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
      <div
        className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
        onClick={closeCart}
      />

      <div
        className={`fixed inset-y-0 ${locale === "ar" ? "left-0 border-r" : "right-0 border-l"} z-[70] w-full max-w-md border-border bg-background shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] animate-in ${locale === "ar" ? "slide-in-from-left" : "slide-in-from-right"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <h2 className="font-space-grotesk text-xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShoppingBag size={18} />
              </div>
              <span>
                {t("title")}{" "}
                <span className="text-primary">{t("accentTitle")}</span>
              </span>
            </h2>
            <button
              onClick={closeCart}
              className="rounded-xl p-2.5 text-label-muted transition-colors hover:bg-accent hover:text-foreground active:scale-95"
            >
              <X size={22} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {!cart || cart.items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center space-y-5 text-center">
                <div className="rounded-2xl bg-secondary p-8">
                  <ShoppingBag
                    size={48}
                    className="text-label-muted/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="font-space-grotesk text-lg font-bold text-foreground tracking-tight">
                    {t("empty.title")}
                  </p>
                  <p className="text-sm text-label-muted max-w-[220px] mx-auto leading-relaxed">
                    {t("empty.description")}
                  </p>
                </div>
                <button
                  onClick={closeCart}
                  className="mt-4 font-space-grotesk text-sm font-bold text-primary hover:text-foreground transition-colors border border-primary/20 px-6 py-2.5 rounded-lg"
                >
                  {t("empty.cta")}
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={`${item.productId}-${item.skuId}`}
                  className="flex gap-4 group animate-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="relative aspect-square h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-card group-hover:border-primary/20 transition-colors">
                    {item.product?.images?.[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={
                          locale === "en"
                            ? item.product.name_en
                            : item.product.name_ar
                        }
                        fill
                        className="object-cover transition-transform group-hover:scale-105 duration-500"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-label-muted text-[10px] font-medium text-center px-2">
                        {t("item.noImage")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-3">
                        <Link
                          href={`/products/${item.product?.slug || item.productId}`}
                          onClick={closeCart}
                          className="font-space-grotesk text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-1 tracking-tight"
                        >
                          {locale === "en"
                            ? item.product?.name_en
                            : item.product?.name_ar}
                        </Link>
                        <button
                          onClick={() =>
                            handleRemove(item.productId, item.skuId)
                          }
                          className="text-label-muted/40 hover:text-destructive transition-colors active:scale-90"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {item.sku?.variantName && item.sku.variantName !== "Default" && (
                        <p className="text-[11px] font-medium text-label-muted bg-secondary px-2 py-0.5 rounded w-fit">
                          {item.sku.variantName}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary p-0.5">
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
                          className="p-1.5 text-label-muted hover:text-foreground transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="min-w-[2ch] text-center font-space-grotesk text-sm font-bold text-foreground">
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
                          className="p-1.5 text-label-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="font-space-grotesk text-sm font-bold text-foreground tracking-tight">
                        {(
                          (item.sku?.price ||
                            item.product?.selling_price ||
                            0) * item.quantity
                        ).toLocaleString(locale)}{" "}
                        <span className="text-[10px] text-primary font-semibold">EGP</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart && cart.items.length > 0 && (
            <div className="border-t border-border bg-background p-6 space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-label-muted tracking-wide">
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

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-label-muted">
                  <span>{t("summary.subtotal")}</span>
                  <span className="text-foreground font-medium">
                    {(cart.subtotal || 0).toLocaleString(locale)} EGP
                  </span>
                </div>
                {cart.promoDiscount ? (
                  <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                    <span>{t("summary.discount")}</span>
                    <span className="font-medium">
                      -{cart.promoDiscount.toLocaleString(locale)} EGP
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center text-sm text-label-muted">
                  <span>{t("summary.shipping")}</span>
                  <span className="text-label-muted italic lowercase text-xs">
                    {t("summary.shippingNote")}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-5 text-foreground items-end">
                  <span className="text-sm font-semibold text-label-muted uppercase tracking-wide">
                    {t("summary.total")}
                  </span>
                  <span className="font-space-grotesk text-3xl font-bold text-primary tracking-tight leading-none">
                    {(cart.total || 0).toLocaleString(locale)}{" "}
                    <span className="text-base">EGP</span>
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 font-space-grotesk text-base font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
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