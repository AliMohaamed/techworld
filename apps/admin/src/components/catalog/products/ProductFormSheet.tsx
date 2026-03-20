"use client";

import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { Button } from "@techworld/ui/button";
import { ConvexStorageUpload } from "./ConvexStorageUpload";
import { productSchema, type ProductFormSubmitValues, type ProductFormValues } from "./product-zod-schemas";

type CategoryOption = {
  _id: Id<"categories">;
  name_en: string;
};

type ProductRecord = {
  _id: Id<"products">;
  categoryId: Id<"categories">;
  name_en: string;
  name_ar: string;
  slug?: string;
  description_en?: string;
  description_ar?: string;
  selling_price: number;
  compareAtPrice?: number;
  cogs?: number;
  status: "DRAFT" | "PUBLISHED";
  thumbnail?: string;
  images: string[];
  skus?: Array<{
    _id: Id<"skus">;
    variantName: string;
    variantAttributes?: { color?: string; size?: string; type?: string };
    real_stock: number;
    display_stock: number;
    price: number;
    compareAtPrice?: number;
    linkedImageId?: string;
    isDefault?: boolean;
  }>;
};

const emptyVariant = {
  variantName: "Default",
  color: "",
  size: "",
  type: "",
  real_stock: 0,
  display_stock: 0,
  price: 0,
  compareAtPrice: undefined,
  linkedImageId: "",
  isDefault: true,
};

const emptyValues: ProductFormValues = {
  categoryId: "",
  name_en: "",
  name_ar: "",
  slug: "",
  description_en: "",
  description_ar: "",
  selling_price: 0,
  compareAtPrice: undefined,
  cogs: undefined,
  thumbnail: "",
  images: [],
  status: "DRAFT",
  variants: [emptyVariant],
};

