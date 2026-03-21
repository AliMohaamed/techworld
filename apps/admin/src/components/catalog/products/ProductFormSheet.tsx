"use client";

import { useEffect } from "react";
import { useFieldArray, useForm, useWatch, Controller } from "react-hook-form";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  TrendingUp,
  Sparkles,
  Box,
  Info,
  Image as ImageIcon,
  Layers,
} from "lucide-react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@techworld/ui";
import { ConvexStorageUpload } from "./ConvexStorageUpload";
import {
  productSchema,
  type ProductFormSubmitValues,
  type ProductFormValues,
} from "./product-zod-schemas";
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
  const t = useTranslations("Catalog.products");
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: emptyValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variants",
  });
  const images = useWatch({ control, name: "images" }) ?? [];

  const handleRestock = async (index: number) => {
    const variant = getValues(`variants.${index}`);
    if (!variant.id) {
      toast.error(t("messages.saveFirst"));
      return;
    }

    const amount = prompt(
      t("messages.restockPrompt", { name: variant.variantName }),
      "0",
    );
    const quantity = parseInt(amount || "0", 10);

    if (isNaN(quantity) || quantity <= 0) {
      if (amount !== null) toast.error(t("messages.restockInvalid"));
      return;
    }

    try {
      const result = await restockItem({
        skuId: variant.id as Id<"skus">,
        quantity,
      });
      toast.success(
        t("messages.restockSuccess", { quantity, total: result.real_stock }),
      );
      // Update form state to reflect new stock
      setValue(`variants.${index}.real_stock`, result.real_stock);
    } catch (error) {
      toast.error(t("messages.restockFailed"), {
        description:
          error instanceof Error ? error.message : t("messages.restockFailed"),
      });
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
      throw new Error(
        parsed.error.issues[0]?.message ?? "Product form is invalid.",
      );
    }

    const payload = buildPayload(parsed.data);

    if (product) {
      await updateAdvancedProduct({ id: product._id, ...payload });
      onSaved(t("messages.updated"));
    } else {
      await createAdvancedProduct(payload);
      onSaved(t("messages.created"));
    }

    onClose();
  });

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-5xl overflow-y-auto p-0 border-l border-border bg-background transition-all"
      >
        <div className="flex h-full flex-col relative">
          {/* Decorative background for light mode */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />

          <SheetHeader className="p-10 pb-10 border-b border-border bg-card relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Box className="text-[#ffc105]" size={24} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                {t("form.badge")}
              </p>
            </div>
            <SheetTitle className="text-4xl font-black text-foreground uppercase tracking-tightest leading-tight italic">
              {product ? t("form.editTitle") : t("form.createTitle")}
            </SheetTitle>
            <SheetDescription className="text-sm font-medium text-muted-foreground/60 max-w-2xl mt-2">
              Configure core product attributes, SKUs, and media gallery for
              global accessibility.
            </SheetDescription>
          </SheetHeader>

          <form
            className="p-10 space-y-12 pb-32 relative z-10 scrollbar-hide"
            onSubmit={(event) => void submit(event)}
          >
            {/* Core Info Section */}
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3">
                <Info size={18} className="text-[#ffc105]/60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                  General Configuration
                </h3>
              </div>

              <div className="grid gap-8 md:grid-cols-2 p-8 rounded-[40px] border border-border bg-card  ">
                <Field
                  label={t("form.fields.category")}
                  error={errors.categoryId?.message}
                >
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full rounded-xl border border-border bg-background px-4 h-12 font-bold uppercase text-[11px] tracking-widest text-foreground transition-all focus:ring-1 focus:ring-[#ffc105] focus:border-[#ffc105]">
                          <SelectValue placeholder={t("form.placeholders.selectCategory")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border bg-card">
                          {categories.map((category) => (
                            <SelectItem key={category._id} value={category._id} className="font-bold uppercase tracking-widest text-[11px] cursor-pointer">
                              {category.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
                <Field
                  label={t("form.fields.status")}
                  error={errors.status?.message}
                >
                  <div className="grid grid-cols-2 gap-2 bg-accent/40 p-1.5 rounded-2xl border border-border">
                    {["DRAFT", "PUBLISHED"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setValue("status", s as any)}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          watch("status") === s
                            ? "bg-[#ffc105] text-black  "
                            : "text-muted-foreground/40 hover:text-foreground",
                        )}
                      >
                        {t(`form.statusOptions.${s.toLowerCase()}`)}
                      </button>
                    ))}
                    <input type="hidden" {...register("status")} />
                  </div>
                </Field>
                <Field
                  label={t("form.fields.nameEn")}
                  error={errors.name_en?.message}
                >
                  <Input
                    {...register("name_en")}
                    placeholder={t("form.placeholders.nameEn")}
                    className="rounded-xl border-border bg-background h-12 font-black uppercase tracking-tightest placeholder:italic"
                  />
                </Field>
                <Field
                  label={t("form.fields.nameAr")}
                  error={errors.name_ar?.message}
                >
                  <Input
                    dir="rtl"
                    {...register("name_ar")}
                    placeholder={t("form.placeholders.nameAr")}
                    className="rounded-xl border-border bg-background h-12 font-black tracking-tightest placeholder:italic"
                  />
                </Field>
                <Field
                  label={t("form.fields.slug")}
                  error={errors.slug?.message}
                >
                  <Input
                    {...register("slug")}
                    placeholder={t("form.placeholders.slug")}
                    className="rounded-xl border-border bg-background h-12 font-mono text-[10px] tracking-widest uppercase"
                  />
                </Field>
                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                  <Field
                    label={t("form.fields.sellingPrice")}
                    error={errors.selling_price?.message}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...register("selling_price")}
                        placeholder="0.00"
                        className="rounded-xl border-border bg-background h-12 font-black tracking-tightest pr-12"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/30">
                        EGP
                      </span>
                    </div>
                  </Field>
                  <Field
                    label={t("form.fields.compareAtPrice")}
                    error={errors.compareAtPrice?.message?.toString()}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...register("compareAtPrice")}
                        placeholder="0.00"
                        className="rounded-xl border-border bg-background h-12 font-black tracking-tightest pr-12 text-muted-foreground/60"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/30">
                        EGP
                      </span>
                    </div>
                  </Field>
                  <Field
                    label={t("form.fields.cogs")}
                    error={errors.cogs?.message?.toString()}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        {...register("cogs")}
                        placeholder="0.00"
                        className="rounded-xl border-border bg-background h-12 font-black tracking-tightest pr-12 text-primary"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground/30">
                        EGP
                      </span>
                    </div>
                  </Field>
                </div>
                <Field
                  label={t("form.fields.descriptionEn")}
                  error={errors.description_en?.message}
                  className="md:col-span-2"
                >
                  <Textarea
                    {...register("description_en")}
                    placeholder={t("form.placeholders.descriptionEn")}
                    className="rounded-[24px] border-border bg-background min-h-[140px] font-medium text-sm leading-relaxed p-6"
                  />
                </Field>
                <Field
                  label={t("form.fields.descriptionAr")}
                  error={errors.description_ar?.message}
                  className="md:col-span-2"
                >
                  <Textarea
                    dir="rtl"
                    {...register("description_ar")}
                    placeholder={t("form.placeholders.descriptionAr")}
                    className="rounded-[24px] border-border bg-background min-h-[140px] font-medium text-sm leading-relaxed p-6"
                  />
                </Field>
              </div>
            </section>

            {/* Media Section */}
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="flex items-center gap-3">
                <ImageIcon size={18} className="text-[#ffc105]/60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                  Media Assets
                </h3>
              </div>
              <div className="p-8 rounded-[40px] border border-border bg-card   space-y-6">
                <ConvexStorageUpload
                  imageIds={images}
                  onChange={(nextImages) => {
                    setValue("images", nextImages, { shouldValidate: true });
                    if (!getValues("thumbnail") && nextImages[0]) {
                      setValue("thumbnail", nextImages[0]);
                    }
                  }}
                />
                <Field
                  label={t("form.fields.thumbnail")}
                  error={errors.thumbnail?.message}
                >
                  <Controller
                    control={control}
                    name="thumbnail"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full rounded-xl border border-border bg-background px-4 h-12 font-mono text-[10px] tracking-widest uppercase text-foreground transition-all focus:ring-1 focus:ring-[#ffc105] focus:border-[#ffc105]">
                          <SelectValue placeholder={t("form.placeholders.selectThumbnail")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border bg-card">
                          {images.map((imageId) => (
                            <SelectItem key={imageId} value={imageId} className="font-mono uppercase tracking-widest text-[10px] cursor-pointer">
                              {imageId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>
            </section>

            {/* SKU Section */}
            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Layers size={18} className="text-[#ffc105]/60" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                    Unified SKU Matrix
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#ffc105]/20 text-[#ffc105] font-black uppercase tracking-widest text-[9px] h-8 px-4 hover:bg-[#ffc105]/10"
                  onClick={() =>
                    append({
                      ...emptyVariant,
                      variantName: `Variant ${fields.length + 1}`,
                      isDefault: false,
                      price: getValues("selling_price") || 0,
                    })
                  }
                >
                  <Plus size={14} className="mr-2" />
                  {t("form.fields.skus.add")}
                </Button>
              </div>
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="group rounded-[40px] border border-border bg-card p-10 transition-all hover:border-[#ffc105]/20   overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffc105]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#ffc105]/10 transition-colors" />

                    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-[#ffc105]" />
                        <p className="text-[11px] font-black text-foreground uppercase tracking-widest italic">
                          {t("form.fields.variant", { index: index + 1 })}
                        </p>
                      </div>
                      {fields.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-4 rounded-full text-destructive/40 hover:text-destructive hover:bg-destructive/10 text-[9px] font-black uppercase tracking-widest"
                          onClick={() => remove(index)}
                        >
                          <Trash2 size={12} className="mr-2" />
                          {t("buttons.remove")}
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10">
                      <Field
                        label={t("form.fields.skus.name")}
                        error={errors.variants?.[index]?.variantName?.message}
                      >
                        <Input
                          {...register(`variants.${index}.variantName`)}
                          placeholder={t("form.placeholders.variantName")}
                          className="rounded-xl border-border bg-background h-11 text-xs font-black uppercase tracking-widest"
                        />
                      </Field>
                      <Field
                        label={t("form.fields.skus.color")}
                        error={errors.variants?.[index]?.color?.message}
                      >
                        <Input
                          {...register(`variants.${index}.color`)}
                          placeholder={t("form.placeholders.color")}
                          className="rounded-xl border-border bg-background h-11 text-xs font-bold"
                        />
                      </Field>
                      <Field
                        label={t("form.fields.skus.size")}
                        error={errors.variants?.[index]?.size?.message}
                      >
                        <Input
                          {...register(`variants.${index}.size`)}
                          placeholder={t("form.placeholders.size")}
                          className="rounded-xl border-border bg-background h-11 text-xs font-bold"
                        />
                      </Field>
                      <Field
                        label={t("form.fields.skus.type")}
                        error={errors.variants?.[index]?.type?.message}
                      >
                        <Input
                          {...register(`variants.${index}.type`)}
                          placeholder={t("form.placeholders.type")}
                          className="rounded-xl border-border bg-background h-11 text-xs font-bold"
                        />
                      </Field>
                      <Field
                        label={t("form.fields.skus.realStock")}
                        error={errors.variants?.[index]?.real_stock?.message}
                      >
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            {...register(`variants.${index}.real_stock`)}
                            placeholder="0"
                            className="rounded-xl border-border bg-background h-11 text-xs font-black tracking-widest"
                          />
                          <Button
                            className="h-11 w-11 rounded-xl border-border bg-accent text-accent-foreground hover:bg-[#ffc105] hover:text-black hover:border-[#ffc105] transition-all shrink-0"
                            type="button"
                            variant="outline"
                            onClick={() => void handleRestock(index)}
                            title="Ad-hoc restock from returns or new shipments"
                          >
                            <TrendingUp size={14} />
                          </Button>
                        </div>
                      </Field>
                      <Field
                        label={t("form.fields.skus.displayStock")}
                        error={errors.variants?.[index]?.display_stock?.message}
                      >
                        <Input
                          type="number"
                          {...register(`variants.${index}.display_stock`)}
                          placeholder="0"
                          className="rounded-xl border-border bg-background h-11 text-xs font-black tracking-widest"
                        />
                      </Field>
                      <Field
                        label={t("form.fields.skus.price")}
                        error={errors.variants?.[index]?.price?.message}
                      >
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`variants.${index}.price`)}
                            placeholder="0.00"
                            className="rounded-xl border-border bg-background h-11 text-xs font-black tracking-widest pr-10"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/30">
                            EGP
                          </span>
                        </div>
                      </Field>
                      <Field
                        label={t("form.fields.skus.compareAt")}
                        error={errors.variants?.[
                          index
                        ]?.compareAtPrice?.message?.toString()}
                      >
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`variants.${index}.compareAtPrice`)}
                            placeholder="0.00"
                            className="rounded-xl border-border bg-background h-11 text-xs font-black tracking-widest pr-10 text-muted-foreground/40"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/30">
                            EGP
                          </span>
                        </div>
                      </Field>
                      <Field
                        label={t("form.fields.skus.linkedImage")}
                        error={errors.variants?.[index]?.linkedImageId?.message}
                      >
                        <Controller
                          control={control}
                          name={`variants.${index}.linkedImageId` as const}
                          render={({ field }) => (
                            <Select value={field.value || undefined} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full rounded-xl border border-border bg-background px-3 h-11 font-mono text-[9px] tracking-tightest uppercase text-foreground transition-all focus:ring-1 focus:ring-[#ffc105] focus:border-[#ffc105]">
                                <SelectValue placeholder={t("form.placeholders.noLinkedImage")} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border bg-card">
                                {images.map((imageId) => (
                                  <SelectItem key={imageId} value={imageId} className="font-mono uppercase tracking-widest text-[9px] cursor-pointer">
                                    {imageId}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </form>

          <div className="sticky bottom-0 z-30 flex flex-col gap-4 border-t border-border bg-card/90 px-10 py-8 backdrop-blur   sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] border-border hover:bg-accent transition-all"
              type="button"
              onClick={onClose}
            >
              {t("form.buttons.cancel")}
            </Button>
            <Button
              className="h-12 px-10 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-[#ffc105] text-black hover:bg-foreground hover:text-background transition-all   shadow-[#ffc105]/10"
              disabled={isSubmitting}
              type="submit"
              onClick={() => void submit()}
            >
              {isSubmitting
                ? t("form.buttons.saving")
                : product
                  ? t("form.buttons.update")
                  : t("form.buttons.create")}
            </Button>
          </div>
        </div>
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
    <div className={cn("space-y-3", className)}>
      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
        {label}
      </Label>
      {children}
      {error && (
        <p className="px-1 text-[10px] font-black text-destructive uppercase tracking-widest mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
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
