"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, Truck, Plus, CheckCircle2, XCircle, Power, Info, AlertTriangle, Sparkles, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button, Input, Label, Switch, cn } from "@techworld/ui";
import { toast } from "sonner";

const governorateFormSchema = z.object({
  name_en: z.string().min(1, "English name is required"),
  name_ar: z.string().min(1, "Arabic name is required"),
  shippingFee: z.coerce.number().min(0, "Shipping fee must be a positive number"),
  isActive: z.boolean().default(true),
});

type GovernorateFormValues = z.infer<typeof governorateFormSchema>;

const emptyValues: GovernorateFormValues = {
  name_en: "",
  name_ar: "",
  shippingFee: 0,
  isActive: true,
};

export default function GovernoratesSettingsPage() {
  const t = useTranslations('Settings.governorates');
  const locale = useLocale();
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
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GovernorateFormValues>({
    resolver: zodResolver(governorateFormSchema as any),
    defaultValues: emptyValues,
  });

  const isActiveValue = watch("isActive");

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
        toast.success(t('messages.updated'));
      } else {
        await createGovernorate(parsed.data);
        toast.success(t('messages.created'));
      }

      setEditingId(null);
      reset(emptyValues);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.updateFailed');
      toast.error(t('messages.updateFailed'), { description: message });
    }
  });

  const toggleStatus = async (id: Id<"governorates">) => {
    setBusyId(id);
    try {
      const result = await toggleGovernorateStatus({ id });
      toast.success(result.isActive ? t('messages.activated') : t('messages.deactivated'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('messages.statusFailed');
      toast.error(t('messages.statusFailed'), { description: message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[40px] border border-border bg-card px-10 py-12  ">
        {/* Decorative background for light mode */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffc105]/5 to-transparent dark:hidden pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffc105]/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
             <MapPin className="text-[#ffc105]" size={20} />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ffc105] italic">
               {t('badge')}
             </p>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tightest text-foreground leading-tight italic">
            {t('title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground/60">
            {t('description')}
          </p>
        </div>
      </section>

      <div className="grid gap-8 grid-cols-1 xl:grid-cols-12 items-start">
        <form className="xl:col-span-4 rounded-[40px] border border-border bg-card p-10   overflow-hidden relative group" onSubmit={submit}>
           <div className="absolute inset-0 bg-gradient-to-b from-[#ffc105]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
           <div className="relative z-10">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">
                    {editingId ? t('form.edit') : t('form.new')}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-foreground uppercase tracking-tightest italic">
                    {editingId ? t('form.updateTitle') : t('form.createTitle')}
                  </h2>
                </div>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl font-black uppercase tracking-widest text-[10px] h-8"
                    onClick={() => {
                      setEditingId(null);
                      reset(emptyValues);
                    }}
                  >
                    <XCircle className="ltr:mr-2 rtl:ml-2 h-3.5 w-3.5" />
                    {t('form.reset')}
                  </Button>
                )}
              </div>

              <div className="space-y-6">
                <FormField label={t('form.nameEn')} error={errors.name_en?.message}>
                  <div className="relative group/field">
                    <Input {...register("name_en")} placeholder="e.g. Cairo" className="bg-accent/30 border-border/50 h-12 rounded-2xl pl-4 focus:ring-[#ffc105] transition-all" />
                  </div>
                </FormField>
                <FormField label={t('form.nameAr')} error={errors.name_ar?.message}>
                  <div className="relative group/field">
                    <Input dir="rtl" {...register("name_ar")} placeholder="e.g. القاهرة" className="bg-accent/30 border-border/50 h-12 rounded-2xl pr-4 focus:ring-[#ffc105] transition-all" />
                  </div>
                </FormField>
                <FormField label={t('form.fee')} error={errors.shippingFee?.message}>
                  <div className="relative group/field">
                    <div className="absolute ltr:right-4 rtl:left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">EGP</div>
                    <Input step="0.01" type="number" {...register("shippingFee")} placeholder="0.00" className="bg-accent/30 border-border/50 h-12 rounded-2xl px-4 focus:ring-[#ffc105] transition-all" />
                  </div>
                </FormField>
                {!editingId && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-accent/10">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em]">{t('form.activeLabel')}</Label>
                      <Switch
                        checked={isActiveValue}
                        onCheckedChange={(checked) => reset({ ...watch(), isActive: checked })}
                      />
                    </div>
                  </div>
                )}
              </div>


              <Button disabled={isSubmitting} type="submit" className="mt-8 w-full rounded-2xl h-14 bg-foreground text-background hover:bg-[#ffc105] hover:text-black transition-all shadow-xl font-black uppercase tracking-[0.2em] text-[10px]">
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                    {t('form.saving')}
                  </div>
                ) : (
                  <>
                    <Sparkles className="ltr:mr-3 rtl:ml-3 h-4 w-4" />
                    {editingId ? t('form.submitUpdate') : t('form.submitCreate')}
                  </>
                )}
              </Button>
           </div>
        </form>

        <section className="xl:col-span-8 rounded-[40px] border border-border bg-card   overflow-hidden group transition-all hover:border-[#ffc105]/10">
          <div className="border-b border-border bg-accent/30 px-10 py-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
               <div className="h-6 w-1 bg-[#ffc105] rounded-full" />
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">{t('table.badge')}</p>
                  <h2 className="text-2xl font-black text-foreground uppercase tracking-tightest italic leading-none mt-1">{t('table.title')}</h2>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <span className="rounded-full border border-border bg-background px-5 py-2 text-[10px] font-black text-muted-foreground/60 font-mono tracking-widest uppercase shadow-inner">
                 {governorates ? t('table.total', { count: governorates.length }) : t('table.loading')}
               </span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="bg-accent/50 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 border-b border-border">
                <tr>
                  <th className="sticky left-0 bg-card py-6 px-10 z-10">{t('table.columns.name')}</th>
                  <th className="py-6 px-6">{t('table.columns.fee')}</th>
                  <th className="py-6 px-6">{t('table.columns.status')}</th>
                  <th className="py-6 px-10 text-right">{t('table.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {governorates?.map((gov) => (
                  <tr key={gov._id} className="group/row hover:bg-accent/20 transition-all">
                    <td className="sticky left-0 bg-card py-8 px-10 align-middle z-10 group-hover/row:bg-accent/20 transition-all border-r border-border/50">
                      <div className="font-black text-foreground uppercase tracking-tightest leading-none">{gov.name_en}</div>
                      <div className="mt-2 text-xs font-bold text-muted-foreground/40 italic" dir="rtl">{gov.name_ar}</div>
                    </td>
                    <td className="py-8 px-6 align-middle font-mono font-black text-base text-muted-foreground group-hover/row:text-foreground transition-colors">
                      {gov.shippingFee.toLocaleString(locale)} <span className="text-[10px] uppercase tracking-widest text-muted-foreground/30">EGP</span>
                    </td>
                    <td className="py-8 px-6 align-middle">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          gov.isActive
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-destructive/10 border-destructive/20 text-destructive"
                        )}
                      >
                        {gov.isActive ? (
                          <>
                            <CheckCircle2 size={10} />
                            {t('table.status.active')}
                          </>
                        ) : (
                          <>
                            <XCircle size={10} />
                            {t('table.status.inactive')}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-8 px-10 align-middle text-right">
                      <div className="flex items-center justify-end gap-2  transition-opacity">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-xl h-9 px-4 border-border/50 hover:bg-[#ffc105] hover:border-[#ffc105] hover:text-black font-black uppercase tracking-widest text-[10px] transition-all"
                          onClick={() => setEditingId(gov._id)}
                        >
                          <Pencil size={12} className="ltr:mr-2 rtl:ml-2" />
                          {t('table.actions.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === gov._id}
                          className={cn(
                            "rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[10px] transition-all",
                            gov.isActive 
                              ? "text-destructive hover:bg-destructive/10 hover:text-destructive" 
                              : "text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                          )}
                          onClick={() => void toggleStatus(gov._id)}
                        >
                          {busyId === gov._id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                          ) : gov.isActive ? (
                            <>
                              <Power size={12} className="ltr:mr-2 rtl:ml-2" />
                              {t('table.actions.deactivate')}
                            </>
                          ) : (
                            <>
                              <Power size={12} className="ltr:mr-2 rtl:ml-2" />
                              {t('table.actions.activate')}
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!governorates && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                       <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ffc105] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                       <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t('table.loading')}</p>
                    </td>
                  </tr>
                )}
                {governorates?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-32 text-center">
                       <div className="flex flex-col items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-[#ffc105]/10 flex items-center justify-center">
                             <Truck size={32} className="text-[#ffc105]" />
                          </div>
                          <p className="text-sm font-black uppercase tracking-widest text-[#ffc105]/60">{t('table.empty')}</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="rounded-[32px] border border-[#ffc105]/10 bg-[#ffc105]/5 p-8 flex items-start gap-4">
         <div className="h-10 w-10 min-w-10 rounded-2xl bg-[#ffc105]/20 flex items-center justify-center text-[#ffc105]">
            <Info size={20} />
         </div>
         <div className="space-y-1">
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground">{t('messages.infoTitle')}</h4>
            <p className="text-xs font-semibold leading-relaxed text-muted-foreground/60 max-w-4xl">
              {t('messages.infoDescription')}
            </p>
         </div>
      </div>
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
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">{label}</Label>
      {children}
      {error && (
        <p className="px-1 text-[10px] font-black text-destructive uppercase tracking-widest animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}


