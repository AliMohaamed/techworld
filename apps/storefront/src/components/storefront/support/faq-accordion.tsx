"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type Props = {
  items: FaqItem[];
  /** Index of the item expanded on first paint; -1 keeps all collapsed. */
  defaultOpenIndex?: number;
  className?: string;
};

/**
 * Disclosure list for FAQ content. Multiple panels may be open at once — on a
 * help page people compare answers rather than read one at a time.
 */
export default function FaqAccordion({
  items,
  defaultOpenIndex = -1,
  className,
}: Props) {
  const baseId = useId();
  const [openIds, setOpenIds] = useState<string[]>(() =>
    items[defaultOpenIndex] ? [items[defaultOpenIndex].id] : []
  );

  const toggle = (id: string) =>
    setOpenIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id]
    );

  return (
    <div className={cn("divide-y divide-border rounded-2xl border border-border bg-card", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const buttonId = `${baseId}-${item.id}-button`;
        const panelId = `${baseId}-${item.id}-panel`;

        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-6 px-6 py-5 text-start transition-colors hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary md:px-8 md:py-6"
              >
                <span className="font-space-grotesk text-sm font-bold tracking-tight text-foreground md:text-base">
                  {item.question}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-label-muted transition-all",
                    isOpen && "rotate-45 border-primary/30 bg-primary/10 text-primary"
                  )}
                >
                  <Plus size={16} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-6 pb-6 md:px-8 md:pb-8"
            >
              <p className="max-w-3xl text-sm leading-relaxed text-label-muted">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
