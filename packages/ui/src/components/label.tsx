import * as React from "react";
import { cn } from "../lib/utils";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  optional?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, optional, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5 px-0.5",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        {optional && (
          <span className="text-[10px] lowercase tracking-tight text-zinc-600 font-normal italic">
            (optional)
          </span>
        )}
      </label>
    );
  },
);
Label.displayName = "Label";

export { Label };
