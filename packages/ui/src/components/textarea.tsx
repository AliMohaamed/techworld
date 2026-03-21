import * as React from "react";
import { cn } from "../lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            "flex min-h-[140px] w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-300",
            "hover:bg-white/[0.05] hover:border-white/10",
            "focus:border-[#ffc105]/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#ffc105]/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
