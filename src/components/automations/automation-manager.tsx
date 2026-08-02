"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeading } from "@/components/shared/page-heading";

type Step = { id?: string; subject: string; body: string; delayMinutes: number };
type Sequence = { id: string; name: string; description: string | null; status: "DRAFT"; updatedAt: string; steps: Step[] };
const emptyStep = (): Step => ({ subject: "", body: "", delayMinutes: 0 });

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "The sequence request failed.");
  return body.data as T;
}

export function AutomationManager({ canManage }: { canManage: boolean }) {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[]>([emptyStep()]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try { setSequences(await request<Sequence[]>("/api/email-sequences")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load sequences."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  const selected = useMemo(() => sequences.find((sequence) => sequence.id === selectedId) ?? null, [sequences, selectedId]);
  function choose(sequence: Sequence) { setSelectedId(sequence.id); setName(sequence.name); setDescription(sequence.description ?? ""); setSteps(sequence.steps.map((step) => ({ ...step }))); setMessage(""); }
  function createDraft() { setSelectedId(null); setName(""); setDescription(""); setSteps([emptyStep()]); setMessage(""); }
  function updateStep(index: number, patch: Partial<Step>) { setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step)); }
  function moveStep(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= steps.length) return; setSteps((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const payload = { name, description: description || null, steps: steps.map(({ subject, body, delayMinutes }) => ({ subject, body, delayMinutes })) };
      const saved = await request<Sequence>(selectedId ? `/api/email-sequences/${selectedId}` : "/api/email-sequences", { method: selectedId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await load(); setSelectedId(saved.id); setName(saved.name); setDescription(saved.description ?? ""); setSteps(saved.steps); setMessage("Draft saved. Enroll an eligible lead from its details drawer to process steps manually.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save sequence."); }
    finally { setBusy(false); }
  }
  async function archive() {
    if (!selected || !confirm(`Archive “${selected.name}”?`)) return; setBusy(true);
    try { await request(`/api/email-sequences/${selected.id}`, { method: "DELETE" }); createDraft(); await load(); setMessage("Sequence archived."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to archive sequence."); }
    finally { setBusy(false); }
  }

  return <section className="page sequence-page">
    <PageHeading eyebrow="EMAIL AUTOMATION" title="Email sequences" description="Design ordered follow-up drafts now. Scheduling and delivery remain disabled." action={canManage ? <button className="primary-button" type="button" onClick={createDraft}>＋ New sequence</button> : undefined} />
    <div className="sequence-safety"><span>◉</span><div><strong>Draft-only workspace</strong><p>No sequence on this page can run or send email yet.</p></div></div>
    {message && <div className="scoring-message" role="status">{message}</div>}
    <div className="sequence-layout">
      <aside className="panel sequence-list"><header><h2>Sequence drafts</h2><span>{sequences.length}</span></header>{loading ? <p className="sequence-empty">Loading drafts…</p> : sequences.map((sequence) => <button className={selectedId === sequence.id ? "selected" : ""} key={sequence.id} onClick={() => choose(sequence)}><span className="sequence-list-icon">✉</span><div><strong>{sequence.name}</strong><small>{sequence.steps.length} {sequence.steps.length === 1 ? "step" : "steps"} · Updated {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(sequence.updatedAt))}</small></div><em>DRAFT</em></button>)}{!loading && !sequences.length && <p className="sequence-empty">No sequence drafts yet.</p>}</aside>
      <form className="panel sequence-editor" onSubmit={save}>
        <header><div><span>DRAFT</span><h2>{selected ? "Edit sequence" : "New sequence"}</h2></div>{selected && canManage && <button className="archive-sequence" type="button" onClick={() => void archive()}>Archive</button>}</header>
        <div className="sequence-meta"><label>Sequence name<input required minLength={2} maxLength={100} disabled={!canManage} value={name} onChange={(event) => setName(event.target.value)} placeholder="Inbound lead follow-up" /></label><label>Description<textarea maxLength={500} rows={2} disabled={!canManage} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this sequence is for" /></label></div>
        <div className="sequence-steps-heading"><div><h3>Email steps</h3><p>Steps run from top to bottom after their configured wait.</p></div>{canManage && steps.length < 20 && <button type="button" onClick={() => setSteps((current) => [...current, emptyStep()])}>＋ Add step</button>}</div>
        <div className="sequence-steps">{steps.map((step, index) => <article className="sequence-step" key={`${step.id ?? "new"}-${index}`}><div className="step-rail"><span>{index + 1}</span>{index < steps.length - 1 && <i />}</div><div className="step-card"><header><div><strong>Email {index + 1}</strong><small>{index === 0 && step.delayMinutes === 0 ? "Send immediately when enrolled" : `Wait ${step.delayMinutes} minutes after previous step`}</small></div>{canManage && <div><button type="button" disabled={index === 0} onClick={() => moveStep(index, -1)} aria-label={`Move email ${index + 1} up`}>↑</button><button type="button" disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)} aria-label={`Move email ${index + 1} down`}>↓</button><button type="button" disabled={steps.length === 1} onClick={() => setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index))} aria-label={`Delete email ${index + 1}`}>×</button></div>}</header><div className="step-fields"><label>Wait time (minutes)<input type="number" min="0" max="43200" required disabled={!canManage} value={step.delayMinutes} onChange={(event) => updateStep(index, { delayMinutes: Number(event.target.value) })} /></label><label>Subject<input required maxLength={200} disabled={!canManage} value={step.subject} onChange={(event) => updateStep(index, { subject: event.target.value })} placeholder="Quick question about your goals" /></label><label>Plain-text message<textarea required maxLength={20000} rows={6} disabled={!canManage} value={step.body} onChange={(event) => updateStep(index, { body: event.target.value })} placeholder="Hi {{firstName}},\n\n…" /></label></div></div></article>)}</div>
        {canManage ? <footer><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button><small>Saving does not activate or schedule this sequence.</small></footer> : <div className="inline-error">Your role can view drafts but only owners and admins can edit them.</div>}
      </form>
    </div>
  </section>;
}
