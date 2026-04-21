"use client";

import Image from "next/image";

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
  const galleryImages = uniqueImages([selectedImage, ...images]);
  const activeImage = galleryImages[0];

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-[28px] border border-border bg-card transition-colors">
        {activeImage ? (
          <Image
            src={activeImage}
            alt={name}
            fill
            priority
            className="object-contain p-4 transition-opacity duration-200"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm uppercase tracking-[0.3em] text-muted-foreground/30">
            No Image
          </div>
        )}

        {statusLabel ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-md">
            <span className="rounded-full bg-destructive px-6 py-2 text-sm font-bold uppercase tracking-widest text-destructive-foreground">
              {statusLabel}
            </span>
          </div>
        ) : null}
      </div>

      {galleryImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {galleryImages.map((image) => {
            const isActive = image === activeImage;
            return (
              <button
                key={image}
                type="button"
                onClick={() => onSelectImage?.(image)}
                className={`relative aspect-square overflow-hidden rounded-2xl border transition shadow-sm ${
                  isActive
                    ? "border-[#ffc105] bg-[#ffc105]/10"
                    : "border-border bg-card hover:border-foreground/20"
                }`}
              >
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  sizes="120px"
                  priority={true}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
