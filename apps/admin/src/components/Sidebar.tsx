"use client";

import Link from "next/link";
import type { Route } from "next";
import { Boxes, ClipboardList, FolderTree, Home, type LucideIcon } from "lucide-react";
import type { Permission } from "@backend/convex/lib/permissions";

type StaffPermissionValue = string | number | bigint | boolean;
type SidebarRoute = "/" | "/orders" | "/catalog/categories" | "/catalog/products";

type NavItem = {
  href: SidebarRoute;
  label: string;
  icon: LucideIcon;
  requiredPermissions?: Permission[];
};

const navItems: NavItem[] = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/orders", label: "Orders", icon: ClipboardList, requiredPermissions: ["VIEW_ORDERS"] },
  { href: "/catalog/categories", label: "Categories", icon: FolderTree, requiredPermissions: ["MANAGE_CATEGORIES"] },
  { href: "/catalog/products", label: "Products", icon: Boxes, requiredPermissions: ["MANAGE_PRODUCTS"] },
];

function hasRequiredPermission(
  permissions: readonly StaffPermissionValue[],
  requiredPermissions: readonly Permission[] | undefined,
) {
  if (!requiredPermissions?.length) {
    return true;
  }

  const grantedPermissions = new Set(permissions.map((permission) => String(permission)));
  return requiredPermissions.some((permission) => grantedPermissions.has(permission));
}

function isActivePath(pathname: string, href: SidebarRoute) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  pathname,
  permissions,
}: {
  pathname: string;
  permissions: readonly StaffPermissionValue[];
}) {
  const visibleItems = navItems.filter((item) =>
    hasRequiredPermission(permissions, item.requiredPermissions),
  );

  return (
    <aside className="hidden w-72 shrink-0 rounded-[24px] border border-white/10 bg-[#0b0b0b] p-5 lg:block">
      <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Navigation</p>
      <nav className="mt-4 space-y-2">
        {visibleItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                isActive
                  ? "border-[#ffc105]/30 bg-[#ffc105]/10 text-[#ffc105]"
                  : "border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-8 text-[11px] uppercase tracking-[0.35em] text-zinc-500">Permissions</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {permissions.length ? (
          permissions.map((permission) => (
            <span
              key={String(permission)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300"
            >
              {String(permission)}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">No staff permissions mapped yet.</span>
        )}
      </div>
    </aside>
  );
}
