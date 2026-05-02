"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { UploadCloud, X, GripVertical } from "lucide-react";
import Image from "next/image";
import { api } from "@backend/convex/_generated/api";
import { cn } from "@techworld/ui";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableItemProps {
  imageId: string;
  index: number;
  isPrimary: boolean;
  previewUrl?: string | null;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}

function SortableItem({
  imageId,
  index,
  isPrimary,
  previewUrl,
  onRemove,
  onSetPrimary,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: imageId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-2xl border bg-accent transition-all cursor-grab active:cursor-grabbing",
        isPrimary
          ? "border-[#ffc105] ring-2 ring-[#ffc105]/20"
          : "border-border hover:border-[#ffc105]/30",
        isDragging && "opacity-50 scale-105 shadow-2xl z-50"
      )}
    >
      {/* Image preview */}
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt={`Uploaded image ${index + 1}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="150px"
          priority={index === 0}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground/10">
          <UploadCloud size={20} className="animate-pulse" />
        </div>
      )}

      {/* Index badge - Always visible now */}
      <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm shadow-sm transition-all group-hover:bg-black/80">
        #{index + 1}
      </div>

      {/* Primary badge/button */}
      {isPrimary ? (
        <div className="absolute left-1.5 top-1.5 rounded-full bg-[#ffc105] px-3 py-1 text-[10px] font-bold text-black shadow-sm z-10">
          Primary
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary(imageId);
          }}
          className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-background/80 text-foreground opacity-0 backdrop-blur transition-all hover:bg-[#ffc105] hover:text-black group-hover:opacity-100 z-10"
          title="Set as primary"
        >
          <UploadCloud size={10} className="rotate-180" />
        </button>
      )}

      {/* Remove button */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(imageId);
        }}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-destructive text-destructive-foreground opacity-0 transition-all hover:scale-110 group-hover:opacity-100 shadow-sm z-10"
        aria-label="Remove image"
      >
        <X size={12} strokeWidth={3} />
      </button>
    </div>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
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
        if (!response.ok) throw new Error(`Upload failed for ${file.name}.`);
        const payload = (await response.json()) as { storageId: string };
        uploadedIds.push(payload.storageId);
      }
      onChange([...imageIds, ...uploadedIds].filter((id) => id && id.trim() !== ""));
    } finally {
      setIsUploading(false);
    }
  };

  const setAsPrimary = (id: string) => {
    const nextImages = [
      id,
      ...imageIds.filter((imgId) => imgId !== id && imgId && imgId.trim() !== ""),
    ];
    onChange(nextImages);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = imageIds.indexOf(active.id as string);
      const newIndex = imageIds.indexOf(over.id as string);
      onChange(arrayMove(imageIds, oldIndex, newIndex));
    }
  };

  const activeImageIds = imageIds.filter((id) => id && id.trim() !== "");

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
          <span className="text-sm font-bold text-foreground group-hover:text-[#ffc105] transition-colors">
            {isUploading ? "Uploading images..." : "Upload product images"}
          </span>
          <span className="text-xs font-medium text-muted-foreground/50">
            JPG, PNG, WebP • Convex Edge Storage
          </span>
        </div>
      </label>

      {activeImageIds.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={activeImageIds}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 pt-2">
              {activeImageIds.map((imageId, index) => (
                <SortableItem
                  key={imageId}
                  imageId={imageId}
                  index={index}
                  isPrimary={index === 0}
                  previewUrl={storageUrls?.[imageId]}
                  onRemove={(id) => onChange(imageIds.filter((imgId) => imgId !== id))}
                  onSetPrimary={setAsPrimary}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

