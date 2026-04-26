"use client";

import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';
import { Link } from "@/navigation";
import { ArrowUpRight, Cpu, MousePointer2, Headphones } from "lucide-react";

interface CategorySwiperProps {
  categories: any[];
  locale: string;
}

export function CategorySwiper({ categories, locale }: CategorySwiperProps) {
  const getCategoryIcon = (slug: string) => {
    switch (slug?.toLowerCase()) {
      case "hardware": return <Cpu size={24} />;
      case "peripheral":
      case "mice": return <MousePointer2 size={24} />;
      case "audio": return <Headphones size={24} />;
      default: return <Cpu size={24} />;
    }
  };
  return (
    <div className="md:hidden">
      <Swiper
        modules={[FreeMode]}
        spaceBetween={16}
        slidesPerView={1.15}
        freeMode={true}
        className="w-full !overflow-visible"
      >
        {categories.map((category) => (
          <SwiperSlide key={category._id}>
            <Link
              href={`/categories/${category.slug || category._id}`}
              className="group relative h-[320px] overflow-hidden rounded-[24px] bg-card border border-border p-8 flex flex-col justify-between hover:border-[#ffc105]/40 transition-all   hover:shadow-[#ffc105]/5"
            >
              <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center text-[#ffc105] group-hover:scale-110 transition-transform">
                {getCategoryIcon(category.slug)}
              </div>

              <div className="space-y-1">
                <h3 className="font-space-grotesk text-2xl font-bold text-foreground tracking-tight group-hover:text-[#ffc105] transition-colors line-clamp-1">
                  {locale === 'en' ? category.name_en : category.name_ar}
                </h3>
                <p className="text-muted-foreground/60 text-xs font-medium leading-relaxed">
                  {category.slug.replace('-', ' ')}
                </p>
              </div>

              {/* Decorative Arrow */}
              <div className="absolute top-8 right-8 h-10 w-10 rounded-full border border-border flex items-center justify-center text-foreground opacity-100 transition-all bg-accent">
                <ArrowUpRight size={18} />
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
