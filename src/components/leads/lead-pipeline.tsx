"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useLeads } from "@/components/leads/lead-provider";
import { PageHeading } from "@/components/shared/page-heading";
import { getInitials } from "@/lib/leads";
import type { LeadStatus } from "@/types/lead";

type StatusFilter = "all" | LeadStatus;

export function LeadPipeline() {
  const { leads, ready } = useLeads();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery = !normalized || lead.name.toLowerCase().includes(normalized) || lead.company.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || lead.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [leads, query, status]);

  return (
    <section className="page">
      <PageHeading eyebrow="CRM" title="Lead pipeline" description="Review, qualify, and move prospects toward a conversation." />
      <article className="panel table-panel">
        <div className="table-tools">
          <div className="search table-search">
            <span aria-hidden="true">⌕</span>
            <label className="screen-reader-only" htmlFor="lead-search">Search leads</label>
            <input id="lead-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or company" />
          </div>
          <label className="screen-reader-only" htmlFor="status-filter">Filter by status</label>
          <select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="New">New</option>
            <option value="Qualified">Qualified</option>
            <option value="Contacted">Contacted</option>
          </select>
        </div>
        <div className="lead-table">
          <div className="table-row table-head"><span>Lead</span><span>Company</span><span>Score</span><span>Status</span><span>Source</span></div>
          <div>
            {!ready ? (
              <div className="error-state">Loading saved leads…</div>
            ) : filtered.length ? filtered.map((lead) => (
              <div className="table-row" key={`${lead.email}-${lead.time}`}>
                <span className="table-person">
                  <i className="lead-avatar" style={{ background: lead.color }}>{getInitials(lead.name)}</i>
                  <span><strong>{lead.name}</strong><small>{lead.email}</small></span>
                </span>
                <span>{lead.company}</span>
                <span className="score-pill">{lead.score}</span>
                <span className={`status-pill status-${lead.status.toLowerCase()}`}>{lead.status}</span>
                <span>{lead.source}</span>
              </div>
            )) : (
              <div className="error-state">No leads match your filters.</div>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
