"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { Loader2, PackageCheck } from "lucide-react";
import { Button } from "@techworld/ui/button";

type DeliveredConfirmDialogProps = {
  open: boolean;
  shortCode?: string | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Marking an order DELIVERED reports the sale to Meta, so every route to it
 * asks first. The default focus is on "Not yet", so a stray Enter does not
 * report a sale.
 */
export function DeliveredConfirmDialog({ open, shortCode, busy, onConfirm, onCancel }: DeliveredConfirmDialogProps) {
  const t = useTranslations("Orders.deliveredConfirm");

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && !busy && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          role="alertdialog"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-border bg-card p-6 shadow-2xl outline-none md:p-8"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <PackageCheck className="h-5 w-5" aria-hidden />
          </span>
          <DialogPrimitive.Title className="mt-4 text-lg font-bold leading-snug text-foreground">
            {t("title")}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("body", { code: shortCode ?? "" })}
          </DialogPrimitive.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" autoFocus disabled={busy} className="h-11 rounded-xl px-4 text-sm font-bold">
                {t("cancel")}
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-600/90"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("confirm")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
