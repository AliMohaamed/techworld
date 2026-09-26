import { ReactNode } from "react";
import { Link } from "@/navigation";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

type Props = {
  badge: string;
  title: string;
  accent?: string;
  description: string;
  breadcrumbs: Crumb[];
  children?: ReactNode;
};

/**
 * Shared hero for the support surfaces (shipping, returns, tracking, help).
 * Mirrors the catalog hero so the support section does not read as a bolt-on.
 */
export default function SupportHero({
  badge,
  title,
  accent,
  description,
  breadcrumbs,
  children,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-12 transition-all sm:px-8 md:px-14 md:py-16 lg:py-20">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative space-y-6">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-label-muted">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight
                    size={12}
                    aria-hidden="true"
                    className="text-label-muted/50 rtl:rotate-180"
                  />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-primary"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-foreground">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
              {badge}
            </p>
          </div>

          <h1 className="font-space-grotesk text-4xl font-black uppercase leading-none tracking-tightest text-foreground sm:text-5xl md:text-7xl">
            {title}
            {accent ? <span className="text-primary"> {accent}</span> : null}
          </h1>

          <p className="max-w-xl text-sm font-medium leading-relaxed tracking-tight text-label-muted md:text-base">
            {description}
          </p>

          {children}
        </div>
      </div>
    </section>
  );
}
