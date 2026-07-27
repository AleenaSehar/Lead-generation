import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { LeadProvider } from "@/components/leads/lead-provider";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

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
      <body className={`${dmSans.variable} ${manrope.variable}`}>
        <LeadProvider>
          <AppShell>{children}</AppShell>
        </LeadProvider>
      </body>
    </html>
  );
}
