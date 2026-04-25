"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Thumbs, Pagination, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/thumbs";
import "swiper/css/pagination";

function uniqueImages(images: Array<string | undefined>) {
  return images.filter((image, index, array): image is string => Boolean(image) && array.indexOf(image) === index);
}

export function DynamicProductGallery({
  name,
  images,
  selectedImage,
  onSelectImage,
  statusLabel,
}: {
  name: string;
  images: string[];
  selectedImage?: string;
  onSelectImage?: (image: string) => void;
  statusLabel?: string;
}) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);

  // We only use the images array directly so the order NEVER changes.
  const galleryImages = uniqueImages(images);

  // Sync external selectedImage changes (like clicking a variant) with the swiper
  useEffect(() => {
    if (selectedImage && mainSwiper) {
      const index = galleryImages.indexOf(selectedImage);
      if (index !== -1 && mainSwiper.activeIndex !== index) {
        mainSwiper.slideTo(index);
      }
    }
  }, [selectedImage, mainSwiper, galleryImages]);

  return (
    <div className="space-y-4">
      {/* Main Swiper */}
      <div className="relative aspect-square overflow-hidden rounded-[28px] border border-border bg-card transition-colors">
        {galleryImages.length > 0 ? (
          <Swiper
            onSwiper={setMainSwiper}
            spaceBetween={10}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            modules={[FreeMode, Thumbs, Pagination]}
            className="h-full w-full"
            onSlideChange={(swiper) => {
              const newImage = galleryImages[swiper.activeIndex];
              if (newImage && onSelectImage) {
                onSelectImage(newImage);
              }
            }}
          >

            {galleryImages.map((image, index) => (
              <SwiperSlide key={`${image}-${index}`} className="relative h-full w-full">
                <Image
                  src={image}
                  alt={`${name} - Image ${index + 1}`}
                  fill
                  priority={index === 0}
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground/30 font-medium">
            No Image
          </div>
        )}

        {statusLabel ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-md pointer-events-none">
            <span className="rounded-full bg-destructive px-6 py-2 text-sm font-bold text-destructive-foreground uppercase">
              {statusLabel}
            </span>
          </div>
        ) : null}
      </div>

      {/* Thumbs Swiper */}
      {galleryImages.length > 1 ? (
        <div className="mt-4">
          <Swiper
            onSwiper={setThumbsSwiper}
            spaceBetween={12}
            slidesPerView="auto"
            freeMode={true}
            watchSlidesProgress={true}
            modules={[FreeMode, Navigation, Thumbs]}
            className="thumbs-swiper"
          >
            {galleryImages.map((image, index) => (
              <SwiperSlide key={`thumb-${image}-${index}`} className="!w-20 sm:!w-24">
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card transition shadow-sm cursor-pointer hover:border-foreground/20 [&.swiper-slide-thumb-active]:border-[#ffc105] [&.swiper-slide-thumb-active]:bg-[#ffc105]/10 opacity-60 [&.swiper-slide-thumb-active]:opacity-100">
                  <Image
                    src={image}
                    alt={`${name} thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      ) : null}
    </div>
  );
}
