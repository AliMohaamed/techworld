"use client";

import type { Id } from "@backend/convex/_generated/dataModel";
import FeaturedProductCard from "./featured-product-card";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

type FeaturedProduct = {
  _id: Id<"products">;
  name_ar: string;
  name_en: string;
  selling_price: number;
  compareAtPrice?: number;
  display_stock?: number;
  images: string[];
  description_en?: string;
  slug?: string;
  skus?: Array<{
    _id: Id<"skus">;
    price: number;
    display_stock: number;
    isDefault?: boolean;
  }>;
  isFeatured?: boolean;
};

interface FeaturedProductsCarouselProps {
  products: FeaturedProduct[];
}

export function FeaturedProductsCarousel({ products }: FeaturedProductsCarouselProps) {
  return (
    <>
      <div className="md:hidden">
        <Swiper
          modules={[FreeMode]}
          spaceBetween={16}
          slidesPerView={1.2}
          freeMode={true}
          className="w-full !overflow-visible"
        >
          {products.map((product) => (
            <SwiperSlide key={product._id} className="h-auto">
              <FeaturedProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product) => (
          <FeaturedProductCard key={product._id} product={product} />
        ))}
      </div>
    </>
  );
}
