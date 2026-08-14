"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatLeadStatus, getInitials, getLeadName } from "@/lib/leads";
import type { Lead } from "@/types/lead";

type Actor = { id: string; name: string | null; email: string } | null;
type Activity = { id: string; type: string; summary: string; metadata: Record<string, unknown> | null; occurredAt: string; actor: Actor };
type EmailEvent = { id: string; type: string; provider: string; providerMessageId: string | null; occurredAt: string; metadata: Record<string, unknown> | null };
type LeadDetail = Lead & { suppression: { reason: string; details: string | null } | null; activities: Activity[]; emailEvents: EmailEvent[]; activityPagination: { page: number; pageSize: number; total: number; totalPages: number } };
type SequenceSummary = { id: string; name: string; steps: { id: string }[] };
type Enrollment = { id: string; status: string; nextRunAt: string | null; error: string | null; emailSequence: { name: string }; stepRuns: { id: string; position: number; subject: string; status: string; scheduledAt: string; attempts: number; error: string | null }[] };

const activityIcons: Record<string, string> = { CREATED: "+", UPDATED: "✎", SCORE_CHANGED: "✦", STATUS_CHANGED: "↗", FORM_SUBMITTED: "▤", NOTE_ADDED: "●", ASSIGNED: "◎", EMAIL_SENT: "✉", EMAIL_REPLIED: "↩", EMAIL_BOUNCED: "!", EMAIL_COMPLAINED: "!", EMAIL_UNSUBSCRIBED: "×", SUPPRESSION_CHANGED: "⊘", CRM_SYNCED: "◇", CRM_SYNC_FAILED: "!" };

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Unable to load lead details.");
  return body.data as T;
}

