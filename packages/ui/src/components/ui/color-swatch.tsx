import React from "react";
import { cn } from "../../lib/utils";
import { resolveColor, isLightColor } from "../../lib/colors";

export interface ColorSwatchProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> {
  color?: string | null;
  fallbackName?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  selected?: boolean;
}

const sizeClasses = {
  xs: "h-2.5 w-2.5",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export const ColorSwatch = React.forwardRef<HTMLSpanElement, ColorSwatchProps>(
  (
    {
      color,
      fallbackName,
      size = "sm",
      selected = false,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const resolved = resolveColor(color, fallbackName);
    const light = resolved ? isLightColor(resolved) : false;

    if (!resolved) {
      return (
        <span
          ref={ref}
          className={cn(
            "inline-block rounded-full border border-border/60 bg-muted/60 shrink-0",
            sizeClasses[size],
            selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            className
          )}
          {...props}
        />
      );
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-block rounded-full shrink-0 transition-transform duration-200",
          sizeClasses[size],
          light
            ? "border border-black/25 dark:border-white/20 shadow-xs"
            : "border border-white/20 dark:border-white/10 shadow-xs",
          selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
          className
        )}
        style={{
          backgroundColor: resolved,
          boxShadow: light
            ? "inset 0 1px 2px rgba(0,0,0,0.12)"
            : "inset 0 1px 2px rgba(255,255,255,0.15)",
          ...style,
        }}
        {...props}
      />
    );
  }
);

ColorSwatch.displayName = "ColorSwatch";
