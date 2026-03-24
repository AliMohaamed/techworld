"use client";

import Image from "next/image";
import Link from "next/link";

interface RelatedSku {
  _id: string;
  price: number;
  compareAtPrice?: number;
  isDefault?: boolean;
}

interface RelatedProduct {
  _id: string;
  name_en: string;
  slug?: string;
  thumbnail?: string;
  skus: RelatedSku[];
}

interface RelatedProductsProps {
  products: RelatedProduct[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-12 border-t border-white/5">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-white uppercase">
            COMPLETE THE <span className="text-primary">LOOK</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Frequently bought together with this item</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product) => {
          const mainSku = product.skus.find((s: RelatedSku) => s.isDefault) || product.skus[0];
          const hasDiscount = mainSku?.compareAtPrice && mainSku.compareAtPrice > mainSku.price;

          return (
            <Link
              key={product._id}
              href={`/products/${product.slug}` as any}
              className="group flex flex-col space-y-3"
            >
              <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/5 bg-zinc-900 shadow-xl transition-all group-hover:border-primary/30">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.name_en}
                    fill
                    priority={true}
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-800">
                    No Image
                  </div>
                )}
                
                {hasDiscount && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                    Sale
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-bold uppercase tracking-widest">View Product</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-space-grotesk text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                  {product.name_en}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-space-grotesk text-sm font-bold text-primary">
                    {mainSku?.price.toLocaleString()} EGP
                  </span>
                  {hasDiscount && (
                    <span className="font-space-grotesk text-[10px] text-zinc-500 line-through">
                      {mainSku.compareAtPrice!.toLocaleString()} EGP
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
