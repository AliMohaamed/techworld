"use client";

import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp } from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import {
  Button,
  Input,
  Label,
  SelectNative,
  Textarea,
  cn,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@techworld/ui";
import { ConvexStorageUpload } from "./ConvexStorageUpload";
import { productSchema, type ProductFormSubmitValues, type ProductFormValues } from "./product-zod-schemas";
import { useTranslations } from "next-intl";

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
  const t = useTranslations('Catalog.products');
  const createAdvancedProduct = useMutation(api.products.createAdvancedProduct);
  const updateAdvancedProduct = useMutation(api.products.updateAdvancedProduct);
  const restockItem = useMutation(api.skus.restockItem);
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

  const handleRestock = async (index: number) => {
    const variant = getValues(`variants.${index}`);
    if (!variant.id) {
      toast.error(t('messages.saveFirst'));
      return;
    }

    const amount = prompt(t('messages.restockPrompt', { name: variant.variantName }), "0");
    const quantity = parseInt(amount || "0", 10);

    if (isNaN(quantity) || quantity <= 0) {
      if (amount !== null) toast.error(t('messages.restockInvalid'));
      return;
    }

    try {
      const result = await restockItem({ skuId: variant.id as Id<"skus">, quantity });
      toast.success(t('messages.restockSuccess', { quantity, total: result.real_stock }));
      // Update form state to reflect new stock
      setValue(`variants.${index}.real_stock`, result.real_stock);
    } catch (error) {
      toast.error(t('messages.restockFailed'), { description: error instanceof Error ? error.message : t('messages.restockFailed') });
    }
  };

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
    const parsed = productSchema.safeParse(values);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Product form is invalid.");
    }

    const payload = buildPayload(parsed.data);

    if (product) {
      await updateAdvancedProduct({ id: product._id, ...payload });
      onSaved(t('messages.updated'));
    } else {
      await createAdvancedProduct(payload);
      onSaved(t('messages.created'));
    }

    onClose();
  });

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="sm:max-w-4xl overflow-y-auto p-0 border-l border-white/10 dark:bg-[#0a0a0a]">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-2xl font-bold text-white uppercase tracking-tight">
            {product ? t('form.editTitle') : t('form.createTitle')}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 uppercase tracking-[0.2em] text-[10px]">
            {t('form.badge')}
          </SheetDescription>
        </SheetHeader>

        <form className="p-6 space-y-8 pb-24" onSubmit={(event) => void submit(event)}>
          <section className="grid gap-4 md:grid-cols-2">
            <Field label={t('form.fields.category')} error={errors.categoryId?.message}>
              <SelectNative {...register("categoryId")}>
                <option value="">{t('form.placeholders.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name_en}</option>
                ))}
              </SelectNative>
            </Field>
            <Field label={t('form.fields.status')} error={errors.status?.message}>
              <SelectNative {...register("status")}>
                <option value="DRAFT">{t('form.statusOptions.draft')}</option>
                <option value="PUBLISHED">{t('form.statusOptions.published')}</option>
              </SelectNative>
            </Field>
            <Field label={t('form.fields.nameEn')} error={errors.name_en?.message}>
              <Input {...register("name_en")} placeholder={t('form.placeholders.nameEn')} />
            </Field>
            <Field label={t('form.fields.nameAr')} error={errors.name_ar?.message}>
              <Input dir="rtl" {...register("name_ar")} placeholder={t('form.placeholders.nameAr')} />
            </Field>
            <Field label={t('form.fields.slug')} error={errors.slug?.message}>
              <Input {...register("slug")} placeholder={t('form.placeholders.slug')} />
            </Field>
            <Field label={t('form.fields.sellingPrice')} error={errors.selling_price?.message}>
              <Input type="number" step="0.01" {...register("selling_price")} placeholder="0.00" />
            </Field>
            <Field label={t('form.fields.compareAtPrice')} error={errors.compareAtPrice?.message?.toString()}>
              <Input type="number" step="0.01" {...register("compareAtPrice")} placeholder="0.00" />
            </Field>
            <Field label={t('form.fields.cogs')} error={errors.cogs?.message?.toString()}>
              <Input type="number" step="0.01" {...register("cogs")} placeholder="0.00" />
            </Field>
            <Field label={t('form.fields.descriptionEn')} error={errors.description_en?.message} className="md:col-span-2">
              <Textarea {...register("description_en")} placeholder={t('form.placeholders.descriptionEn')} />
            </Field>
            <Field label={t('form.fields.descriptionAr')} error={errors.description_ar?.message} className="md:col-span-2">
              <Textarea dir="rtl" {...register("description_ar")} placeholder={t('form.placeholders.descriptionAr')} />
            </Field>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('form.fields.mediaGalleryTitle')}</p>
              <h3 className="mt-2 text-xl font-semibold text-white uppercase tracking-tight">{t('form.fields.mediaGalleryDescription')}</h3>
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
            <Field label={t('form.fields.thumbnail')} error={errors.thumbnail?.message}>
              <SelectNative {...register("thumbnail")}>
                <option value="">{t('form.placeholders.selectThumbnail')}</option>
                {images.map((imageId) => (
                  <option key={imageId} value={imageId}>{imageId}</option>
                ))}
              </SelectNative>
            </Field>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">{t('form.fields.variants')}</p>
                <h3 className="mt-2 text-xl font-semibold text-white uppercase tracking-tight">{t('form.fields.skuConfig')}</h3>
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
                {t('form.fields.skus.add')}
              </Button>
            </div>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-[24px] border border-white/10 bg-[#2a261f] p-5 transition-all outline-none hover:border-white/20 focus:border-[#ffc105] focus:ring-1 focus:ring-[#ffc105]/50">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-white">{t('form.fields.variant', { index: index + 1 })}</p>
                    {fields.length > 1 ? (
                      <Button type="button" variant="ghost" onClick={() => remove(index)}>
                        <Trash2 size={16} />
                        {t('buttons.remove')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label={t('form.fields.skus.name')} error={errors.variants?.[index]?.variantName?.message}>
                      <Input {...register(`variants.${index}.variantName`)} placeholder={t('form.placeholders.variantName')} />
                    </Field>
                    <Field label={t('form.fields.skus.color')} error={errors.variants?.[index]?.color?.message}>
                      <Input {...register(`variants.${index}.color`)} placeholder={t('form.placeholders.color')} />
                    </Field>
                    <Field label={t('form.fields.skus.size')} error={errors.variants?.[index]?.size?.message}>
                      <Input {...register(`variants.${index}.size`)} placeholder={t('form.placeholders.size')} />
                    </Field>
                    <Field label={t('form.fields.skus.type')} error={errors.variants?.[index]?.type?.message}>
                      <Input {...register(`variants.${index}.type`)} placeholder={t('form.placeholders.type')} />
                    </Field>
                    <Field label={t('form.fields.skus.realStock')} error={errors.variants?.[index]?.real_stock?.message}>
                      <div className="flex gap-2">
                        <Input type="number" {...register(`variants.${index}.real_stock`)} placeholder="0" />
                        <Button
                          className="h-12 w-12 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white shrink-0"
                          type="button"
                          variant="outline"
                          onClick={() => void handleRestock(index)}
                          title="Ad-hoc restock from returns or new shipments"
                        >
                          <TrendingUp size={16} />
                        </Button>
                      </div>
                    </Field>
                    <Field label={t('form.fields.skus.displayStock')} error={errors.variants?.[index]?.display_stock?.message}>
                      <Input type="number" {...register(`variants.${index}.display_stock`)} placeholder="0" />
                    </Field>
                    <Field label={t('form.fields.skus.price')} error={errors.variants?.[index]?.price?.message}>
                      <Input type="number" step="0.01" {...register(`variants.${index}.price`)} placeholder="0.00" />
                    </Field>
                    <Field label={t('form.fields.skus.compareAt')} error={errors.variants?.[index]?.compareAtPrice?.message?.toString()}>
                      <Input type="number" step="0.01" {...register(`variants.${index}.compareAtPrice`)} placeholder="0.00" />
                    </Field>
                    <Field label={t('form.fields.skus.linkedImage')} error={errors.variants?.[index]?.linkedImageId?.message}>
                      <SelectNative {...register(`variants.${index}.linkedImageId`)}>
                        <option value="">{t('form.placeholders.noLinkedImage')}</option>
                        {images.map((imageId) => (
                          <option key={imageId} value={imageId}>{imageId}</option>
                        ))}
                      </SelectNative>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-white/5 bg-[#24201a]/95 px-4 pb-2 pt-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-0">
            <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
              {isSubmitting ? t('form.buttons.saving') : product ? t('form.buttons.update') : t('form.buttons.create')}
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onClose}>{t('form.buttons.cancel')}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
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
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="px-1 text-xs font-medium text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
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
