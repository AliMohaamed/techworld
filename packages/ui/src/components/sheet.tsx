"use client";

import * as React from "react";
import { Dialog as BaseDialog } from "@base-ui/react";
import { cn } from "../lib/utils";

const Sheet = BaseDialog.Root;
const SheetTrigger = BaseDialog.Trigger;
const SheetPortal = BaseDialog.Portal;
const SheetClose = BaseDialog.Close;

const SheetBackdrop = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>
>(({ className, ...props }, ref) => (
  <BaseDialog.Backdrop
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetBackdrop.displayName = "SheetBackdrop";

const SheetPopup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & { side?: "left" | "right" | "top" | "bottom" }
>(({ className, side = "right", ...props }, ref) => (
  <BaseDialog.Popup
    ref={ref}
    className={cn(
      "fixed z-50 gap-4 bg-[#0b0b0b] p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 border-white/10",
      side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
      side === "top" && "inset-x-0 top-0 h-auto w-full border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
      side === "bottom" && "inset-x-0 bottom-0 h-auto w-full border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      className
    )}
    {...props}
  />
));
SheetPopup.displayName = "SheetPopup";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
  <BaseDialog.Title
    ref={ref}
    className={cn("text-lg font-semibold text-white", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
  <BaseDialog.Description
    ref={ref}
    className={cn("text-sm text-zinc-400", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetClose,
  SheetBackdrop,
  SheetPopup,
  SheetTitle,
  SheetDescription,
};
