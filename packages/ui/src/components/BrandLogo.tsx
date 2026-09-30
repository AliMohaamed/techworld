import * as React from "react";
import { cn } from "../lib/utils";

// Assets are served by each app from /public/brand.
const MARK_SRC = "/brand/tw-mark.png";
const WORDMARK_SRC = "/brand/tw-wordmark.png";

function maskStyle(src: string): React.CSSProperties {
  return {
    maskImage: `url(${src})`,
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
  };
}

const WORDMARK_MASK = maskStyle(WORDMARK_SRC);

type BrandLogoSize = "sm" | "md" | "lg";

const STACKED_SIZES: Record<BrandLogoSize, { mark: string; wordmark: string; gap: string }> = {
  sm: { mark: "h-10", wordmark: "h-[11px]", gap: "gap-2" },
  md: { mark: "h-14", wordmark: "h-[14px]", gap: "gap-2.5" },
  lg: { mark: "h-20", wordmark: "h-5", gap: "gap-3.5" },
};

// Horizontal lockup, split from the designer artwork so the text can follow the
// theme colour. Positions are fractions of the original 1010x199 lockup.
const LOCKUP_MARK_SRC = "/brand/tw-lockup-mark.png";
const LOCKUP_TEXT_SRC = "/brand/tw-lockup-text.png";
const LOCKUP_TEXT_MASK = maskStyle(LOCKUP_TEXT_SRC);

export interface BrandLogoProps {
  /**
   * horizontal: designed lockup, sized by height via className (headers).
   * stacked: mark above the wordmark (footers, auth). mark: icon only.
   */
  variant?: "horizontal" | "stacked" | "mark";
  /** Stacked variant only. */
  size?: BrandLogoSize;
  className?: string;
}

/**
 * TechWorld logo. The wordmark is drawn through a CSS mask so it follows the
 * text colour: dark on light backgrounds, brand yellow in dark mode.
 */
export function BrandLogo({ variant = "horizontal", size = "md", className }: BrandLogoProps) {
  if (variant === "mark") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={MARK_SRC} alt="TechWorld" draggable={false} className={cn("h-9 w-auto select-none", className)} />
    );
  }

  if (variant === "horizontal") {
    return (
      <span
        role="img"
        aria-label="TechWorld"
        dir="ltr"
        className={cn("relative inline-block h-10 shrink-0 select-none aspect-[1010/199]", className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOCKUP_MARK_SRC}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute left-0 top-0 h-full w-[27.33%]"
        />
        <span
          aria-hidden
          className="absolute left-[30.3%] top-[53.27%] h-[36.18%] w-[69.7%] bg-current text-foreground dark:text-primary"
          style={LOCKUP_TEXT_MASK}
        />
      </span>
    );
  }

  const preset = STACKED_SIZES[size];

  return (
    <span
      role="img"
      aria-label="TechWorld"
      // The lockup is Latin artwork; keep its order fixed in RTL layouts.
      dir="ltr"
      className={cn(
        "inline-flex shrink-0 select-none",
        "flex-col items-center",
        preset.gap,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MARK_SRC} alt="" aria-hidden draggable={false} className={cn(preset.mark, "w-auto")} />
      <span
        aria-hidden
        className={cn(
          preset.wordmark,
          "aspect-[720/74] bg-current text-foreground dark:text-primary",
        )}
        style={WORDMARK_MASK}
      />
    </span>
  );
}
