"use client";

import { useState, type ReactNode } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@techworld/ui";
import FeaturedProductCard from "./featured-product-card";
import type { FeaturedProduct } from "./featured-products";
import "swiper/css";
import "swiper/css/free-mode";

type Breakpoints = Record<number, { slidesPerView: number; spaceBetween?: number }>;

const DEFAULT_BREAKPOINTS: Breakpoints = {
  480: { slidesPerView: 1.7 },
  640: { slidesPerView: 2.2 },
  768: { slidesPerView: 2.6, spaceBetween: 20 },
  1024: { slidesPerView: 3.4, spaceBetween: 24 },
  1280: { slidesPerView: 4, spaceBetween: 24 },
};

interface ProductRailProps {
  products: FeaturedProduct[];
  /** Rendered on the start side of the header row, opposite the arrow controls. */
  header?: ReactNode;
  breakpoints?: Breakpoints;
  /** Tone of the arrow buttons: "dark" for rails placed on an always-dark stage. */
  tone?: "default" | "dark";
  className?: string;
}

/** Swipeable product row with desktop arrow controls, used by the landing-page sections. */
export function ProductRail({
  products,
  header,
  breakpoints = DEFAULT_BREAKPOINTS,
  tone = "default",
  className,
}: ProductRailProps) {
  const t = useTranslations("ProductRail");
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const syncEdges = (instance: SwiperInstance) =>
    setEdges({ start: instance.isBeginning, end: instance.isEnd });

  const buttonClass = cn(
    "grid h-11 w-11 place-items-center rounded-full border transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-30",
    tone === "dark"
      ? "border-white/15 bg-white/5 text-white hover:border-primary hover:bg-primary hover:text-primary-foreground"
      : "border-border bg-card text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground",
  );
  const showControls = !(edges.start && edges.end);

  return (
    <div className={cn("space-y-6", className)}>
      {header || showControls ? (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">{header}</div>
          {showControls ? (
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => swiper?.slidePrev()}
                disabled={edges.start}
                aria-label={t("previous")}
                className={buttonClass}
              >
                <ChevronLeft size={18} className="rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => swiper?.slideNext()}
                disabled={edges.end}
                aria-label={t("next")}
                className={buttonClass}
              >
                <ChevronRight size={18} className="rtl:rotate-180" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <Swiper
        modules={[FreeMode]}
        spaceBetween={14}
        slidesPerView={1.25}
        breakpoints={breakpoints}
        freeMode={{ enabled: true, sticky: true }}
        onSwiper={(instance) => {
          setSwiper(instance);
          syncEdges(instance);
        }}
        onSlideChange={syncEdges}
        onProgress={syncEdges}
        onResize={syncEdges}
        className="w-full !overflow-visible md:!overflow-hidden"
      >
        {products.map((product) => (
          <SwiperSlide key={product._id} className="!h-auto pb-2 pt-1">
            <FeaturedProductCard product={product} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
