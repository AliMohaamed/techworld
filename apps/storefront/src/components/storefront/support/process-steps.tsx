export type ProcessStep = {
  title: string;
  description: string;
  meta?: string;
};

/**
 * Numbered horizontal process used by the shipping journey and the returns
 * flow. Collapses to a single column with a connecting rail on narrow screens.
 */
export default function ProcessSteps({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li
          key={step.title}
          className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg md:p-8"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 font-space-grotesk text-sm font-black text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
            {index + 1}
          </span>
          <h3 className="font-space-grotesk text-sm font-bold tracking-tight text-foreground md:text-base">
            {step.title}
          </h3>
          <p className="text-sm leading-relaxed text-label-muted">
            {step.description}
          </p>
          {step.meta && (
            <p className="mt-auto pt-2 font-space-grotesk text-[10px] font-black uppercase tracking-[0.25em] text-primary">
              {step.meta}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
