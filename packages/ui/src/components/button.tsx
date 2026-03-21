"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#ffc105] text-black hover:bg-[#f0b700]",
        outline:
          "border-white/10 bg-transparent text-white hover:border-[#ffc105]/40 hover:text-[#ffc105]",
        ghost: "bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white"
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 lg:h-9 max-lg:h-11 px-3 text-xs",
        lg: "h-12 px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
