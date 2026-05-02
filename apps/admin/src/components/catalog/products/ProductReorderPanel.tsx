"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Button, cn } from "@techworld/ui";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useTranslations, useLocale } from "next-intl";
import { GripVertical, Save, Loader2, Wand2 } from "lucide-react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ReorderProduct = {
  _id: Id<"products">;
  name_en: string;
  name_ar: string;
  selling_price: number;
  status: "DRAFT" | "PUBLISHED";
  sort_order?: number;
  categoryName: string;
};

function SortableProductRow({
  product,
  index,
  locale,
}: {
  product: ReorderProduct;
  index: number;
  locale: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product._id });

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
        "flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 transition-all cursor-grab active:cursor-grabbing",
        isDragging
          ? "border-[#ffc105] shadow-2xl scale-[1.02] opacity-90 ring-2 ring-[#ffc105]/30"
          : "border-border hover:border-[#ffc105]/30 hover:shadow-sm"
      )}
    >
      {/* Position Badge */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ffc105]/10 text-sm font-bold text-[#ffc105]">
        {index + 1}
      </div>

      {/* Grip Handle */}
      <GripVertical
        size={18}
        className="shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60"
      />

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">
          {product.name_en}
        </p>
        <p className="text-xs text-muted-foreground/50 mt-0.5 truncate" dir="rtl">
          {product.name_ar}
        </p>
      </div>

      {/* Category */}
      <span className="hidden sm:inline-flex text-xs font-bold text-muted-foreground/40 bg-accent/50 px-3 py-1 rounded-full">
        {product.categoryName}
      </span>

      {/* Price */}
      <span className="text-sm font-bold text-foreground whitespace-nowrap">
        EGP {product.selling_price.toLocaleString(locale)}
      </span>

      {/* Status */}
      <span
        className={cn(
          "hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
          product.status === "PUBLISHED"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
            : "border-border bg-background text-muted-foreground/30"
        )}
      >
        <div
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            product.status === "PUBLISHED"
              ? "bg-emerald-500"
              : "bg-muted-foreground/30"
          )}
        />
        {product.status}
      </span>
    </div>
  );
}

export function ProductReorderPanel({
  products,
}: {
  products: ReorderProduct[];
}) {
  const t = useTranslations("Catalog.products.reorder");
  const locale = useLocale();
  const reorderProducts = useMutation(api.products.reorderProducts);
  const initializeSortOrder = useMutation(api.products.initializeSortOrder);

  const [orderedProducts, setOrderedProducts] = useState<ReorderProduct[]>(products);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when products prop changes (but only if no pending changes)
  const [lastProductIds, setLastProductIds] = useState(
    products.map((p) => p._id).join(",")
  );
  const currentIds = products.map((p) => p._id).join(",");
  if (currentIds !== lastProductIds && !hasChanges) {
    setOrderedProducts(products);
    setLastProductIds(currentIds);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedProducts.findIndex((p) => p._id === active.id);
      const newIndex = orderedProducts.findIndex((p) => p._id === over.id);
      setOrderedProducts(arrayMove(orderedProducts, oldIndex, newIndex));
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = orderedProducts.map((product, index) => ({
        id: product._id,
        sort_order: index + 1,
      }));
      await reorderProducts({ updates });
      toast.success(t("saved"));
      setHasChanges(false);
    } catch (error) {
      toast.error(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeSortOrder({});
      toast.success(t("initSuccess"));
    } catch (error) {
      toast.error(t("initFailed"));
    } finally {
      setIsInitializing(false);
    }
  };

  const needsInit = products.some((p) => p.sort_order === undefined || p.sort_order === null);

  return (
    <section className="overflow-hidden rounded-[40px] border border-border bg-card transition-all">
      <div className="border-b border-border bg-accent/30 px-10 py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-6 w-1 bg-[#ffc105] rounded-full" />
          <div>
            <p className="text-xs font-bold text-muted-foreground/60">
              {t("badge")}
            </p>
            <h2 className="text-2xl font-bold text-foreground mt-1">
              {t("title")}
            </h2>
            <p className="text-sm font-medium text-muted-foreground/50 mt-1 max-w-xl">
              {t("description")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {needsInit && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleInitialize()}
              disabled={isInitializing}
              className="rounded-2xl h-11 px-6 text-xs font-bold border-border hover:border-[#ffc105]/30 transition-all"
            >
              {isInitializing ? (
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              ) : (
                <Wand2 className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              )}
              {t("initOrder")}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
            className={cn(
              "rounded-2xl h-11 px-8 text-sm font-bold transition-all",
              hasChanges
                ? "bg-[#ffc105] text-black hover:bg-[#ffc105]/90 shadow-lg shadow-[#ffc105]/20"
                : "bg-foreground/10 text-foreground/30"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
            ) : (
              <Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            )}
            {isSaving ? t("saving") : t("saveOrder")}
          </Button>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedProducts.map((p) => p._id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {orderedProducts.map((product, index) => (
                <SortableProductRow
                  key={product._id}
                  product={product}
                  index={index}
                  locale={locale}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </section>
  );
}
