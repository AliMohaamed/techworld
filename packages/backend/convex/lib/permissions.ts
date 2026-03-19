import { v } from "convex/values";

export const permissionValues = [
  "VIEW_ORDERS",
  "VERIFY_PAYMENTS",
  "MANAGE_SHIPPING_STATUS",
  "PROCESS_RETURNS",
  "MANAGE_PRODUCTS",
  "ADJUST_REAL_STOCK",
  "MANAGE_DISPLAY_STOCK",
  "MANAGE_CATEGORIES",
  "VIEW_FINANCIALS",
  "MANAGE_SYSTEM_CONFIG",
  "RESOLVE_FRAUD",
  "MANAGE_USERS"
] as const;

export type Permission = (typeof permissionValues)[number];
type PermissionValue = string | number | bigint | boolean;

export function hasPermission(
  user: { permissions?: readonly PermissionValue[] | undefined } | null | undefined,
  permission: Permission,
) {
  return user?.permissions?.some((grantedPermission) => String(grantedPermission) === permission) ?? false;
}

export const permissionValidators = permissionValues.map((permission) =>
  v.literal(permission)
) as [
  ReturnType<typeof v.literal>,
  ...ReturnType<typeof v.literal>[]
];
