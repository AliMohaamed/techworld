"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { CategoryFormSheet } from "@/components/catalog/categories/CategoryFormSheet";

export default function AdminCategoriesPage() {
  const categories = useQuery(api.categories.listCategoriesForAdmin);
  const toggleCategoryStatus = useMutation(api.categories.toggleCategoryStatus);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"categories"> | null>(null);

  const editingCategory = useMemo(
    () => categories?.find((category) => category._id === editingId) ?? null,
    [categories, editingId],
  );

  const openCreateSheet = () => {
    setEditingId(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (categoryId: Id<"categories">) => {
    setEditingId(categoryId);
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setEditingId(null);
    setIsSheetOpen(false);
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
      <section className="rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Catalog</p>
            <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
              Category Management
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Create bilingual categories, edit operational metadata, and soft-disable categories without deleting history.
            </p>
          </div>
          <Button type="button" onClick={openCreateSheet}>
            Create Category
          </Button>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/5 bg-[#24201a] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Data Table</p>
            <h2 className="mt-2 text-xl font-semibold text-white">All categories</h2>
          </div>
          <span className="rounded-full border border-white/5 px-3 py-1 text-xs text-zinc-300">
            {categories ? `${categories.length} total` : "Loading..."}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="sticky left-0 bg-[#24201a] pb-3 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Name</th>
                <th className="pb-3 pr-4">Slug</th>
                <th className="pb-3 pr-4">Products</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((category) => (
                <tr key={category._id} className="border-t border-white/5 align-top">
                  <td className="sticky left-0 bg-[#24201a] py-4 max-lg:py-5 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
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
                        onClick={() => openEditSheet(category._id)}
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

      <CategoryFormSheet
        open={isSheetOpen}
        onClose={closeSheet}
        category={editingCategory}
      />
    </main>
  );
}

