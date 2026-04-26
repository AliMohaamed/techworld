"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { api } from "@backend/convex/_generated/api";
import { cn } from "@techworld/ui";

export function ConvexStorageUpload({
  imageIds,
  storageUrls,
  onChange,
}: {
  imageIds: string[];
  storageUrls?: Record<string, string | null>;
  onChange: (imageIds: string[]) => void;
}) {
  const generateUploadUrl = useMutation(api.storage.generateCatalogUploadUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    try {
      const uploadedIds: string[] = [];
      for (const file of Array.from(files)) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}.`);
        }

        const payload = (await response.json()) as { storageId: string };
        uploadedIds.push(payload.storageId);
      }

      onChange([...imageIds, ...uploadedIds]);
    } finally {
      setIsUploading(false);
    }
  };

  const setAsPrimary = (id: string) => {
    const nextImages = [id, ...imageIds.filter((imgId) => imgId !== id)];
    onChange(nextImages);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#ffc105]/20 focus-within:border-[#ffc105]/40">
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border/60 bg-accent/20 px-6 py-10 text-center transition-all hover:border-[#ffc105]/30 hover:bg-[#ffc105]/5 group">
        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          type="file"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#ffc105]/10 flex items-center justify-center text-[#ffc105] shadow-sm transform transition-transform group-hover:scale-110 group-hover:rotate-3">
            <UploadCloud size={24} />
          </div>
          <span className="text-sm font-black uppercase tracking-widest text-foreground group-hover:text-[#ffc105] transition-colors">
            {isUploading ? "Uploading images..." : "Upload product images"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
            JPG, PNG, WebP • Convex Edge Storage
          </span>
        </div>
      </label>

      {imageIds.length > 0 ? (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 pt-2">
          {imageIds.map((imageId, index) => {
            const previewUrl = storageUrls?.[imageId];
            const isPrimary = index === 0;

            return (
              <div
                key={imageId}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-2xl border bg-accent transition-all hover:scale-105 hover: ",
                  isPrimary
                    ? "border-[#ffc105] ring-2 ring-[#ffc105]/20"
                    : "border-border hover:border-[#ffc105]/30",
                )}
              >
                {/* Image preview */}
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={`Uploaded image ${index + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="120px"
                    priority={index === 0}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/10">
                    <UploadCloud size={20} className="animate-pulse" />
                  </div>
                )}

                {/* Primary badge/button */}
                {isPrimary ? (
                  <div className="absolute left-1.5 top-1.5 rounded-full bg-[#ffc105] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-black shadow-sm">
                    Primary
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAsPrimary(imageId)}
                    className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-background/80 text-foreground opacity-0 backdrop-blur transition-all hover:bg-[#ffc105] hover:text-black group-hover:opacity-100"
                    title="Set as primary"
                  >
                    <UploadCloud size={10} className="rotate-180" />
                  </button>
                )}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() =>
                    onChange(imageIds.filter((id) => id !== imageId))
                  }
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-destructive-foreground opacity-0 transition-all hover:scale-110 group-hover:opacity-100 shadow-sm"
                  aria-label="Remove image"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
