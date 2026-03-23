import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
          icon && "pl-11",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!icon) return inputElement

    return (
      <div className="relative w-full">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">
          {icon}
        </div>
        {inputElement}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
