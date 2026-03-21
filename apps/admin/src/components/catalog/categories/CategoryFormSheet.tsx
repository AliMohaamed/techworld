"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Sparkles, Layers, Info, CheckCircle2 } from "lucide-react";
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
  cn,
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
  const t = useTranslations("Catalog.categories");
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
      toast.error(t("messages.incomplete"), {
        description: t("messages.incompleteDescription"),
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
        toast.success(t("messages.updated"));
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
        toast.success(t("messages.created"));
      }

      onClose();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : t("messages.saveFailed");
      toast.error(t("messages.catalogUpdateFailed"), { description });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-xl overflow-y-auto p-0 border-l border-border bg-background transition-all"
      >
        <div className="flex h-full flex-col relative overflow-hidden">
          {/* Decorative background for light mode */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />

          <SheetHeader className="p-10 pb-10 border-b border-border bg-card relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Layers className="text-[#ffc105]" size={24} />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
                {t("form.badge")}
              </p>
            </div>
            <SheetTitle className="text-3xl font-black uppercase tracking-tightest text-foreground m-0 leading-tight italic">
              {category ? t("form.editTitle") : t("form.createTitle")}
            </SheetTitle>
            <SheetDescription className="text-sm font-medium text-muted-foreground/60 max-w-sm mt-2">
              Organize your catalog with clear taxonomic definitions for
              optimized discovery.
            </SheetDescription>
          </SheetHeader>

          <form
            className="p-10 space-y-10 pb-32 relative z-10 scrollbar-hide"
            onSubmit={submit}
          >
            <div className="space-y-8 rounded-[40px] border border-border bg-card p-8   group transition-all hover:border-[#ffc105]/10">
              <div className="space-y-3">
                <Label
                  htmlFor="name_en"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.nameEn")}
                </Label>
                <Input
                  id="name_en"
                  value={form.name_en}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name_en: event.target.value,
                    }))
                  }
                  placeholder={t("form.placeholders.nameEn")}
                  className="rounded-xl border-border bg-background h-12 font-black uppercase tracking-tightest placeholder:italic"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="name_ar"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.nameAr")}
                </Label>
                <Input
                  id="name_ar"
                  dir="rtl"
                  value={form.name_ar}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name_ar: event.target.value,
                    }))
                  }
                  placeholder={t("form.placeholders.nameAr")}
                  className="rounded-xl border-border bg-background h-12 font-black tracking-tightest placeholder:italic"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="slug"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.slug")}
                </Label>
                <Input
                  id="slug"
                  placeholder={t("form.placeholders.slug")}
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  className="rounded-xl border-border bg-background h-11 font-mono text-[10px] tracking-widest uppercase"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="description_en"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.descriptionEn")}
                </Label>
                <Textarea
                  id="description_en"
                  value={form.description_en}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description_en: event.target.value,
                    }))
                  }
                  placeholder={t("form.placeholders.descriptionEn")}
                  className="rounded-2xl border-border bg-background min-h-[100px] text-sm font-medium leading-relaxed p-4"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="description_ar"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.descriptionAr")}
                </Label>
                <Textarea
                  id="description_ar"
                  dir="rtl"
                  value={form.description_ar}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description_ar: event.target.value,
                    }))
                  }
                  placeholder={t("form.placeholders.descriptionAr")}
                  className="rounded-2xl border-border bg-background min-h-[100px] text-sm font-medium leading-relaxed p-4"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="thumbnailImageId"
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40"
                >
                  {t("form.fields.thumbnailImageId")}
                </Label>
                <Input
                  id="thumbnailImageId"
                  value={form.thumbnailImageId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      thumbnailImageId: event.target.value,
                    }))
                  }
                  placeholder={t("form.placeholders.thumbnailImageId")}
                  className="rounded-xl border-border bg-background h-11 font-mono text-[10px] tracking-tightest uppercase"
                />
              </div>

              {!category?._id ? (
                <div className="pt-4 flex items-center justify-between border-t border-border mt-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                      Global Visibility
                    </p>
                    <p className="text-[9px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                      Toggle category active state
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>
          </form>

          <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-border bg-card/90 p-10 backdrop-blur   sm:flex-row sm:justify-end">
            <Button
              className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] border-border hover:bg-accent transition-all"
              variant="outline"
              type="button"
              onClick={onClose}
            >
              {t("form.buttons.cancel")}
            </Button>
            <Button
              className="h-12 px-10 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] bg-[#ffc105] text-black hover:bg-foreground hover:text-background transition-all   shadow-[#ffc105]/10"
              disabled={isSubmitting}
              type="submit"
              onClick={(e: any) => submit(e)}
            >
              {isSubmitting
                ? t("form.buttons.saving")
                : category
                  ? t("form.buttons.update")
                  : t("form.buttons.create")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
