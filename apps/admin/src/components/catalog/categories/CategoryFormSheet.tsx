"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@backend/convex/_generated/api";
import {
  Button,
  Input,
  Label,
  Switch,
  Textarea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@techworld/ui";
import { useTranslations } from "next-intl";

type CategoryFormState = {
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string;
  description_ar: string;
  thumbnailImageId: string;
  isActive: boolean;
};

const emptyForm: CategoryFormState = {
  name_en: "",
  name_ar: "",
  slug: "",
  description_en: "",
  description_ar: "",
  thumbnailImageId: "",
  isActive: true,
};

interface CategoryFormSheetProps {
  open: boolean;
  onClose: () => void;
  category: any | null; // Replacing with concrete type if available
}

export function CategoryFormSheet({
  open,
  onClose,
  category,
}: CategoryFormSheetProps) {
  const t = useTranslations('Catalog.categories');
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);

  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!category) {
      setForm(emptyForm);
      return;
    }

    setForm({
      name_en: category.name_en,
      name_ar: category.name_ar,
      slug: category.slug,
      description_en: category.description_en ?? "",
      description_ar: category.description_ar ?? "",
      thumbnailImageId: category.thumbnailImageId ?? "",
      isActive: category.isActive,
    });
  }, [open, category]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name_en.trim() || !form.name_ar.trim()) {
      toast.error(t('messages.incomplete'), {
        description: t('messages.incompleteDescription'),
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (category?._id) {
        await updateCategory({
          id: category._id,
          name_en: form.name_en,
          name_ar: form.name_ar,
          slug: form.slug,
          description_en: form.description_en,
          description_ar: form.description_ar,
          thumbnailImageId: form.thumbnailImageId,
        });
        toast.success(t('messages.updated'));
      } else {
        await createCategory({
          name_en: form.name_en,
          name_ar: form.name_ar,
          slug: form.slug,
          description_en: form.description_en,
          description_ar: form.description_ar,
          thumbnailImageId: form.thumbnailImageId,
          isActive: form.isActive,
        });
        toast.success(t('messages.created'));
      }

      onClose();
    } catch (error) {
      const description = error instanceof Error ? error.message : t('messages.saveFailed');
      toast.error(t('messages.catalogUpdateFailed'), { description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto p-0 border-l border-white/10 dark:bg-[#0a0a0a]">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-2xl font-bold text-white uppercase tracking-tight">
            {category ? t('form.editTitle') : t('form.createTitle')}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 uppercase tracking-[0.2em] text-[10px]">
            {t('form.badge')}
          </SheetDescription>
        </SheetHeader>

        <form className="p-6 space-y-6 pb-24" onSubmit={submit}>
          <div className="space-y-4 text-sm text-zinc-200">
            <div className="space-y-2">
              <Label htmlFor="name_en">{t('form.fields.nameEn')}</Label>
              <Input
                id="name_en"
                value={form.name_en}
                onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))}
                placeholder={t('form.placeholders.nameEn')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">{t('form.fields.nameAr')}</Label>
              <Input
                id="name_ar"
                dir="rtl"
                value={form.name_ar}
                onChange={(event) => setForm((current) => ({ ...current, name_ar: event.target.value }))}
                placeholder={t('form.placeholders.nameAr')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">{t('form.fields.slug')}</Label>
              <Input
                id="slug"
                placeholder={t('form.placeholders.slug')}
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_en" optional>{t('form.fields.descriptionEn')}</Label>
              <Textarea
                id="description_en"
                value={form.description_en}
                onChange={(event) => setForm((current) => ({ ...current, description_en: event.target.value }))}
                placeholder={t('form.placeholders.descriptionEn')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_ar" optional>{t('form.fields.descriptionAr')}</Label>
              <Textarea
                id="description_ar"
                dir="rtl"
                value={form.description_ar}
                onChange={(event) => setForm((current) => ({ ...current, description_ar: event.target.value }))}
                placeholder={t('form.placeholders.descriptionAr')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnailImageId" optional>{t('form.fields.thumbnailImageId')}</Label>
              <Input
                id="thumbnailImageId"
                value={form.thumbnailImageId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, thumbnailImageId: event.target.value }))
                }
                placeholder={t('form.placeholders.thumbnailImageId')}
              />
            </div>

            {!category?._id ? (
              <div className="pt-2">
                <Switch
                  checked={form.isActive}
                  label={t('form.fields.isActive')}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-white/5 bg-[#24201a]/95 px-4 pb-2 pt-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-0">
            <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
              {isSubmitting ? t('form.buttons.saving') : category ? t('form.buttons.update') : t('form.buttons.create')}
            </Button>
            <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onClose}>{t('form.buttons.cancel')}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
