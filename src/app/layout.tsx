import type { Metadata } from "next";
import "@/app/globals.css";

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
      <body>{children}</body>
    </html>
  );
}
