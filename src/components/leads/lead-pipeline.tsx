"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLeads } from "@/components/leads/lead-provider";
import { PageHeading } from "@/components/shared/page-heading";
import { formatLeadStatus, getInitials, getLeadName } from "@/lib/leads";
import type { Lead, LeadStatus } from "@/types/lead";

const columns: { status: Exclude<LeadStatus, "ARCHIVED">; label: string; tone: string }[] = [
  { status: "NEW", label: "New", tone: "blue" },
  { status: "QUALIFIED", label: "Qualified", tone: "green" },
  { status: "CONTACTED", label: "Contacted", tone: "orange" },
  { status: "CONVERTED", label: "Converted", tone: "purple" },
  { status: "DISQUALIFIED", label: "Disqualified", tone: "gray" },
];

export function LeadPipeline() {
  const {
    leads,
    summary,
    loading,
    error,
    canUpdate,
    canArchive,
    loadLeads,
    updateLead,
    archiveLead,
  } = useLeads();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [draggingLead, setDraggingLead] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStatus | null>(null);
  const [pendingLead, setPendingLead] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads({
        page: 1,
        pageSize: 100,
        search: query.trim() || undefined,
        sort: "lastActivityAt",
        order: "desc",
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadLeads, query]);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        columns.map(({ status }) => [status, leads.filter((lead) => lead.status === status)]),
      ) as Record<Exclude<LeadStatus, "ARCHIVED">, Lead[]>,
    [leads],
  );

  async function moveLead(leadId: string, nextStatus: LeadStatus) {
    const lead = leads.find((item) => item.id === leadId);
    setDraggingLead(null);
    setDropTarget(null);
    if (!lead || lead.status === nextStatus || !canUpdate) return;

    setPendingLead(leadId);
    setActionError(null);
    try {
      await updateLead(leadId, { status: nextStatus });
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to move lead.");
    } finally {
      setPendingLead(null);
    }
  }

  async function archive(leadId: string) {
    if (!window.confirm("Archive this lead? It will be removed from the active pipeline.")) return;
    setPendingLead(leadId);
    setActionError(null);
    try {
      await archiveLead(leadId);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Unable to archive lead.");
    } finally {
      setPendingLead(null);
    }
  }

  const active = Math.max(
    0,
    summary.total - summary.converted - (summary.byStatus.DISQUALIFIED ?? 0),
  );

  return (
    <section className="page leads-page">
      <PageHeading
        eyebrow="CRM"
        title="Lead pipeline"
        description="Drag prospects between stages as they progress toward conversion."
      />

      <div className="lead-stats">
        <PipelineStat label="Total leads" value={summary.total} tone="purple" />
        <PipelineStat label="Active pipeline" value={active} tone="blue" />
        <PipelineStat label="Qualified" value={summary.qualified} tone="green" />
        <PipelineStat label="Contacted" value={summary.byStatus.CONTACTED ?? 0} tone="orange" />
        <PipelineStat label="Converted" value={summary.converted} tone="purple" />
      </div>

      <article className="panel kanban-panel">
        <div className="kanban-toolbar">
          <div className="search table-search">
            <span aria-hidden="true">⌕</span>
            <label className="screen-reader-only" htmlFor="lead-search">Search leads</label>
            <input
              id="lead-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or company"
            />
          </div>
          <p>{canUpdate ? "Drag cards to change their status" : "Your workspace role has read-only access"}</p>
        </div>

        {(error || actionError) && (
          <div className="inline-error" role="alert">
            <span>{actionError ?? error}</span>
            {error && <button type="button" onClick={() => void loadLeads()}>Try again</button>}
          </div>
        )}

        {loading ? (
          <div className="kanban-loading">Loading workspace leads…</div>
        ) : (
          <div className="kanban-board">
            {columns.map((column) => (
              <section
                className={`kanban-column ${dropTarget === column.status ? "drop-target" : ""}`}
                key={column.status}
                onDragOver={(event) => {
                  if (!canUpdate) return;
                  event.preventDefault();
                  setDropTarget(column.status);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const leadId = event.dataTransfer.getData("text/lead-id");
                  if (leadId) void moveLead(leadId, column.status);
                }}
              >
                <header>
                  <span className={`kanban-dot ${column.tone}`} />
                  <h2>{column.label}</h2>
                  <b>{grouped[column.status].length}</b>
                </header>
                <div className="kanban-cards">
                  {grouped[column.status].map((lead) => {
                    const name = getLeadName(lead);
                    const busy = pendingLead === lead.id;
                    return (
                      <article
                        className={`lead-card ${draggingLead === lead.id ? "dragging" : ""}`}
                        key={lead.id}
                        draggable={canUpdate && !busy}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/lead-id", lead.id);
                          setDraggingLead(lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggingLead(null);
                          setDropTarget(null);
                        }}
                      >
                        <div className="lead-card-person">
                          <span className="lead-avatar">{getInitials(name)}</span>
                          <div><strong>{name}</strong><small>{lead.email ?? "No email"}</small></div>
                        </div>
                        <div className="lead-card-company">
                          <span>{lead.companyName || "No company"}</span>
                          <b title="Lead score">✦ {lead.score}</b>
                        </div>
                        <footer>
                          <span>{formatLeadStatus(lead.source)}</span>
                          {canArchive && (
                            <button type="button" disabled={busy} onClick={() => void archive(lead.id)}>
                              {busy ? "Saving…" : "Archive"}
                            </button>
                          )}
                        </footer>
                      </article>
                    );
                  })}
                  {!grouped[column.status].length && (
                    <div className="kanban-empty">
                      {query ? "No matching leads" : `Drop ${column.label.toLowerCase()} leads here`}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function PipelineStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <article>
      <span className={`kanban-dot ${tone}`} />
      <div><small>{label}</small><strong>{value.toLocaleString()}</strong></div>
    </article>
  );
}
