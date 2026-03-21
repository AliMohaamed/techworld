import * as React from "react";
import { cn } from "../lib/utils";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label?: React.ReactNode;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, checked, onChange, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "flex items-center gap-3 cursor-pointer group select-none py-1.5 px-0.5",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        <div className="relative isolate">
          <input
            type="checkbox"
            className="sr-only peer"
            ref={ref}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            {...props}
          />
          {/* Track */}
          <div
            className={cn(
              "h-6 w-11 rounded-full border border-white/10 bg-white/5 transition-all duration-300 peer-checked:bg-[#ffc105] peer-checked:border-[#ffc105]/50 group-hover:border-white/20",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-[#ffc105]/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-[#050505]",
            )}
          />
          {/* Thumb */}
          <div
            className={cn(
              "absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-zinc-400 shadow-sm transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-white",
              "group-hover:bg-zinc-300 group-hover:scale-105 peer-checked:group-hover:bg-white",
            )}
          />
        </div>
        {label && (
          <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
            {label}
          </span>
        )}
      </label>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
