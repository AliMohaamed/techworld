"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";

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

export default function AdminCategoriesPage() {
  const categories = useQuery(api.categories.listCategoriesForAdmin);
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const toggleCategoryStatus = useMutation(api.categories.toggleCategoryStatus);

  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<Id<"categories"> | null>(null);

  const editingCategory = useMemo(
    () => categories?.find((category) => category._id === editingId) ?? null,
    [categories, editingId],
  );

  useEffect(() => {
    if (!editingCategory) {
      return;
    }

    setForm({
      name_en: editingCategory.name_en,
      name_ar: editingCategory.name_ar,
      slug: editingCategory.slug,
      description_en: editingCategory.description_en ?? "",
      description_ar: editingCategory.description_ar ?? "",
      thumbnailImageId: editingCategory.thumbnailImageId ?? "",
      isActive: editingCategory.isActive,
    });
  }, [editingCategory]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name_en.trim() || !form.name_ar.trim()) {
      toast.error("Category details are incomplete.", {
        description: "English and Arabic names are required.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await updateCategory({
          id: editingId,
          name_en: form.name_en,
          name_ar: form.name_ar,
          slug: form.slug,
          description_en: form.description_en,
          description_ar: form.description_ar,
          thumbnailImageId: form.thumbnailImageId,
        });
        toast.success("Category updated.");
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
        toast.success("Category created.");
      }

      setEditingId(null);
      setForm(emptyForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Category save failed.";
      toast.error("Catalog update failed.", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: Id<"categories">) => {
    setBusyId(id);
    try {
      const result = await toggleCategoryStatus({ id });
      toast.success(result.isActive ? "Category activated." : "Category deactivated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Status update failed.";
      toast.error("Category update failed.", { description: message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#0b0b0b] px-8 py-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Catalog</p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
          Category Management
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Create bilingual categories, edit operational metadata, and soft-disable categories without deleting history.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,1.9fr]">
        <form
          className="rounded-[24px] border border-white/10 bg-[#0b0b0b] p-6"
          onSubmit={submit}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
                {editingId ? "Edit Category" : "New Category"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {editingId ? "Update category" : "Create category"}
              </h2>
            </div>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>

          <div className="space-y-4 text-sm text-zinc-200">
            <label className="block space-y-2">
              <span>English name</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                value={form.name_en}
                onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))}
              />
            </label>
            <label className="block space-y-2">
              <span>Arabic name</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                dir="rtl"
                value={form.name_ar}
                onChange={(event) => setForm((current) => ({ ...current, name_ar: event.target.value }))}
              />
            </label>
            <label className="block space-y-2">
              <span>Slug</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                placeholder="mobile-accessories"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              />
            </label>
            <label className="block space-y-2">
              <span>English description</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                value={form.description_en}
                onChange={(event) => setForm((current) => ({ ...current, description_en: event.target.value }))}
              />
            </label>
            <label className="block space-y-2">
              <span>Arabic description</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                dir="rtl"
                value={form.description_ar}
                onChange={(event) => setForm((current) => ({ ...current, description_ar: event.target.value }))}
              />
            </label>
            <label className="block space-y-2">
              <span>Thumbnail image ID</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                value={form.thumbnailImageId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, thumbnailImageId: event.target.value }))
                }
              />
            </label>
            {!editingId ? (
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-300">
                <input
                  checked={form.isActive}
                  type="checkbox"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                Start this category as active
              </label>
            ) : null}
          </div>

          <div className="mt-6 flex gap-3">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editingId ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </form>

        <section className="rounded-[24px] border border-white/10 bg-[#0b0b0b] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Data Table</p>
              <h2 className="mt-2 text-xl font-semibold text-white">All categories</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {categories ? `${categories.length} total` : "Loading..."}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Slug</th>
                  <th className="pb-3 pr-4">Products</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories?.map((category) => (
                  <tr key={category._id} className="border-t border-white/10 align-top">
                    <td className="py-4 pr-4">
                      <p className="font-medium text-white">{category.name_en}</p>
                      <p className="text-xs text-zinc-500" dir="rtl">{category.name_ar}</p>
                    </td>
                    <td className="py-4 pr-4 text-zinc-400">{category.slug}</td>
                    <td className="py-4 pr-4">{category.productCount}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          category.isActive
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-red-400/30 bg-red-400/10 text-red-300"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => setEditingId(category._id)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          disabled={busyId === category._id}
                          onClick={() => void toggleStatus(category._id)}
                        >
                          {busyId === category._id
                            ? "Updating..."
                            : category.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories?.length === 0 ? (
                  <tr>
                    <td className="py-8 text-zinc-500" colSpan={5}>
                      No categories yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
