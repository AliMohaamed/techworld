import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@techworld/ui/toaster";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import { AdminAuthShell } from "@/components/auth/admin-auth-shell";
import { getToken } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "TechWorld Admin",
  description: "Standalone admin dashboard shell",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialToken = await getToken();

  return (
    <html lang="en" className="dark">
      <body>
        <ConvexClientProvider initialToken={initialToken}>
          <AdminAuthShell>{children}</AdminAuthShell>
          <Toaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
