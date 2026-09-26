import { Star } from "lucide-react";
import { cn } from "@techworld/ui";

interface StarRatingProps {
  value: number;
  size?: number;
  className?: string;
}

/** Read-only 5-star display with partial fill for fractional averages. */
export function StarRating({ value, size = 14, className }: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-hidden>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, value - index));
        return (
          <span key={index} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-muted-foreground/30" />
            {fill > 0 ? (
              <span
                className="absolute inset-y-0 overflow-hidden ltr:left-0 rtl:right-0"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="fill-primary text-primary" />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
