/**
 * Storefront-facing rating summary derived from the denormalised aggregates
 * on the product row. Average is rounded to one decimal.
 */
export function ratingSummaryOf(product: { rating_sum?: number; review_count?: number }) {
  const reviewCount = product.review_count ?? 0;
  const ratingAverage =
    reviewCount > 0 ? Math.round(((product.rating_sum ?? 0) / reviewCount) * 10) / 10 : 0;
  return { ratingAverage, reviewCount };
}
