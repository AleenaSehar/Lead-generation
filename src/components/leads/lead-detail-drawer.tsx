"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatLeadStatus, getInitials, getLeadName } from "@/lib/leads";
import type { Lead } from "@/types/lead";

type Actor = { id: string; name: string | null; email: string } | null;
type Activity = { id: string; type: string; summary: string; metadata: Record<string, unknown> | null; occurredAt: string; actor: Actor };
type EmailEvent = { id: string; type: string; provider: string; providerMessageId: string | null; occurredAt: string; metadata: Record<string, unknown> | null };
type LeadDetail = Lead & { activities: Activity[]; emailEvents: EmailEvent[]; activityPagination: { page: number; pageSize: number; total: number; totalPages: number } };

const activityIcons: Record<string, string> = { CREATED: "+", UPDATED: "✎", SCORE_CHANGED: "✦", STATUS_CHANGED: "↗", FORM_SUBMITTED: "▤", NOTE_ADDED: "●", ASSIGNED: "◎", EMAIL_SENT: "✉" };

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Unable to load lead details.");
  return body.data as T;
}

export function LeadDetailDrawer({ leadId, canAddNote, onClose, onChanged }: { leadId: string; canAddNote: boolean; onClose: () => void; onChanged: () => void }) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [emailSubject, setEmailSubject] = useState("Following up");
  const [emailText, setEmailText] = useState("Hi,\n\nThis is a simulated development email from LeadFlow.");
  const [emailFeedback, setEmailFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true); setError("");
    try {
      const detail = await request<LeadDetail>(`/api/leads/${leadId}?page=${nextPage}&pageSize=15`);
      setLead(detail); setActivities((current) => nextPage === 1 ? detail.activities : [...current, ...detail.activities]); setPage(nextPage);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load lead details."); }
    finally { setLoading(false); }
  }, [leadId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close); document.body.classList.add("drawer-open");
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", close); document.body.classList.remove("drawer-open"); };
  }, [load, onClose]);

  async function addNote(event: React.FormEvent) {
    event.preventDefault(); if (!note.trim()) return; setBusy(true); setError("");
    try { await request(`/api/leads/${leadId}/notes`, { method: "POST", body: JSON.stringify({ note }) }); setNote(""); await load(); onChanged(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to add note."); }
    finally { setBusy(false); }
  }

  async function simulateEmail(event: React.FormEvent) {
    event.preventDefault(); if (!lead) return; setBusy(true); setError(""); setEmailFeedback("");
    try {
      const result = await request<{ simulated: boolean; status: string }>("/api/emails/send", { method: "POST", body: JSON.stringify({ leadId, subject: emailSubject, text: emailText }) });
      setEmailFeedback(result.simulated ? "Mock email recorded. Nothing was sent externally." : `Email status: ${result.status}`); await load(); onChanged();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to simulate email."); }
    finally { setBusy(false); }
  }

  const name = lead ? getLeadName(lead) : "Lead details";
  const visibleActivities = useMemo(() => activities.filter((activity) => {
    if (activity.type !== "UPDATED") return true;
    const fields = Array.isArray(activity.metadata?.fields) ? activity.metadata.fields : [];
    const onlyDerivedFields = fields.length > 0 && fields.every((field) => field === "status" || field === "score");
    return !onlyDerivedFields || !activities.some((other) => other.occurredAt === activity.occurredAt && (other.type === "STATUS_CHANGED" || other.type === "SCORE_CHANGED"));
  }), [activities]);
  return <div className="lead-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="lead-drawer" role="dialog" aria-modal="true" aria-labelledby="lead-drawer-title">
      <header className="lead-drawer-header"><div><span className="lead-avatar">{lead ? getInitials(name) : "…"}</span><div><p>Lead profile</p><h2 id="lead-drawer-title">{name}</h2>{lead?.email && <small>{lead.email}</small>}</div></div><button aria-label="Close lead details" onClick={onClose}>×</button></header>
      {loading && !lead ? <div className="drawer-state">Loading lead history…</div> : error && !lead ? <div className="drawer-state error">{error}</div> : lead && <div className="lead-drawer-body">
        <section className="lead-detail-summary">
          <div><small>Status</small><strong>{formatLeadStatus(lead.status)}</strong></div><div><small>Score</small><strong className="drawer-score">✦ {lead.score}</strong></div><div><small>Source</small><strong>{formatLeadStatus(lead.source)}</strong></div>
        </section>
        <section className="lead-contact-card"><h3>Contact and company</h3><dl>
          <div><dt>Email</dt><dd>{lead.email ?? "Not provided"}</dd></div><div><dt>Phone</dt><dd>{lead.phone ?? "Not provided"}</dd></div><div><dt>Job title</dt><dd>{lead.jobTitle ?? "Not provided"}</dd></div><div><dt>Company</dt><dd>{lead.companyName ?? "Not provided"}</dd></div><div><dt>Domain</dt><dd>{lead.companyDomain ?? "Not provided"}</dd></div><div><dt>Consent</dt><dd>{lead.consentAt ? "Recorded" : "Not recorded"}</dd></div>
        </dl></section>
        <section className="score-explanation"><h3>Why this score?</h3>{lead.scoreDetails?.matchedRules?.length ? <div>{lead.scoreDetails.matchedRules.map((rule) => <p key={rule.id}><span>{rule.name}</span><b className={rule.points < 0 ? "negative" : ""}>{rule.points > 0 ? "+" : ""}{rule.points}</b></p>)}</div> : <p className="drawer-muted">No active scoring rules matched this lead.</p>}</section>
        {canAddNote && <section className="mock-email-card"><div className="mock-email-heading"><div><h3>Development email</h3><p>Mock mode · no external delivery</p></div><span>SAFE TEST</span></div>{lead.consentAt ? <form onSubmit={simulateEmail}><label>Subject<input maxLength={200} required value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} /></label><label>Message<textarea maxLength={20000} rows={4} required value={emailText} onChange={(event) => setEmailText(event.target.value)} /></label><button className="primary-button" disabled={busy}>{busy ? "Recording…" : "Simulate send"}</button></form> : <p className="mock-email-warning">This lead has no recorded consent, so email attempts are blocked.</p>}{emailFeedback && <div className="mock-email-success">{emailFeedback}</div>}</section>}
        <section className="email-event-card"><div className="timeline-heading"><div><h3>Email delivery events</h3><small>Latest 20 provider events</small></div><span>{lead.emailEvents.length} events</span></div>{lead.emailEvents.length ? <div className="email-event-list">{lead.emailEvents.map((event) => <article key={event.id}><span className={`email-status ${event.type.toLowerCase()}`}>{event.type}</span><div><strong>{typeof event.metadata?.subject === "string" ? event.metadata.subject : event.providerMessageId ?? "Provider event"}</strong><small>{event.provider} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(event.occurredAt))}</small></div></article>)}</div> : <p className="drawer-muted">No email attempts have been recorded for this lead.</p>}</section>
        {canAddNote && <form className="lead-note-form" onSubmit={addNote}><label htmlFor="lead-note">Add an internal note</label><textarea id="lead-note" maxLength={2000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record context for your team…" /><button className="primary-button" disabled={busy || !note.trim()}>{busy ? "Adding…" : "Add note"}</button></form>}
        {error && <div className="inline-error">{error}</div>}
        <section className="lead-timeline"><div className="timeline-heading"><div><h3>Activity timeline</h3><small>Newest activity first</small></div><span>{lead.activityPagination.total} recorded events</span></div>
          {visibleActivities.map((activity) => <article key={activity.id}><span className={`timeline-icon ${activity.type.toLowerCase()}`}>{activityIcons[activity.type] ?? "•"}</span><div><strong>{activity.type === "NOTE_ADDED" ? "Internal note" : activity.summary}</strong>{activity.type === "NOTE_ADDED" && <p>{activity.summary}</p>}<small>{activity.actor?.name ?? activity.actor?.email ?? "System"} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(activity.occurredAt))}</small></div></article>)}
          {!visibleActivities.length && <p className="drawer-muted">No activity recorded yet.</p>}
          {page < lead.activityPagination.totalPages && <button className="timeline-more" disabled={loading} onClick={() => void load(page + 1)}>{loading ? "Loading…" : "Load older activity"}</button>}
        </section>
      </div>}
    </aside>
  </div>;
}
