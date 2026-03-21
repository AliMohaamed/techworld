"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "../../lib/utils"

function Switch({
  className,
  size = "default",
  label,
  onChange,
  onCheckedChange,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
  label?: string;
  onChange?: (event: { target: { checked: boolean; name?: string } }) => void;
}) {
  const handleCheckedChange = (checked: boolean, event: any) => {
    onCheckedChange?.(checked, event);
    if (onChange) {
      onChange({
        target: {
          checked,
          name: props.name,
        },
      });
    }
  };

  const switchElement = (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      onCheckedChange={handleCheckedChange}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-4 data-[size=sm]:w-8 data-checked:bg-primary data-unchecked:bg-white/10 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-lg transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-4px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-4px)] group-data-[size=default]/switch:translate-x-1 group-data-[size=sm]/switch:translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  );

  if (!label) return switchElement;

  return (
    <div className="flex items-center gap-2">
      {switchElement}
      <span className="text-sm font-medium leading-none select-none text-foreground/80 cursor-pointer">
        {label}
      </span>
    </div>
  );
}

export { Switch }
