import { z } from "zod";

const optionalNonNegative = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().min(0).optional(),
);

export const variantSchema = z.object({
  id: z.string().optional(),
  variantName: z.string().trim().min(1, "Variant name is required."),
  color: z.string().trim().optional(),
  size: z.string().trim().optional(),
  type: z.string().trim().optional(),
  real_stock: z.coerce.number().min(0, "Real stock must be non-negative."),
  display_stock: z.coerce.number().min(0, "Display stock must be non-negative."),
  price: z.coerce.number().min(0, "Price must be non-negative."),
  compareAtPrice: optionalNonNegative,
  linkedImageId: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const productSchema = z.object({
  categoryId: z.string().min(1, "Category is required."),
  name_en: z.string().trim().min(1, "English name is required."),
  name_ar: z.string().trim().min(1, "Arabic name is required."),
  slug: z.string().trim().min(1, "Slug is required."),
  description_en: z.string().trim().optional(),
  description_ar: z.string().trim().optional(),
  selling_price: z.coerce.number().min(0, "Selling price must be non-negative."),
  compareAtPrice: optionalNonNegative,
  cogs: optionalNonNegative,
  thumbnail: z.string().optional(),
  images: z.array(z.string()).default([]),
  status: z.union([z.literal("DRAFT"), z.literal("PUBLISHED")]),
  variants: z.array(variantSchema).min(1, "At least one variant is required."),
}).superRefine((value, ctx) => {
  if (
    value.compareAtPrice !== undefined &&
    value.compareAtPrice < value.selling_price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["compareAtPrice"],
      message: "Compare-at price should be greater than or equal to selling price.",
    });
  }
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormSubmitValues = z.output<typeof productSchema>;
