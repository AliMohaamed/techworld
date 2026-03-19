"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { api } from "@backend/convex/_generated/api";

export function ConvexStorageUpload({
  imageIds,
  onChange,
}: {
  imageIds: string[];
  onChange: (imageIds: string[]) => void;
}) {
  const generateUploadUrl = useMutation(api.storage.generateCatalogUploadUrl);
  const [isUploading, setIsUploading] = useState(false);

  // M1 FIX: Resolve storage IDs to actual image preview URLs.
  const storageUrls = useQuery(
    api.storage.getStorageUrls,
    imageIds.length > 0 ? { storageIds: imageIds } : "skip",
  );

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

  return (
    <div className="space-y-3 rounded-[20px] border border-white/10 bg-black/30 p-4">
      <label className="block cursor-pointer rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-400 hover:border-white/20 transition-colors">
        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
          type="file"
        />
        <span className="flex items-center justify-center gap-2 text-white">
          <UploadCloud size={16} />
          {isUploading ? "Uploading images..." : "Upload product images"}
        </span>
        <span className="mt-2 block text-xs text-zinc-500">Files are stored directly in Convex Storage.</span>
      </label>

      {imageIds.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {imageIds.map((imageId, index) => {
            const previewUrl = storageUrls?.[imageId];
            return (
              <div
                key={imageId}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
              >
                {/* Image preview */}
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={`Uploaded image ${index + 1}`}
                    fill
                    className="object-cover transition-opacity duration-200"
                    sizes="120px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-700">
                    <UploadCloud size={18} />
                  </div>
                )}

                {/* Primary badge */}
                {index === 0 ? (
                  <div className="absolute left-1 top-1 rounded-full bg-[#ffc105] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                    Primary
                  </div>
                ) : null}

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onChange(imageIds.filter((id) => id !== imageId))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
