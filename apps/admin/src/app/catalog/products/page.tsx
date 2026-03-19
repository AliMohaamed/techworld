"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";

type ProductFormState = {
  categoryId: "" | Id<"categories">;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string;
  description_ar: string;
  selling_price: string;
  cogs: string;
  display_stock: string;
  real_stock: string;
  images: string;
  status: "DRAFT" | "PUBLISHED";
};

const emptyForm: ProductFormState = {
  categoryId: "",
  name_en: "",
  name_ar: "",
  slug: "",
  description_en: "",
  description_ar: "",
  selling_price: "0",
  cogs: "",
  display_stock: "0",
  real_stock: "0",
  images: "",
  status: "DRAFT",
};

export default function AdminProductsPage() {
  const products = useQuery(api.products.listAdminProducts);
  const activeCategories = useQuery(api.categories.listActiveCategories);
  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const publishProduct = useMutation(api.products.publishProduct);
  const unpublishProduct = useMutation(api.products.unpublishProduct);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"products"> | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<Id<"products"> | null>(null);
  const [displayDrafts, setDisplayDrafts] = useState<Record<string, string>>({});
  const [realDrafts, setRealDrafts] = useState<Record<string, string>>({});

  const editingProduct = useMemo(
    () => products?.find((product) => product._id === editingId) ?? null,
    [products, editingId],
  );

  useEffect(() => {
    if (!editingProduct) {
      return;
    }

    setForm({
      categoryId: editingProduct.categoryId,
      name_en: editingProduct.name_en,
      name_ar: editingProduct.name_ar,
      slug: editingProduct.slug ?? "",
      description_en: editingProduct.description_en ?? "",
      description_ar: editingProduct.description_ar ?? "",
      selling_price: String(editingProduct.selling_price),
      cogs: editingProduct.cogs === undefined ? "" : String(editingProduct.cogs),
      display_stock: String(editingProduct.display_stock),
      real_stock: String(editingProduct.real_stock),
      images: editingProduct.images.join(", "),
      status: editingProduct.status,
    });
    setIsModalOpen(true);
  }, [editingProduct]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.categoryId) {
      toast.error("Product details are incomplete.", {
        description: "Choose an active category before saving a product.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        categoryId: form.categoryId,
        name_en: form.name_en,
        name_ar: form.name_ar,
        slug: form.slug,
        description_en: form.description_en,
        description_ar: form.description_ar,
        selling_price: Number(form.selling_price),
        cogs: form.cogs.trim() ? Number(form.cogs) : undefined,
        display_stock: Number(form.display_stock),
        real_stock: Number(form.real_stock),
        images: form.images
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        status: form.status,
      };

      if (editingId) {
        await updateProduct({ id: editingId, ...payload });
        toast.success("Product updated.");
      } else {
        await createProduct(payload);
        toast.success("Product created.");
      }

      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Product save failed.";
      toast.error("Catalog update failed.", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisplayStock = async (id: Id<"products">, fallbackValue: number) => {
    const nextValue = Number(displayDrafts[id] ?? fallbackValue);
    setBusyId(id);
    try {
      await updateProduct({ id, display_stock: nextValue });
      toast.success("Display stock updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Display stock update failed.";
      toast.error("Stock update failed.", { description: message });
    } finally {
      setBusyId(null);
    }
  };

  const saveRealStock = async (id: Id<"products">, fallbackValue: number) => {
    const nextValue = Number(realDrafts[id] ?? fallbackValue);
    setBusyId(id);
    try {
      await updateProduct({ id, real_stock: nextValue });
      toast.success("Real stock updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Real stock update failed.";
      toast.error("Stock update failed.", { description: message });
    } finally {
      setBusyId(null);
    }
  };

  const togglePublication = async (id: Id<"products">, status: "DRAFT" | "PUBLISHED") => {
    setBusyId(id);
    try {
      if (status === "PUBLISHED") {
        await unpublishProduct({ id });
        toast.success("Product moved back to draft.");
      } else {
        await publishProduct({ id });
        toast.success("Product published.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publication update failed.";
      toast.error("Publication blocked.", { description: message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#0b0b0b] px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Catalog</p>
            <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
              Product Management
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Manage SKU metadata, control publish state, and update real versus display stock independently.
            </p>
          </div>
          <Button type="button" onClick={openCreateModal}>
            Create SKU
          </Button>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-[#0b0b0b] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Data Table</p>
            <h2 className="mt-2 text-xl font-semibold text-white">All products</h2>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
            {products ? `${products.length} total` : "Loading..."}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-zinc-300">
            <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="pb-3 pr-4">Product</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3 pr-4">Display Stock</th>
                <th className="pb-3 pr-4">Real Stock</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product._id} className="border-t border-white/10 align-top">
                  <td className="py-4 pr-4">
                    <p className="font-medium text-white">{product.name_en}</p>
                    <p className="text-xs text-zinc-500" dir="rtl">{product.name_ar}</p>
                    <p className="mt-1 text-xs text-zinc-500">/{product.slug ?? "no-slug"}</p>
                  </td>
                  <td className="py-4 pr-4">
                    <p>{product.categoryName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {product.isCategoryActive ? "Active category" : "Inactive category"}
                    </p>
                    {product.publicationBlockedReason ? (
                      <p className="mt-2 text-xs text-amber-300">{product.publicationBlockedReason}</p>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4">EGP {product.selling_price.toFixed(2)}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <input
                        className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
                        type="number"
                        value={displayDrafts[product._id] ?? String(product.display_stock)}
                        onChange={(event) =>
                          setDisplayDrafts((current) => ({ ...current, [product._id]: event.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        disabled={busyId === product._id}
                        onClick={() => void saveDisplayStock(product._id, product.display_stock)}
                      >
                        Save
                      </Button>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <input
                        className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none"
                        type="number"
                        value={realDrafts[product._id] ?? String(product.real_stock)}
                        onChange={(event) =>
                          setRealDrafts((current) => ({ ...current, [product._id]: event.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        disabled={busyId === product._id}
                        onClick={() => void saveRealStock(product._id, product.real_stock)}
                      >
                        Save
                      </Button>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        product.status === "PUBLISHED"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-zinc-300"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setEditingId(product._id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        disabled={busyId === product._id}
                        onClick={() => void togglePublication(product._id, product.status)}
                      >
                        {busyId === product._id
                          ? "Updating..."
                          : product.status === "PUBLISHED"
                            ? "Unpublish"
                            : "Publish"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {products?.length === 0 ? (
                <tr>
                  <td className="py-8 text-zinc-500" colSpan={7}>
                    No products created yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-10">
          <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0b0b0b] p-6 shadow-2xl shadow-black/40">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Variant Form</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {editingId ? "Edit product" : "Create product"}
                </h2>
              </div>
              <Button type="button" variant="ghost" onClick={closeModal}>
                Close
              </Button>
            </div>

            <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Category</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: event.target.value as Id<"categories"> | "",
                    }))
                  }
                >
                  <option value="">Select category</option>
                  {activeCategories?.categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name_en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Status</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as "DRAFT" | "PUBLISHED",
                    }))
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>English name</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  value={form.name_en}
                  onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))}
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Arabic name</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  dir="rtl"
                  value={form.name_ar}
                  onChange={(event) => setForm((current) => ({ ...current, name_ar: event.target.value }))}
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Slug</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Selling price</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  type="number"
                  value={form.selling_price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, selling_price: event.target.value }))
                  }
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>COGS</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  type="number"
                  value={form.cogs}
                  onChange={(event) => setForm((current) => ({ ...current, cogs: event.target.value }))}
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Display stock</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  type="number"
                  value={form.display_stock}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, display_stock: event.target.value }))
                  }
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200">
                <span>Real stock</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  type="number"
                  value={form.real_stock}
                  onChange={(event) => setForm((current) => ({ ...current, real_stock: event.target.value }))}
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200 md:col-span-2">
                <span>English description</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  value={form.description_en}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description_en: event.target.value }))
                  }
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200 md:col-span-2">
                <span>Arabic description</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  dir="rtl"
                  value={form.description_ar}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description_ar: event.target.value }))
                  }
                />
              </label>
              <label className="block space-y-2 text-sm text-zinc-200 md:col-span-2">
                <span>Images (comma-separated URLs)</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
                  value={form.images}
                  onChange={(event) => setForm((current) => ({ ...current, images: event.target.value }))}
                />
              </label>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <Button disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
