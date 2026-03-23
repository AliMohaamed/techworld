import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectNativeProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-foreground outline-none transition-all duration-300 pr-10",
            "hover:bg-white/[0.08] hover:border-white/20",
            "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground z-10 transition-colors group-focus-within:text-primary">
          <ChevronDown size={18} />
        </div>
      </div>
    );
  },
);
SelectNative.displayName = "SelectNative";

export { SelectNative };
