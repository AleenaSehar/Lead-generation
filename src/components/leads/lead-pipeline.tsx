"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLeads } from "@/components/leads/lead-provider";
import { PageHeading } from "@/components/shared/page-heading";
import { formatLeadStatus, getInitials, getLeadName } from "@/lib/leads";
import type { Lead, LeadSource, LeadStatus } from "@/types/lead";
import { LeadDetailDrawer } from "@/components/leads/lead-detail-drawer";

type RoutingMember = { id: string; name: string | null; email: string; role: string };
type RoutingRule = { id: string; name: string; type: "SOURCE" | "MIN_SCORE"; source: LeadSource | null; minScore: number | null; owner: { name: string | null; email: string } };
type RoutingOverview = { mode: "MANUAL" | "ROUND_ROBIN"; members: RoutingMember[]; rules: RoutingRule[] };

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
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [routing, setRouting] = useState<RoutingOverview | null>(null);
  const [ruleType, setRuleType] = useState<RoutingRule["type"]>("SOURCE");
  const [ruleValue, setRuleValue] = useState("WEBSITE");
  const [ruleOwnerId, setRuleOwnerId] = useState("");
  const closeDetails = useCallback(() => setDetailLeadId(null), []);
  const refreshDetails = useCallback(() => { void loadLeads(); }, [loadLeads]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads({
        page: 1,
        pageSize: 100,
        search: query.trim() || undefined,
        sort: "lastActivityAt",
        order: "desc",
        ownerId: ownerFilter || undefined,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadLeads, ownerFilter, query]);
  const loadRouting = useCallback(async () => { const response = await fetch("/api/routing"); const body = await response.json(); if (body.data) { setRouting(body.data); setRuleOwnerId((current) => current || body.data.members[0]?.id || ""); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void loadRouting(), 0); return () => window.clearTimeout(timer); }, [loadRouting]);

  async function changeRoutingMode(mode: RoutingOverview["mode"]) {
    setActionError(null);
    try {
      const response = await fetch("/api/routing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to update routing.");
      setRouting((current) => current ? { ...current, mode: body.data.routingMode } : current);
    } catch (requestError) { setActionError(requestError instanceof Error ? requestError.message : "Unable to update routing."); }
  }

  async function addRoutingRule() {
    if (!ruleOwnerId) return;
    const source = ruleType === "SOURCE" ? ruleValue : null;
    const minScore = ruleType === "MIN_SCORE" ? Number(ruleValue) : null;
    const label = ruleType === "SOURCE" ? `${formatLeadStatus(source as LeadSource)} leads` : `Score ${minScore}+`;
    setActionError(null);
    try {
      const response = await fetch("/api/routing/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label, type: ruleType, ownerId: ruleOwnerId, source, minScore }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "Unable to add routing rule."); await loadRouting();
    } catch (requestError) { setActionError(requestError instanceof Error ? requestError.message : "Unable to add routing rule."); }
  }

  async function deleteRoutingRule(ruleId: string) {
    const response = await fetch(`/api/routing/rules/${ruleId}`, { method: "DELETE" });
    const body = await response.json(); if (!response.ok) { setActionError(body.error?.message ?? "Unable to delete routing rule."); return; } await loadRouting();
  }
  useEffect(() => { const requested = searchParams.get("leadId"); if (!requested) return; const timer = window.setTimeout(() => setDetailLeadId(requested), 0); return () => window.clearTimeout(timer); }, [searchParams]);

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
        action={<Link className="secondary-button" href="/leads/import">Import CSV</Link>}
      />

      <div className="lead-stats">
        <PipelineStat label="Total leads" value={summary.total} tone="purple" />
        <PipelineStat label="Active pipeline" value={active} tone="blue" />
        <PipelineStat label="Qualified" value={summary.qualified} tone="green" />
        <PipelineStat label="Contacted" value={summary.byStatus.CONTACTED ?? 0} tone="orange" />
        <PipelineStat label="Converted" value={summary.converted} tone="purple" />
      </div>

      {canArchive && routing && <article className="panel routing-panel"><header><div><h2>Automatic ownership rules</h2><p>Rules run top to bottom before the default new-lead routing mode.</p></div><span>{routing.rules.length} rules</span></header><div className="routing-rule-create"><select value={ruleType} onChange={(event) => { const type = event.target.value as RoutingRule["type"]; setRuleType(type); setRuleValue(type === "SOURCE" ? "WEBSITE" : "70"); }}><option value="SOURCE">Lead source is</option><option value="MIN_SCORE">Score is at least</option></select>{ruleType === "SOURCE" ? <select value={ruleValue} onChange={(event) => setRuleValue(event.target.value)}>{["WEBSITE", "LINKEDIN", "REFERRAL", "CSV_IMPORT", "MANUAL", "API", "OTHER"].map((source) => <option key={source} value={source}>{formatLeadStatus(source)}</option>)}</select> : <input aria-label="Minimum lead score" min="0" max="100" type="number" value={ruleValue} onChange={(event) => setRuleValue(event.target.value)} />}<span>assign to</span><select value={ruleOwnerId} onChange={(event) => setRuleOwnerId(event.target.value)}>{routing.members.map((member) => <option key={member.id} value={member.id}>{member.name ?? member.email}</option>)}</select><button className="secondary-button" type="button" onClick={() => void addRoutingRule()}>Add rule</button></div>{routing.rules.length > 0 && <div className="routing-rule-list">{routing.rules.map((rule) => <div key={rule.id}><span>{rule.type === "SOURCE" ? `${formatLeadStatus(rule.source ?? "OTHER")} source` : `Score ≥ ${rule.minScore}`}</span><strong>→ {rule.owner.name ?? rule.owner.email}</strong><button aria-label={`Delete ${rule.name}`} onClick={() => void deleteRoutingRule(rule.id)}>×</button></div>)}</div>}</article>}

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
          <div className="lead-owner-controls">
            <label>Owner<select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option value="">All owners</option><option value="unassigned">Unassigned</option>{routing?.members.map((member) => <option key={member.id} value={member.id}>{member.name ?? member.email}</option>)}</select></label>
            {canArchive && <label>New leads<select value={routing?.mode ?? "MANUAL"} onChange={(event) => void changeRoutingMode(event.target.value as RoutingOverview["mode"])}><option value="MANUAL">Creator owns lead</option><option value="ROUND_ROBIN">Round robin</option></select></label>}
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
                          <b className="lead-score" title={lead.scoreDetails?.matchedRules?.length ? lead.scoreDetails.matchedRules.map((rule) => `${rule.name}: ${rule.points > 0 ? "+" : ""}${rule.points}`).join("\n") : "No scoring rules matched"}>✦ {lead.score}<span className="score-tooltip">{lead.scoreDetails?.matchedRules?.length ? lead.scoreDetails.matchedRules.map((rule) => <small key={rule.id}>{rule.name} <em>{rule.points > 0 ? "+" : ""}{rule.points}</em></small>) : <small>No rules matched</small>}</span></b>
                        </div>
                        <div className="lead-card-owner"><small>Owner</small><span>{lead.owner?.name ?? lead.owner?.email ?? "Unassigned"}</span></div>
                        <footer>
                          <span>{formatLeadStatus(lead.source)}</span>
                          <div className="lead-card-actions"><button type="button" onClick={() => setDetailLeadId(lead.id)}>View details</button>{canArchive && (
                            <button type="button" disabled={busy} onClick={() => void archive(lead.id)}>
                              {busy ? "Saving…" : "Archive"}
                            </button>
                          )}</div>
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
      {detailLeadId && <LeadDetailDrawer leadId={detailLeadId} canAddNote={canUpdate} canManageWorkflows={canArchive} onClose={closeDetails} onChanged={refreshDetails} />}
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
