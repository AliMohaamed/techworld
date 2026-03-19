"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { UploadCloud } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import { Button } from "@techworld/ui/button";

export function ConvexStorageUpload({
  imageIds,
  onChange,
}: {
  imageIds: string[];
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

  return (
    <div className="space-y-3 rounded-[20px] border border-white/10 bg-black/30 p-4">
      <label className="block cursor-pointer rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-400">
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
      <div className="flex flex-wrap gap-2">
        {imageIds.map((imageId, index) => (
          <div key={imageId} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
            <span>{index === 0 ? `Primary: ${imageId}` : imageId}</span>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => onChange(imageIds.filter((currentId) => currentId !== imageId))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
