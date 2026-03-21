"use client";

import { useQuery } from "convex/react";
import { api } from "@backend/convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const maintenanceModeConfig = useQuery(api.settings.getSystemConfig, { key: "MAINTENANCE_MODE" });
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (maintenanceModeConfig?.value === true && pathname !== "/maintenance") {
      router.replace("/maintenance");
    } else if (maintenanceModeConfig?.value === false && pathname === "/maintenance") {
      router.replace("/");
    }
  }, [maintenanceModeConfig, pathname, router]);

  // If maintenance is on, show nothing while we redirect
  if (maintenanceModeConfig?.value === true && pathname !== "/maintenance") {
    return null;
  }

  return <>{children}</>;
}
