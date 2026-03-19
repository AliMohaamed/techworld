"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      theme="dark"
      toastOptions={{
        className: "border border-white/10 bg-[#111111] text-white",
      }}
    />
  );
}
