"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "convex/react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@techworld/ui/button";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";

const governorateFormSchema = z.object({
  name_en: z.string().trim().min(1, "English name is required."),
  name_ar: z.string().trim().min(1, "Arabic name is required."),
  shippingFee: z.coerce.number().min(0, "Shipping fee must be non-negative."),
  isActive: z.boolean(),
});

type GovernorateFormValues = z.input<typeof governorateFormSchema>;

const emptyValues: GovernorateFormValues = {
  name_en: "",
  name_ar: "",
  shippingFee: 0,
  isActive: true,
};

export default function GovernoratesSettingsPage() {
  const governorates = useQuery(api.governorates.listGovernoratesForAdmin);
  const createGovernorate = useMutation(api.governorates.createGovernorate);
  const updateGovernorate = useMutation(api.governorates.updateGovernorate);
  const toggleGovernorateStatus = useMutation(api.governorates.toggleGovernorateStatus);

  const [editingId, setEditingId] = useState<Id<"governorates"> | null>(null);
  const [busyId, setBusyId] = useState<Id<"governorates"> | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<GovernorateFormValues>({
    defaultValues: emptyValues,
  });

  const editingGovernorate = useMemo(
    () => governorates?.find((governorate) => governorate._id === editingId) ?? null,
    [editingId, governorates],
  );

  useEffect(() => {
    if (!editingGovernorate) {
      reset(emptyValues);
      return;
    }

    reset({
      name_en: editingGovernorate.name_en,
      name_ar: editingGovernorate.name_ar,
      shippingFee: editingGovernorate.shippingFee,
      isActive: editingGovernorate.isActive,
    });
  }, [editingGovernorate, reset]);

  const submit = handleSubmit(async (values) => {
    clearErrors();
    const parsed = governorateFormSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === "name_en" ||
          field === "name_ar" ||
          field === "shippingFee" ||
          field === "isActive"
        ) {
          setError(field, { message: issue.message, type: "manual" });
        }
      }
      return;
    }

    try {
      if (editingId) {
        await updateGovernorate({
          id: editingId,
          name_en: parsed.data.name_en,
          name_ar: parsed.data.name_ar,
          shippingFee: parsed.data.shippingFee,
        });
        toast.success("Governorate updated.");
      } else {
        await createGovernorate(parsed.data);
        toast.success("Governorate created.");
      }

      setEditingId(null);
      reset(emptyValues);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Governorate save failed.";
      toast.error("Governorate update failed.", { description: message });
    }
  });

  const toggleStatus = async (id: Id<"governorates">) => {
    setBusyId(id);
    try {
      const result = await toggleGovernorateStatus({ id });
      toast.success(result.isActive ? "Governorate activated." : "Governorate deactivated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Governorate toggle failed.";
      toast.error("Status update failed.", { description: message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#0b0b0b] px-8 py-8">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">Operations</p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
          Governorate Shipping Fees
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Configure live delivery fees by governorate, toggle availability instantly, and keep the checkout pricing source under Super Admin control.
        </p>
      </section>

      <section className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-[1fr,1.6fr]">
        <form className="rounded-[24px] border border-white/10 bg-[#0b0b0b] p-6" onSubmit={submit}>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
                {editingId ? "Edit Governorate" : "New Governorate"}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {editingId ? "Update shipping profile" : "Create shipping profile"}
              </h2>
            </div>
            {editingId ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  reset(emptyValues);
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>

          <div className="space-y-4 text-sm text-zinc-200">
            <FormField label="English name" error={errors.name_en?.message}>
              <input className="field" {...register("name_en")} />
            </FormField>
            <FormField label="Arabic name" error={errors.name_ar?.message}>
              <input className="field" dir="rtl" {...register("name_ar")} />
            </FormField>
            <FormField label="Shipping fee (EGP)" error={errors.shippingFee?.message}>
              <input className="field" step="0.01" type="number" {...register("shippingFee")} />
            </FormField>
            {!editingId ? (
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-zinc-300">
                <input type="checkbox" {...register("isActive")} />
                Start this governorate as active
              </label>
            ) : null}
          </div>

          <div className="mt-6 flex gap-3">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editingId ? "Update Governorate" : "Create Governorate"}
            </Button>
          </div>
        </form>

        <section className="rounded-[24px] border border-white/10 bg-[#0b0b0b] p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Data Table</p>
              <h2 className="mt-2 text-xl font-semibold text-white">All governorates</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {governorates ? `${governorates.length} total` : "Loading..."}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-zinc-300">
              <thead className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="sticky left-0 bg-[#0b0b0b] pb-3 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Name</th>
                  <th className="pb-3 pr-4">Fee</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {governorates?.map((governorate) => (
                  <tr key={governorate._id} className="border-t border-white/10 align-top">
                    <td className="sticky left-0 bg-[#0b0b0b] py-4 max-lg:py-5 pr-4 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      <p className="font-medium text-white">{governorate.name_en}</p>
                      <p className="text-xs text-zinc-500" dir="rtl">{governorate.name_ar}</p>
                    </td>
                    <td className="py-4 pr-4">{governorate.shippingFee.toLocaleString()} EGP</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${
                          governorate.isActive
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : "border-red-400/30 bg-red-400/10 text-red-300"
                        }`}
                      >
                        {governorate.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" type="button" variant="outline" onClick={() => setEditingId(governorate._id)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="ghost"
                          disabled={busyId === governorate._id}
                          onClick={() => void toggleStatus(governorate._id)}
                        >
                          {busyId === governorate._id
                            ? "Updating..."
                            : governorate.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {governorates?.length === 0 ? (
                  <tr>
                    <td className="py-8 text-zinc-500" colSpan={4}>
                      No governorates yet.
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

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </label>
  );
}

