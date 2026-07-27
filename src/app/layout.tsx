import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LeadProvider } from "@/components/leads/lead-provider";

export const metadata: Metadata = {
  title: {
    default: "LeadFlow — Automated lead generation",
    template: "%s | LeadFlow",
  },
  description: "Capture, qualify, and convert leads automatically with LeadFlow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LeadProvider>
          <AppShell>{children}</AppShell>
        </LeadProvider>
      </body>
    </html>
  );
}