export function ProductFormSheet({
  open,
  onClose,
  categories,
  product,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryOption[];
  product: ProductRecord | null;
  onSaved: (label: string) => void;
}) {
  const createAdvancedProduct = useMutation(api.products.createAdvancedProduct);
  const updateAdvancedProduct = useMutation(api.products.updateAdvancedProduct);
  const {
    control,
    register,
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: emptyValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const images = useWatch({ control, name: "images" }) ?? [];

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!product) {
      reset(emptyValues);
      return;
    }

    reset({
      categoryId: product.categoryId,
      name_en: product.name_en,
      name_ar: product.name_ar,
      slug: product.slug ?? "",
      description_en: product.description_en ?? "",
      description_ar: product.description_ar ?? "",
      selling_price: product.selling_price,
      compareAtPrice: product.compareAtPrice,
      cogs: product.cogs,
      thumbnail: product.thumbnail ?? product.images[0] ?? "",
      images: product.images,
      status: product.status,
      variants:
        product.skus && product.skus.length > 0
          ? product.skus.map((sku, index) => ({
              id: sku._id,
              variantName: sku.variantName,
              color: sku.variantAttributes?.color ?? "",
              size: sku.variantAttributes?.size ?? "",
              type: sku.variantAttributes?.type ?? "",
              real_stock: sku.real_stock,
              display_stock: sku.display_stock,
              price: sku.price,
              compareAtPrice: sku.compareAtPrice,
              linkedImageId: sku.linkedImageId ?? "",
              isDefault: sku.isDefault ?? index === 0,
            }))
          : [emptyVariant],
    });
  }, [open, product, reset]);

  const submit = handleSubmit(async (values) => {
    // zodResolver ensures values are already validated at this point.
    const payload = buildPayload(values as ProductFormSubmitValues);

    if (product) {
      await updateAdvancedProduct({ id: product._id, ...payload });
      onSaved("Product updated.");
    } else {
      await createAdvancedProduct(payload);
      onSaved("Product created.");
    }

    onClose();
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]">
      <div className="absolute inset-x-0 bottom-0 top-6 w-full overflow-y-auto rounded-t-[32px] border border-white/10 bg-[#0b0b0b] p-4 shadow-2xl shadow-black/40 sm:inset-y-0 sm:left-auto sm:right-0 sm:max-w-4xl sm:rounded-none sm:border-l sm:border-t-0 sm:p-6">
        <div className="sticky top-0 z-10 -mx-4 mb-6 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0b0b0b]/95 px-4 pb-4 pt-1 backdrop-blur sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Product Sheet</p>
            <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              {product ? "Edit advanced product" : "Create advanced product"}
            </h2>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>

        <form className="space-y-8 pb-24 sm:pb-8" onSubmit={(event) => void submit(event)}>
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Category" error={errors.categoryId?.message}>
              <select className="field" {...register("categoryId")}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name_en}</option>
                ))}
              </select>
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <select className="field" {...register("status")}>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </Field>
            <Field label="English name" error={errors.name_en?.message}>
              <input className="field" {...register("name_en")} />
            </Field>
            <Field label="Arabic name" error={errors.name_ar?.message}>
              <input className="field" dir="rtl" {...register("name_ar")} />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              <input className="field" {...register("slug")} />
            </Field>
            <Field label="Selling price" error={errors.selling_price?.message}>
              <input className="field" type="number" step="0.01" {...register("selling_price")} />
            </Field>
            <Field label="Compare-at price" error={errors.compareAtPrice?.message?.toString()}>
              <input className="field" type="number" step="0.01" {...register("compareAtPrice")} />
            </Field>
            <Field label="COGS" error={errors.cogs?.message?.toString()}>
              <input className="field" type="number" step="0.01" {...register("cogs")} />
            </Field>
            <Field label="English description" error={errors.description_en?.message} className="md:col-span-2">
              <textarea className="field min-h-24" {...register("description_en")} />
            </Field>
            <Field label="Arabic description" error={errors.description_ar?.message} className="md:col-span-2">
              <textarea className="field min-h-24" dir="rtl" {...register("description_ar")} />
            </Field>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Media Gallery</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Upload and assign storage images</h3>
            </div>
            <ConvexStorageUpload
              imageIds={images}
              onChange={(nextImages) => {
                setValue("images", nextImages, { shouldValidate: true });
                if (!getValues("thumbnail") && nextImages[0]) {
                  setValue("thumbnail", nextImages[0]);
                }
              }}
            />
            <Field label="Primary thumbnail storage ID" error={errors.thumbnail?.message}>
              <select className="field" {...register("thumbnail")}>
                <option value="">Select primary image</option>
                {images.map((imageId) => (
                  <option key={imageId} value={imageId}>{imageId}</option>
                ))}
              </select>
            </Field>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Variants</p>
                <h3 className="mt-2 text-xl font-semibold text-white">SKU configuration</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({
                    ...emptyVariant,
                    variantName: `Variant ${fields.length + 1}`,
                    isDefault: false,
                    price: getValues("selling_price") || 0,
                  })
                }
              >
                <Plus size={16} />
                Add Variant
              </Button>
            </div>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-[24px] border border-white/10 bg-black/30 p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-white">Variant {index + 1}</p>
                    {fields.length > 1 ? (
                      <Button type="button" variant="ghost" onClick={() => remove(index)}>
                        <Trash2 size={16} />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Variant name" error={errors.variants?.[index]?.variantName?.message}>
                      <input className="field" {...register(`variants.${index}.variantName`)} />
                    </Field>
                    <Field label="Color" error={errors.variants?.[index]?.color?.message}>
                      <input className="field" {...register(`variants.${index}.color`)} />
                    </Field>
                    <Field label="Size" error={errors.variants?.[index]?.size?.message}>
                      <input className="field" {...register(`variants.${index}.size`)} />
                    </Field>
                    <Field label="Type" error={errors.variants?.[index]?.type?.message}>
                      <input className="field" {...register(`variants.${index}.type`)} />
                    </Field>
                    <Field label="Real stock" error={errors.variants?.[index]?.real_stock?.message}>
                      <input className="field" type="number" {...register(`variants.${index}.real_stock`)} />
                    </Field>
                    <Field label="Display stock" error={errors.variants?.[index]?.display_stock?.message}>
                      <input className="field" type="number" {...register(`variants.${index}.display_stock`)} />
                    </Field>
                    <Field label="Variant price" error={errors.variants?.[index]?.price?.message}>
                      <input className="field" type="number" step="0.01" {...register(`variants.${index}.price`)} />
                    </Field>
                    <Field label="Variant compare-at" error={errors.variants?.[index]?.compareAtPrice?.message?.toString()}>
                      <input className="field" type="number" step="0.01" {...register(`variants.${index}.compareAtPrice`)} />
                    </Field>
                    <Field label="Linked image" error={errors.variants?.[index]?.linkedImageId?.message}>
                      <select className="field" {...register(`variants.${index}.linkedImageId`)}>
                        <option value="">No linked image</option>
                        {images.map((imageId) => (
                          <option key={imageId} value={imageId}>{imageId}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-white/10 bg-[#0b0b0b]/95 px-4 pb-2 pt-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-0">
            <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : product ? "Update Product" : "Create Product"}
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 text-sm text-zinc-200 ${className ?? ""}`}>
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </label>
  );
}

function buildPayload(values: ProductFormSubmitValues) {
  return {
    categoryId: values.categoryId as Id<"categories">,
    name_en: values.name_en,
    name_ar: values.name_ar,
    slug: values.slug,
    description_en: values.description_en || undefined,
    description_ar: values.description_ar || undefined,
    selling_price: values.selling_price,
    compareAtPrice: values.compareAtPrice,
    cogs: values.cogs,
    thumbnail: values.thumbnail || values.images[0],
    images: values.images,
    status: values.status,
    variants: values.variants.map((variant, index) => ({
      id: variant.id as Id<"skus"> | undefined,
      variantName: variant.variantName,
      variantAttributes: {
        color: variant.color || undefined,
        size: variant.size || undefined,
        type: variant.type || undefined,
      },
      real_stock: variant.real_stock,
      display_stock: variant.display_stock,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      linkedImageId: variant.linkedImageId || undefined,
      isDefault: variant.isDefault || index === 0,
    })),
  };
}







