/**
 * Manual merchandising order for products. Pure helpers shared by the backend
 * and the admin reorder UI so both sort identically.
 *
 * - "sort_order": position on the global all-products listing
 * - "category_sort_order": position within the product's own category page
 */
export type ManualOrderKey = "sort_order" | "category_sort_order";

export type ManuallyOrdered = {
  _creationTime: number;
  sort_order?: number;
  category_sort_order?: number;
};

/** Positioned products first (ascending), unpositioned ones after, newest first. */
export const byManualOrder =
  (key: ManualOrderKey) =>
  (a: ManuallyOrdered, b: ManuallyOrdered) => {
    const aOrder = a[key] ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b[key] ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b._creationTime - a._creationTime;
  };

export const maxPosition = (rows: ManuallyOrdered[], key: ManualOrderKey) =>
  rows.reduce((max, row) => Math.max(max, row[key] ?? 0), 0);
