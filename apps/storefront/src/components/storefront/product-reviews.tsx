"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import type { Id } from "@backend/convex/_generated/dataModel";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@techworld/ui";
import { useSession } from "@/providers/session-provider";
import { StarRating } from "./star-rating";

const MAX_NAME_LENGTH = 60;
const MAX_COMMENT_LENGTH = 1000;

export function ProductReviews({ productId }: { productId: Id<"products"> }) {
  const t = useTranslations("ProductDetail.reviews");
  const locale = useLocale();
  const data = useQuery(api.reviews.listForProduct, { productId });

  if (data === undefined) {
    return <div className="h-64 animate-pulse rounded-2xl bg-muted" />;
  }
  if (data === null) return null;

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <section id="reviews" className="scroll-mt-28">
      <h2 className="mb-8 font-space-grotesk text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
        {t("title")}
      </h2>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-16">
        <div className="space-y-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-4">
              <span className="font-space-grotesk text-5xl font-black text-foreground">
                {data.reviewCount > 0 ? data.ratingAverage.toLocaleString(locale) : "–"}
              </span>
              <div className="space-y-1">
                <StarRating value={data.ratingAverage} size={18} />
                <p className="text-xs text-label-muted">{t("summary", { count: data.reviewCount })}</p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = data.distribution[stars - 1];
                const percent = data.reviewCount > 0 ? (count / data.reviewCount) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-3 text-xs">
                    <span className="inline-flex w-8 items-center gap-1 font-bold text-foreground">
                      {stars.toLocaleString(locale)}
                      <Star size={11} className="fill-primary text-primary" />
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-8 text-end tabular-nums text-label-muted">{count.toLocaleString(locale)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <ReviewForm productId={productId} />
        </div>

        <div>
          {data.reviews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-label-muted">
              {t("noReviews")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.reviews.map((review) => (
                <li key={review._id} className="py-6 first:pt-0">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold uppercase text-primary">
                        {review.authorName.charAt(0)}
                      </span>
                      <span className="font-bold text-foreground">{review.authorName}</span>
                    </div>
                    <time className="text-xs text-label-muted" dateTime={new Date(review.updatedAt).toISOString()}>
                      {dateFormatter.format(review.updatedAt)}
                    </time>
                  </div>
                  <StarRating value={review.rating} size={14} className="mb-2" />
                  {review.comment ? (
                    <p className="whitespace-pre-line break-words text-sm leading-relaxed text-label-muted">
                      {review.comment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ productId }: { productId: Id<"products"> }) {
  const t = useTranslations("ProductDetail.reviews");
  const { sessionId } = useSession();
  const myReview = useQuery(api.reviews.getMyReview, { productId, sessionId });
  const submitReview = useMutation(api.reviews.submitReview);

  // Local edits override the saved review; `null` means "not touched yet".
  const [draft, setDraft] = useState<{ rating: number; name: string; comment: string } | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const values = draft ?? {
    rating: myReview?.rating ?? 0,
    name: myReview?.authorName ?? "",
    comment: myReview?.comment ?? "",
  };
  const update = (patch: Partial<typeof values>) => setDraft({ ...values, ...patch });
  const shownRating = hoverRating || values.rating;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (values.rating < 1) {
      toast.error(t("ratingRequired"));
      return;
    }
    if (!values.name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      await submitReview({
        productId,
        sessionId,
        authorName: values.name,
        rating: values.rating,
        comment: values.comment,
      });
      setDraft(null);
      toast.success(t("success"));
    } catch (err) {
      console.error("Failed to submit review", err);
      toast.error(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-label-muted/60 outline-none transition-colors focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <h3 className="font-space-grotesk text-lg font-black uppercase tracking-tight text-foreground">
        {myReview ? t("editTitle") : t("writeTitle")}
      </h3>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase text-label-muted">{t("ratingLabel")}</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              onClick={() => update({ rating: stars })}
              onMouseEnter={() => setHoverRating(stars)}
              aria-label={t("starAria", { count: stars })}
              aria-pressed={values.rating === stars}
              className="rounded-md p-1 transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={26}
                className={cn(
                  "transition-colors",
                  stars <= shownRating ? "fill-primary text-primary" : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase text-label-muted">{t("nameLabel")}</span>
        <input
          type="text"
          value={values.name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => update({ name: event.target.value })}
          placeholder={t("namePlaceholder")}
          className={inputClass}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase text-label-muted">{t("commentLabel")}</span>
        <textarea
          value={values.comment}
          maxLength={MAX_COMMENT_LENGTH}
          rows={4}
          onChange={(event) => update({ comment: event.target.value })}
          placeholder={t("commentPlaceholder")}
          className={cn(inputClass, "resize-y")}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
      >
        {isSubmitting ? t("submitting") : myReview ? t("update") : t("submit")}
      </button>
    </form>
  );
}
