import { z } from "zod";

const optionalNonNegative = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().min(0).optional(),
);

export const variantSchema = z.object({
  id: z.string().optional(),
  variantName: z.string().trim().min(1, "required"),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  type: z.string().trim().optional(),
  real_stock: z.coerce.number().min(0, "nonNegative"),
  display_stock: z.coerce.number().min(0, "nonNegative"),
  price: z.coerce.number().min(0, "nonNegative"),
  compareAtPrice: optionalNonNegative,
  linkedImageId: z.string().optional(),
  isDefault: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (
    value.compareAtPrice !== undefined &&
    value.compareAtPrice < value.price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compareAtPrice"],
      message: "compareAtPriceError",
    });
  }
});

export const productSchema = z.object({
  categoryId: z.string().min(1, "required"),
  name_en: z.string().trim().min(1, "required"),
  name_ar: z.string().trim().min(1, "required"),
  slug: z.string().trim().min(1, "required"),
  description_en: z.string().trim().optional(),
  description_ar: z.string().trim().optional(),
  selling_price: z.coerce.number().min(0, "nonNegative"),
  compareAtPrice: optionalNonNegative,
  cogs: optionalNonNegative,
  thumbnail: z.string().optional(),
  images: z.array(z.string()).default([]),
  status: z.union([z.literal("DRAFT"), z.literal("PUBLISHED")]),
  isFeatured: z.boolean().default(false),
  variants: z.array(variantSchema).min(1, "atLeastOneVariant"),
}).superRefine((value, ctx) => {
  if (
    value.compareAtPrice !== undefined &&
    value.compareAtPrice < value.selling_price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compareAtPrice"],
      message: "compareAtPriceError",
    });
  }
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormSubmitValues = z.output<typeof productSchema>;
