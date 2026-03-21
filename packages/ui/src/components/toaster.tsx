"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      theme="dark"
      toastOptions={{
        className: "border border-border bg-background text-foreground",
      }}
    />
  );
}
