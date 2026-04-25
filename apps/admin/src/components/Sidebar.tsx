"use client";

import { Link } from "@/navigation";
import type { Route } from "next";
import { Boxes, ClipboardList, FolderTree, History as HistoryIcon, Home, MapPinned, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { cn } from "@techworld/ui";
import type { Permission } from "@backend/convex/lib/permissions";
import { useTranslations } from "next-intl";

type StaffPermissionValue = string | number | bigint | boolean;
type SidebarRoute = "/" | "/orders" | "/catalog/categories" | "/catalog/products" | "/marketing/promo-codes" | "/settings/governorates" | "/settings/audit" | "/settings" | "/audit" | "/team";

type NavItem = {
  href: SidebarRoute;
  translationKey: string;
  icon: LucideIcon;
  requiredPermissions?: Permission[];
};

const navItems: NavItem[] = [
  { href: "/", translationKey: "overview", icon: Home },
  { href: "/orders", translationKey: "orders", icon: ClipboardList, requiredPermissions: ["VIEW_ORDERS"] },
  { href: "/catalog/categories", translationKey: "categories", icon: FolderTree, requiredPermissions: ["MANAGE_CATEGORIES"] },
  { href: "/catalog/products", translationKey: "products", icon: Boxes, requiredPermissions: ["MANAGE_PRODUCTS"] },
  { href: "/marketing/promo-codes", translationKey: "promoCodes", icon: ClipboardList, requiredPermissions: ["MANAGE_SYSTEM_CONFIG"] },
  { href: "/settings/governorates", translationKey: "operations", icon: MapPinned, requiredPermissions: ["MANAGE_SYSTEM_CONFIG"] },
  { href: "/settings/audit", translationKey: "auditLedger", icon: ShieldCheck, requiredPermissions: ["VIEW_AUDIT_LOGS"] },
  { href: "/settings", translationKey: "settings", icon: Settings, requiredPermissions: ["MANAGE_SYSTEM_CONFIG"] },
  { href: "/audit", translationKey: "allLogs", icon: HistoryIcon, requiredPermissions: ["VIEW_AUDIT_LOGS"] },
  { href: "/team", translationKey: "team", icon: Users, requiredPermissions: ["MANAGE_USERS"] },
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
  className,
  onItemClick,
}: {
  pathname: string;
  permissions: readonly StaffPermissionValue[];
  className?: string;
  onItemClick?: () => void;
}) {
  const t = useTranslations('Sidebar');
  const visibleItems = navItems.filter((item) =>
    hasRequiredPermission(permissions, item.requiredPermissions),
  );

  return (
    <aside className={cn("hidden w-72 shrink-0 rounded-[24px] border border-border bg-card p-5 lg:block   dark:shadow-none sticky top-[104px] h-[calc(100vh-128px)] overflow-y-auto", className)}>
      <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/50">{t('headers.navigation')}</p>
      <nav className="mt-4 space-y-2">
        {visibleItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              onClick={onItemClick}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all",
                isActive
                  ? "border-[#ffc105]/30 bg-[#ffc105]/10 text-[#ffc105] shadow-sm"
                  : "border-border text-muted-foreground hover:border-[#ffc105]/20 hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon size={16} />
              <span className="font-medium uppercase tracking-widest text-[10px]">
                {t(`nav.${item.translationKey}` as any)}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
