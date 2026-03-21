import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-12 w-full appearance-none rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-300 pr-10",
            "hover:bg-white/[0.05] hover:border-white/10",
            "focus:border-[#ffc105]/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#ffc105]/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 z-10">
          <ChevronDown size={16} />
        </div>
      </div>
    );
  },
);
Select.displayName = "Select";

export { Select };
