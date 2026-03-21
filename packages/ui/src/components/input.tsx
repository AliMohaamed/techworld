import * as React from "react";
import { cn } from "../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-zinc-500 outline-none transition-all duration-300",
            "hover:bg-white/[0.05] hover:border-white/10",
            "focus:border-[#ffc105]/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-[#ffc105]/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-11",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
