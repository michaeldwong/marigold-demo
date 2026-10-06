import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { SourcesProvider } from "@/components/sources/sources-drawer";

export const metadata: Metadata = {
  title: "Marigold - Section 45X analysis",
  description: "Demo: Section 45X battery-cell credit analysis for a fictional manufacturer, Volterra Battery Systems.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SourcesProvider>
          <AppShell>{children}</AppShell>
        </SourcesProvider>
      </body>
    </html>
  );
}
