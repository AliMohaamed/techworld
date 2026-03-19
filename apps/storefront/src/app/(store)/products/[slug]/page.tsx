"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useSession } from "@/providers/session-provider";
import { useCart } from "@/providers/cart-provider";
import { ChevronRight, ShoppingBag, Truck, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { DynamicProductGallery } from "@/components/storefront/DynamicProductGallery";

type ProductSku = {
  _id: Id<"skus">;
  variantName: string;
  variantAttributes?: {
    color?: string;
    size?: string;
    type?: string;
  };
  real_stock: number;
  display_stock: number;
  price: number;
  compareAtPrice?: number;
  linkedImageId?: string;
  isDefault?: boolean;
};

function uniqueImages(images: Array<string | undefined>) {
  return images.filter((image, index, array): image is string => Boolean(image) && array.indexOf(image) === index);
}

function normalizeColorLabel(color: string) {
  return color.trim().toLowerCase();
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { sessionId } = useSession();
  const { openCart } = useCart();
  const addToCart = useMutation(api.cart.addToCart);
  const product = useQuery(api.products.getBySlug, slug ? { slug: slug as string } : "skip");
  const [selectedSkuId, setSelectedSkuId] = useState<Id<"skus"> | undefined>(undefined);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!product?.skus?.length) {
      setSelectedSkuId(undefined);
      return;
    }

    const nextSku = product.skus.find((sku: ProductSku) => sku.isDefault) ?? product.skus[0];
    setSelectedSkuId(nextSku?._id);
  }, [product]);

  const selectedVariant = product?.skus?.find((sku: ProductSku) => sku._id === selectedSkuId) ?? product?.skus?.[0];
  const variantColorOptions =
    product?.skus?.filter(
      (sku: ProductSku, index: number, list: ProductSku[]) => {
        const color = sku.variantAttributes?.color?.trim();
        if (!color) {
          return false;
        }

        return list.findIndex((candidate) => normalizeColorLabel(candidate.variantAttributes?.color ?? "") === normalizeColorLabel(color)) === index;
      },
    ) ?? [];
  const variantOptions = product?.skus ?? [];

  const activeImage = selectedImage ?? selectedVariant?.linkedImageId ?? product?.thumbnail ?? product?.images?.[0];
  const galleryImages = product
    ? uniqueImages([selectedVariant?.linkedImageId, product.thumbnail, ...(product.images ?? [])])
    : [];
  const displayPrice = selectedVariant?.price ?? product?.selling_price ?? 0;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice;
  const hasSalePrice = compareAtPrice !== undefined && compareAtPrice > displayPrice;
  const availableUnits = selectedVariant?.display_stock ?? 0;

  useEffect(() => {
    setSelectedImage(activeImage);
  }, [activeImage, selectedSkuId]);

  const handleAddToCart = async () => {
    if (!product) return;
    const skuId = selectedSkuId ?? selectedVariant?._id;
    if (!skuId) return;
    try {
      await addToCart({
        sessionId,
        productId: product._id,
        skuId,
        quantity: 1,
      });
      openCart();
    } catch (err) {
      console.error("Failed to add to cart", err);
    }
  };

  if (product === undefined) {
    return (
      <div className="container mx-auto animate-pulse p-4 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-zinc-900" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 rounded bg-zinc-900" />
            <div className="h-6 w-1/4 rounded bg-zinc-900" />
            <div className="h-24 w-full rounded bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-white">Product Not Found</h1>
        <p className="mt-2 text-zinc-500">The product you are looking for does not exist or has been removed.</p>
        <Link href="/" className="mt-6 font-space-grotesk text-sm font-bold uppercase text-[#ffc105]">
          Back to Store
        </Link>
      </div>
    );
  }

  const isOutOfStock = availableUnits <= 0;
  const isUnavailable = !product.isCategoryActive;
  const statusLabel = isUnavailable ? "Currently Unavailable" : isOutOfStock ? "Sold Out" : undefined;

  return (
    <div className="min-h-screen bg-black pb-20">
      <nav className="container mx-auto p-4 text-xs font-medium text-zinc-500">
        <div className="flex items-center space-x-2">
          <Link href="/" className="transition-colors hover:text-white">STORE</Link>
          <ChevronRight size={12} />
          <Link
            href={`/categories/${product.categorySlug || product.categoryId}`}
            className="truncate uppercase transition-colors hover:text-white"
          >
            {product.categoryName_en || "CATEGORY"}
          </Link>
          <ChevronRight size={12} />
          <span className="truncate uppercase text-white">{product.name_en}</span>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <DynamicProductGallery
            name={product.name_en}
            images={galleryImages}
            selectedImage={selectedImage}
            onSelectImage={setSelectedImage}
            statusLabel={statusLabel}
          />

          <div className="flex flex-col">
            <header className="mb-6 space-y-2">
              <h1 className="font-space-grotesk text-3xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
                {product.name_en}
              </h1>
              <p className="text-right font-arabic text-xl leading-relaxed text-zinc-400">{product.name_ar}</p>
            </header>

            <div className="mb-8 flex flex-wrap items-end gap-4">
              <div className="flex items-end gap-3">
                <span className="font-space-grotesk text-4xl font-bold tracking-tighter text-[#ffc105]">
                  {displayPrice.toLocaleString()} EGP
                </span>
                {hasSalePrice ? (
                  <s className="pb-1 font-space-grotesk text-lg font-bold text-zinc-500">
                    {compareAtPrice.toLocaleString()} EGP
                  </s>
                ) : null}
              </div>
              <span className={`font-space-grotesk text-sm font-bold uppercase ${isOutOfStock ? "text-red-500" : "text-zinc-500"}`}>
                {availableUnits} units left
              </span>
            </div>

            {variantColorOptions.length > 0 ? (
              <div className="mb-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Colorways</p>
                <div className="flex flex-wrap gap-3">
                  {variantColorOptions.map((sku: ProductSku) => {
                    const color = sku.variantAttributes?.color ?? sku.variantName;
                    const isActive = sku._id === selectedVariant?._id;
                    return (
                      <button
                        key={sku._id}
                        type="button"
                        onClick={() => {
                          setSelectedSkuId(sku._id);
                          setSelectedImage(sku.linkedImageId ?? product.thumbnail ?? product.images?.[0]);
                        }}
                        className={`flex items-center gap-3 rounded-full border px-4 py-2 text-left transition ${
                          isActive
                            ? "border-[#ffc105] bg-[#ffc105]/10 text-white"
                            : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">{color}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : variantOptions.length > 1 ? (
              <div className="mb-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Variants</p>
                <div className="flex flex-wrap gap-3">
                  {variantOptions.map((sku: ProductSku) => {
                    const isActive = sku._id === selectedVariant?._id;
                    return (
                      <button
                        key={sku._id}
                        type="button"
                        onClick={() => {
                          setSelectedSkuId(sku._id);
                          setSelectedImage(sku.linkedImageId ?? product.thumbnail ?? product.images?.[0]);
                        }}
                        className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${
                          isActive
                            ? "border-[#ffc105] bg-[#ffc105]/10 text-white"
                            : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        {sku.variantName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedVariant ? (
              <div className="mb-8 rounded-[24px] border border-white/5 bg-zinc-950/70 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Selected Variant</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-zinc-300">
                  <span className="rounded-full border border-white/10 px-3 py-1">{selectedVariant.variantName}</span>
                  {selectedVariant.variantAttributes?.size ? (
                    <span className="rounded-full border border-white/10 px-3 py-1">Size: {selectedVariant.variantAttributes.size}</span>
                  ) : null}
                  {selectedVariant.variantAttributes?.type ? (
                    <span className="rounded-full border border-white/10 px-3 py-1">Type: {selectedVariant.variantAttributes.type}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mb-10 space-y-4">
              <p className="text-sm leading-relaxed text-zinc-400">{product.description_en}</p>
              <p className="border-t border-white/5 pt-4 text-right font-arabic text-md leading-relaxed text-zinc-500">
                {product.description_ar}
              </p>
            </div>

            <div className="mt-auto space-y-6">
              <button
                disabled={isOutOfStock || isUnavailable}
                onClick={handleAddToCart}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#ffc105] py-5 font-space-grotesk text-lg font-bold uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-95 disabled:grayscale disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10 transition-transform group-hover:translate-x-full" />
                <ShoppingBag size={20} />
                Add To Cart
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                  <Truck size={18} className="text-[#ffc105]" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">Fast Shipping Anywhere in Egypt</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 p-4">
                  <ShieldCheck size={18} className="text-[#ffc105]" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400">Secure COD Verification</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-zinc-900 bg-zinc-900/30 py-2">
              <Zap size={10} className="fill-[#ffc105] text-[#ffc105]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Authentic Tech Inventory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

