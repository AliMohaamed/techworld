import { Doc } from "../_generated/dataModel";

/** Whether a SKU can currently be sold. */
export function isSkuInStock(sku: Pick<Doc<"skus">, "real_stock" | "isActive">) {
  return sku.isActive !== false && sku.real_stock > 0;
}

/**
 * Storefront-safe SKU shape. real_stock never leaves the server on public
 * queries; shoppers only learn whether a variant is in stock.
 */
export function toPublicSku<T extends Pick<Doc<"skus">, "real_stock" | "isActive">>(sku: T) {
  const { real_stock: _realStock, ...rest } = sku;
  return { ...rest, inStock: isSkuInStock(sku) };
}
