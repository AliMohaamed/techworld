import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Quote } from "lucide-react";
import { cn } from "@techworld/ui";
import { Link } from "@/navigation";
import { StarRating } from "./star-rating";
import { testimonials, type Testimonial } from "@/content/testimonials";
import { previewTestimonials } from "@/content/testimonials.preview";

/** Below this many reviews a moving marquee looks sparse, so show a static grid. */
const MARQUEE_MIN = 6;
/** Each marquee copy repeats its reviews up to this many cards so it always spans ultra-wide screens. */
const MARQUEE_ROW_CARDS = 8;

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
}

/** Landing-page testimonials, read only from the curated list in `@/content/testimonials`. */
export default async function CustomerReviews() {
  const t = await getTranslations("CustomerReviews");
  const locale = await getLocale();
  // Invented design-preview samples fill the section only under `next dev`; production shows real entries or nothing.
  // const isPreview = testimonials.length === 0 && process.env.NODE_ENV === "development";
  const isPreview = testimonials.length === 0 ;
  const reviews = isPreview ? previewTestimonials : testimonials;
  if (reviews.length === 0) return null;

  const dir = locale === "ar" ? "rtl" : "ltr";
  const dateFormat = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

  const isEn = locale === "en";
  const renderCard = (review: Testimonial, className?: string, key: string = review.id) => {
    const comment = isEn ? review.comment.en ?? review.comment.ar : review.comment.ar;
    const city = review.city ? (isEn ? review.city.en : review.city.ar) : undefined;
    const productName = review.product ? (isEn ? review.product.en : review.product.ar) : undefined;
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
          <div className="flex items-center gap-2">
            {isPreview ? (
              <span className="rounded-full border border-dashed border-primary/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {t("sample")}
              </span>
            ) : null}
            <Quote size={26} className="text-primary/25 rtl:-scale-x-100" aria-hidden />
          </div>
        </div>

        <blockquote dir="auto" className="line-clamp-5 flex-1 text-sm leading-relaxed text-foreground/90 md:text-[15px]">
          {comment}
        </blockquote>

        <figcaption className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 font-space-grotesk text-sm font-bold uppercase text-primary"
            >
              {initialsOf(review.name)}
            </span>
            <div className="min-w-0">
              <p dir="auto" className="truncate text-sm font-semibold text-foreground">{review.name}</p>
              <p className="flex items-center gap-1 text-xs text-label-muted">
                {city ? (
                  <>
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{city}</span>
                    <span aria-hidden>·</span>
                  </>
                ) : null}
                <span className="shrink-0">{dateFormat.format(new Date(`${review.date}-01T00:00:00Z`))}</span>
              </p>
            </div>
          </div>

          {review.product && productName ? (
            <Link
              href={`/products/${review.product.slug}`}
              title={productName}
              className="max-w-[45%] shrink-0 truncate rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {productName}
            </Link>
          ) : null}
        </figcaption>
      </figure>
    );
  };

  const useMarquee = reviews.length >= MARQUEE_MIN;
  const half = Math.ceil(reviews.length / 2);
  const rows = [reviews.slice(0, half), reviews.slice(half)].map((row) => {
    let filled = row;
    while (row.length > 0 && filled.length < MARQUEE_ROW_CARDS) filled = filled.concat(row);
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
                  {row.map((review, i) => renderCard(review, marqueeCard, `${review.id}-${i}`))}
                </div>
                <div aria-hidden inert className="flex gap-5 pe-5">
                  {row.map((review, i) => renderCard(review, marqueeCard, `${review.id}-${i}`))}
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
