import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadPipeline } from "@/components/leads/lead-pipeline";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <Suspense fallback={<section className="page"><div className="error-state">Loading lead pipeline…</div></section>}>
      <LeadPipeline />
    </Suspense>
  );
}
