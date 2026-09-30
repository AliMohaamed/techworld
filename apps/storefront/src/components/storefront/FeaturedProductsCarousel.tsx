"use client";

import FeaturedProductCard from "./featured-product-card";
import type { FeaturedProduct } from "./featured-products";
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

interface FeaturedProductsCarouselProps {
  products: FeaturedProduct[];
}

export function FeaturedProductsCarousel({ products }: FeaturedProductsCarouselProps) {
  return (
    <>
      <div className="md:hidden">
        <Swiper
          modules={[FreeMode]}
          spaceBetween={14}
          slidesPerView={1.25}
          breakpoints={{ 480: { slidesPerView: 1.7 }, 640: { slidesPerView: 2.2 } }}
          freeMode={true}
          className="w-full !overflow-visible"
        >
          {products.map((product) => (
            <SwiperSlide key={product._id} className="!h-auto">
              <FeaturedProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <FeaturedProductCard key={product._id} product={product} />
        ))}
      </div>
    </>
  );
}
