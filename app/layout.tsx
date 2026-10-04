import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { WorkspaceProvider } from "@/lib/state/workspace";
import { InspectorProvider } from "@/components/provenance/inspector";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "45X Compliance OS",
  description: "Evidence-backed manufacturing compliance workspace for the Section 45X Advanced Manufacturing Production Credit (prototype).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <InspectorProvider>
            <AppShell>{children}</AppShell>
          </InspectorProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
