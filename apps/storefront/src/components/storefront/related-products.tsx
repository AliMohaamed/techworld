"use client";

import { Component, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { useTranslations, useLocale } from "next-intl";
import ProductCard from "@/components/storefront/product-card";

/** Start fetching this far before the section scrolls into view, so data is usually ready first. */
const PREFETCH_MARGIN = "600px 0px";
const RETRY_DELAY_MS = 500;

const ROW_CLASS =
  "flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scroll-px-4 md:-mx-8 md:px-8 md:scroll-px-8 lg:mx-0 lg:px-0 lg:pb-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const ITEM_CLASS = "w-[70vw] max-w-[280px] shrink-0 snap-start lg:w-auto lg:max-w-none";

interface RelatedProductsProps {
  productId: Id<"products">;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  retryCount: number;
}

/** Retries a failed fetch once (FR-011), then hides the section silently. */
class RelatedProductsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, retryCount: 0 };
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch() {
    if (this.state.retryCount < 1) {
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({ hasError: false, retryCount: prev.retryCount + 1 }));
      }, RETRY_DELAY_MS);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.retryTimer);
  }

  render() {
    if (this.state.hasError) {
      return this.state.retryCount >= 1 ? null : <RelatedProductsSkeleton />;
    }
    return this.props.children;
  }
}

/** Flips to true once the element comes within `rootMargin` of the viewport, and stays true. */
function useInViewOnce(ref: RefObject<Element | null>, rootMargin: string) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (inView || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin, inView]);

  return inView;
}

function SectionShell({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <div className="container mx-auto px-4 md:px-8 mt-24">
      <section aria-busy={busy || undefined} className="py-12 border-t border-border/40">
        {children}
      </section>
    </div>
  );
}

function RelatedProductsSkeleton() {
  return (
    <SectionShell busy>
      <div className="mb-8 space-y-2">
        <div className="h-3 w-20 bg-muted/50 rounded animate-pulse" />
        <div className="h-7 w-48 bg-muted/70 rounded animate-pulse" />
      </div>
      <div className={ROW_CLASS}>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`${ITEM_CLASS} flex flex-col overflow-hidden rounded-2xl border border-border bg-card`}
          >
            <div className="aspect-square w-full bg-muted/60 animate-pulse" />
            <div className="space-y-3 p-3 sm:p-4">
              <div className="h-3 w-1/3 bg-muted/60 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-muted/60 rounded animate-pulse" />
              <div className="h-6 w-1/2 bg-muted/60 rounded animate-pulse" />
              <div className="h-10 w-full bg-muted/60 rounded-xl animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function RelatedProductsContent({ productId }: RelatedProductsProps) {
  const t = useTranslations("ProductDetail.related");
  const locale = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shouldFetch = useInViewOnce(sentinelRef, PREFETCH_MARGIN);
  const isVisible = useInViewOnce(sentinelRef, "0px");

  const products = useQuery(api.products.getRelatedProducts, shouldFetch ? { productId } : "skip");

  if (products === undefined) {
    // Takes no space until the shopper actually reaches the section, so an empty
    // result collapses off-screen instead of shifting content they are reading.
    return (
      <div ref={sentinelRef} className="min-h-px">
        {isVisible ? <RelatedProductsSkeleton /> : null}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <SectionShell>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
            {t("badge")}
          </span>
        </div>
        <h2 className="font-space-grotesk text-2xl font-bold tracking-tight text-foreground uppercase">
          {t("title")}
        </h2>
        <p className="text-label-muted text-xs md:text-sm mt-1">{t("subtitle")}</p>
      </div>

      <div className={ROW_CLASS}>
        {products.map((product) => (
          <div key={product._id} className={ITEM_CLASS}>
            <ProductCard
              product={{
                ...product,
                categoryName: locale === "ar" ? product.categoryName_ar : product.categoryName_en,
              }}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function RelatedProducts({ productId }: RelatedProductsProps) {
  // Keyed so a client-side navigation to another product starts with a fresh retry budget.
  return (
    <RelatedProductsErrorBoundary key={productId}>
      <RelatedProductsContent productId={productId} />
    </RelatedProductsErrorBoundary>
  );
}
