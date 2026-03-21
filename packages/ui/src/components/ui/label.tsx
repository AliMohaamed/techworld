"use client"

import * as React from "react"

import { cn } from "../../lib/utils"

function Label({
  className,
  optional,
  children,
  ...props
}: React.ComponentProps<"label"> & { optional?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 text-foreground/70",
        className
      )}
      {...props}
    >
      {children}
      {optional && (
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
          (Optional)
        </span>
      )}
    </label>
  );
}

export { Label }
