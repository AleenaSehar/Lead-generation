"use client";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/shared/page-heading";

type Reason = "UNSUBSCRIBED" | "BOUNCED" | "COMPLAINED" | "MANUAL" | "LEGAL_REQUEST";
type Entry = { id: string; email: string; reason: Reason; details: string | null; createdAt: string; updatedAt: string };
const reasons: Reason[] = ["MANUAL", "LEGAL_REQUEST"];
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed.");
  return body.data as T;
}

export function SuppressionManager({ canManage }: { canManage: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<Reason>("MANUAL");
  const [details, setDetails] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() { try { setEntries(await request<Entry[]>("/api/suppressions")); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load suppressions."); } }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  async function add(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await request("/api/suppressions", { method: "POST", body: JSON.stringify({ email, reason, details: details || null }) }); setEmail(""); setDetails(""); await load(); setMessage("Email suppressed. Active sequences for the matching lead were stopped."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to suppress email."); } finally { setBusy(false); }
  }
  async function remove(entry: Entry) {
    if (!confirm(`Allow future email to ${entry.email}? Recorded consent will still be required.`)) return;
    setBusy(true); setMessage("");
    try { await request(`/api/suppressions/${entry.id}`, { method: "DELETE" }); await load(); setMessage("Suppression removed. Existing cancelled sequences remain cancelled."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to remove suppression."); } finally { setBusy(false); }
  }
  const filtered = entries.filter((entry) => entry.email.includes(query.trim().toLowerCase()) || label(entry.reason).toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="page suppression-page">
    <PageHeading eyebrow="EMAIL SAFETY" title="Suppression list" description="Control who must never receive outreach from this workspace." />
    <div className="safety-summary"><article><strong>{entries.length}</strong><span>Suppressed addresses</span></article><p>Unsubscribes, bounces, and complaints are added automatically. Every email attempt checks this list before delivery.</p></div>
    {!canManage && <div className="inline-error">Your role can view suppressions, but only owners and admins can change them.</div>}
    {canManage && <form className="panel suppression-form" onSubmit={add}>
      <div><h2>Add an email address</h2><p>Use this for a manual block or a legal/privacy request.</p></div>
      <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@company.com" /></label>
      <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value as Reason)}>{reasons.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>Details (optional)<input maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Why contact must be blocked" /></label>
      <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Suppress email"}</button>
    </form>}
    {message && <div className="scoring-message" role="status">{message}</div>}
    <section className="panel suppression-list">
      <header><div><h2>Blocked recipients</h2><p>Removing an entry does not restore consent or restart cancelled sequences.</p></div><input aria-label="Search suppressions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email or reason" /></header>
      <div className="suppression-table"><div className="suppression-row suppression-head"><span>Email</span><span>Reason</span><span>Added</span><span /></div>{filtered.map((entry) => <div className="suppression-row" key={entry.id}><strong>{entry.email}</strong><span><i className={`suppression-reason ${entry.reason.toLowerCase()}`}>{label(entry.reason)}</i>{entry.details && <small>{entry.details}</small>}</span><time>{new Date(entry.createdAt).toLocaleDateString()}</time><span>{canManage && <button className="text-button" disabled={busy} onClick={() => void remove(entry)}>Remove</button>}</span></div>)}{!filtered.length && <p className="suppression-empty">{entries.length ? "No suppressions match your search." : "No suppressed addresses yet."}</p>}</div>
    </section>
  </section>;
}
