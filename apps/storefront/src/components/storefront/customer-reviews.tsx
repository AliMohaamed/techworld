import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Quote } from "lucide-react";
import { cn } from "@techworld/ui";
import { Link } from "@/navigation";
import { StarRating } from "./star-rating";

type Highlight = {
  _id: string;
  authorName: string;
  rating: number;
  comment: string;
  updatedAt: number;
  product: {
    _id: string;
    slug?: string;
    name_en: string;
    name_ar: string;
    image: string | null;
  };
};

interface CustomerReviewsProps {
  reviews: Highlight[];
  ratingAverage: number;
  reviewCount: number;
}

/** Below this many reviews a moving marquee looks sparse, so show a static grid. */
const MARQUEE_MIN = 6;
/** Each marquee copy repeats its reviews up to this many cards so it always spans ultra-wide screens. */
const MARQUEE_ROW_CARDS = 8;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

export default async function CustomerReviews({ reviews, ratingAverage, reviewCount }: CustomerReviewsProps) {
  const t = await getTranslations("CustomerReviews");
  const locale = await getLocale();
  if (reviews.length === 0) return null;

  const dir = locale === "ar" ? "rtl" : "ltr";
  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short", year: "numeric" });

  const renderCard = (review: Highlight, className?: string, key: string = review._id) => {
    const productName = locale === "en" ? review.product.name_en : review.product.name_ar;
    return (
      <figure
        key={key}
        dir={dir}
        className={cn(
          "flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <StarRating value={review.rating} size={15} />
          <span className="sr-only">{t("ratingLabel", { rating: review.rating })}</span>
          <Quote size={26} className="text-primary/25 rtl:-scale-x-100" aria-hidden />
        </div>

        <blockquote dir="auto" className="line-clamp-5 flex-1 text-sm leading-relaxed text-foreground/90 md:text-[15px]">
          {review.comment}
        </blockquote>

        <figcaption className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-space-grotesk text-sm font-bold uppercase text-primary"
            >
              {initialsOf(review.authorName)}
            </span>
            <div className="min-w-0">
              <p dir="auto" className="truncate text-sm font-semibold text-foreground">{review.authorName}</p>
              <p className="text-xs text-label-muted">{dateFormat.format(review.updatedAt)}</p>
            </div>
          </div>

          <Link
            href={`/products/${review.product.slug || review.product._id}`}
            title={productName}
            className="flex max-w-[45%] shrink-0 items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary ltr:pl-1 ltr:pr-3 rtl:pl-3 rtl:pr-1"
          >
            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-background">
              {review.product.image ? (
                <Image src={review.product.image} alt="" fill sizes="28px" className="object-contain" />
              ) : null}
            </span>
            <span className="truncate">{productName}</span>
          </Link>
        </figcaption>
      </figure>
    );
  };

  const useMarquee = reviews.length >= MARQUEE_MIN;
  const half = Math.ceil(reviews.length / 2);
  const rows = [reviews.slice(0, half), reviews.slice(half)].map((row) => {
    let filled = row;
    while (filled.length < MARQUEE_ROW_CARDS) filled = filled.concat(row);
    return filled;
  });
  const marqueeCard = "w-[300px] shrink-0 md:w-[380px]";

  return (
    <section id="reviews" className="relative overflow-hidden bg-background py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <div className="container relative mx-auto mb-10 px-4 md:mb-14 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-3">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {t("badge")}
            </span>
            <h2 className="font-space-grotesk text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              {t("title")} <span className="text-primary">{t("accentTitle")}</span>
            </h2>
            <p className="text-sm leading-relaxed text-label-muted md:text-base">{t("description")}</p>
          </div>

          {reviewCount > 0 ? (
            <div className="flex items-center gap-4 self-start rounded-3xl border border-border bg-card px-5 py-4 md:self-auto">
              <p className="font-space-grotesk text-5xl font-bold leading-none text-foreground">
                {ratingAverage.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </p>
              <div className="space-y-1.5">
                <StarRating value={ratingAverage} size={16} />
                <p className="text-xs font-medium text-label-muted">{t("basedOn", { count: reviewCount })}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {useMarquee ? (
        // The track always runs in LTR so the loop math is direction-agnostic; each card restores the locale direction.
        <div dir="ltr" className="reviews-marquee relative space-y-5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex overflow-hidden">
              <div className={cn("reviews-marquee-track flex w-max", rowIndex === 1 && "reviews-marquee-reverse")}>
                {/* Two identical copies, each padded by one gap, so translating -50% loops seamlessly. */}
                <div className="flex gap-5 pe-5">
                  {row.map((review, i) => renderCard(review, marqueeCard, `${review._id}-${i}`))}
                </div>
                <div aria-hidden inert className="flex gap-5 pe-5">
                  {row.map((review, i) => renderCard(review, marqueeCard, `${review._id}-${i}`))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="container mx-auto grid gap-5 px-4 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
          {reviews.map((review) => renderCard(review))}
        </div>
      )}
    </section>
  );
}