export function LeadDetailDrawer({ leadId, canAddNote, canManageWorkflows, onClose, onChanged }: { leadId: string; canAddNote: boolean; canManageWorkflows: boolean; onClose: () => void; onChanged: () => void }) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [note, setNote] = useState("");
  const [emailSubject, setEmailSubject] = useState("Following up");
  const [emailText, setEmailText] = useState("Hi,\n\nThis is a simulated development email from LeadFlow.");
  const [emailFeedback, setEmailFeedback] = useState("");
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [sequenceId, setSequenceId] = useState("");
  const [workflowFeedback, setWorkflowFeedback] = useState("");
  const [crmFeedback, setCrmFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true); setError("");
    try {
      const detail = await request<LeadDetail>(`/api/leads/${leadId}?page=${nextPage}&pageSize=15`);
      setLead(detail); setActivities((current) => nextPage === 1 ? detail.activities : [...current, ...detail.activities]); setPage(nextPage);
      if (nextPage === 1) {
        const [availableSequences, leadEnrollments] = await Promise.all([request<SequenceSummary[]>("/api/email-sequences"), request<Enrollment[]>(`/api/sequence-enrollments?leadId=${encodeURIComponent(leadId)}`)]);
        setSequences(availableSequences); setEnrollments(leadEnrollments); setSequenceId((current) => current || availableSequences[0]?.id || "");
      }
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

  async function enroll() {
    if (!sequenceId) return; setBusy(true); setError(""); setWorkflowFeedback("");
    try { await request("/api/sequence-enrollments", { method: "POST", body: JSON.stringify({ leadId, emailSequenceId: sequenceId, idempotencyKey: crypto.randomUUID() }) }); setWorkflowFeedback("Lead enrolled. Process due steps manually below."); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to enroll lead."); }
    finally { setBusy(false); }
  }
  async function process(enrollmentId: string) {
    setBusy(true); setError(""); setWorkflowFeedback("");
    try { const result = await request<{ outcome: string }>(`/api/sequence-enrollments/${enrollmentId}/process`, { method: "POST" }); setWorkflowFeedback(`Processor outcome: ${result.outcome.replaceAll("_", " ")}.`); await load(); onChanged(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to process enrollment."); }
    finally { setBusy(false); }
  }
  async function cancel(enrollmentId: string) {
    if (!confirm("Cancel this sequence enrollment?")) return; setBusy(true); setError("");
    try { await request(`/api/sequence-enrollments/${enrollmentId}`, { method: "DELETE" }); setWorkflowFeedback("Enrollment cancelled."); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to cancel enrollment."); }
    finally { setBusy(false); }
  }
  async function syncCrm() {
    setBusy(true); setError(""); setCrmFeedback("");
    try { const result = await request<{ duplicate: boolean; link: { externalId: string } | null }>(`/api/crm/leads/${leadId}/sync`, { method: "POST" }); setCrmFeedback(result.duplicate ? "Lead is already up to date in the mock CRM." : `Lead synchronized as ${result.link?.externalId ?? "a CRM contact"}.`); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to synchronize CRM contact."); }
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
          <div><dt>Email</dt><dd>{lead.email ?? "Not provided"}</dd></div><div><dt>Phone</dt><dd>{lead.phone ?? "Not provided"}</dd></div><div><dt>Job title</dt><dd>{lead.jobTitle ?? "Not provided"}</dd></div><div><dt>Company</dt><dd>{lead.companyName ?? "Not provided"}</dd></div><div><dt>Domain</dt><dd>{lead.companyDomain ?? "Not provided"}</dd></div><div><dt>Contact eligibility</dt><dd className={lead.suppression || !lead.consentAt ? "contact-blocked" : "contact-allowed"}>{lead.suppression ? `Suppressed · ${formatLeadStatus(lead.suppression.reason)}` : lead.consentAt ? "Eligible" : "No consent"}</dd></div>
        </dl></section>
        <section className="score-explanation"><h3>Why this score?</h3>{lead.scoreDetails?.matchedRules?.length ? <div>{lead.scoreDetails.matchedRules.map((rule) => <p key={rule.id}><span>{rule.name}</span><b className={rule.points < 0 ? "negative" : ""}>{rule.points > 0 ? "+" : ""}{rule.points}</b></p>)}</div> : <p className="drawer-muted">No active scoring rules matched this lead.</p>}</section>
        {canAddNote && <section className="crm-lead-card"><div><h3>CRM contact</h3><p>Development mock · no external transfer</p></div><button className="secondary-button" disabled={busy || !lead.email} onClick={() => void syncCrm()}>{busy ? "Syncing…" : "Sync to CRM"}</button>{crmFeedback && <div className="mock-email-success">{crmFeedback}</div>}</section>}
        {canAddNote && <section className="mock-email-card"><div className="mock-email-heading"><div><h3>Development email</h3><p>Mock mode · no external delivery</p></div><span>SAFE TEST</span></div>{lead.consentAt && !lead.suppression ? <form onSubmit={simulateEmail}><label>Subject<input maxLength={200} required value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} /></label><label>Message<textarea maxLength={20000} rows={4} required value={emailText} onChange={(event) => setEmailText(event.target.value)} /></label><button className="primary-button" disabled={busy}>{busy ? "Recording…" : "Simulate send"}</button></form> : <p className="mock-email-warning">{lead.suppression ? `Email is blocked because this address is suppressed for ${formatLeadStatus(lead.suppression.reason).toLowerCase()}.` : "This lead has no recorded consent, so email attempts are blocked."}</p>}{emailFeedback && <div className="mock-email-success">{emailFeedback}</div>}</section>}
        <section className="email-event-card"><div className="timeline-heading"><div><h3>Email delivery events</h3><small>Latest 20 provider events</small></div><span>{lead.emailEvents.length} events</span></div>{lead.emailEvents.length ? <div className="email-event-list">{lead.emailEvents.map((event) => <article key={event.id}><span className={`email-status ${event.type.toLowerCase()}`}>{event.type}</span><div><strong>{event.type === "REPLIED" ? "Reply received" : typeof event.metadata?.subject === "string" ? event.metadata.subject : event.providerMessageId ?? "Provider event"}</strong>{event.type === "REPLIED" && typeof event.metadata?.textPreview === "string" && <p>{event.metadata.textPreview}</p>}<small>{event.provider} · {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(event.occurredAt))}</small></div></article>)}</div> : <p className="drawer-muted">No email attempts have been recorded for this lead.</p>}</section>
        <section className="workflow-run-card"><div className="workflow-run-heading"><div><h3>Sequence enrollments</h3><p>Manual mock processor · no background scheduling</p></div><span>DEV</span></div>{canManageWorkflows && <div className="enrollment-create"><select value={sequenceId} onChange={(event) => setSequenceId(event.target.value)}><option value="">Select a sequence draft</option>{sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name} ({sequence.steps.length} steps)</option>)}</select><button type="button" disabled={busy || !sequenceId} onClick={() => void enroll()}>Enroll lead</button></div>}{workflowFeedback && <div className="mock-email-success">{workflowFeedback}</div>}<div className="enrollment-list">{enrollments.map((enrollment) => <article key={enrollment.id}><header><div><strong>{enrollment.emailSequence.name}</strong><small>{enrollment.stepRuns.length} steps</small></div><span className={`enrollment-status ${enrollment.status.toLowerCase()}`}>{enrollment.status}</span></header><div className="step-run-list">{enrollment.stepRuns.map((step) => <div key={step.id}><span>{step.position + 1}</span><p><strong>{step.subject}</strong><small>{step.status} · due {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(step.scheduledAt))}</small></p></div>)}</div>{enrollment.error && <p className="enrollment-error">{enrollment.error}</p>}{canManageWorkflows && ["PENDING", "RUNNING", "FAILED"].includes(enrollment.status) && <footer><button type="button" disabled={busy} onClick={() => void process(enrollment.id)}>Process due step</button><button type="button" disabled={busy} onClick={() => void cancel(enrollment.id)}>Cancel</button></footer>}</article>)}{!enrollments.length && <p className="drawer-muted">This lead has no sequence enrollments.</p>}</div></section>
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
