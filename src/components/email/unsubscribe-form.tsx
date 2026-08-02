"use client";
import { useState } from "react";

export function UnsubscribeForm({ token, email, initiallyUnsubscribed }: { token: string; email: string; initiallyUnsubscribed: boolean }) {
  const [done, setDone] = useState(initiallyUnsubscribed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function unsubscribe() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/public/unsubscribe/${encodeURIComponent(token)}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to unsubscribe.");
      setDone(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to unsubscribe."); } finally { setBusy(false); }
  }
  return <section className="unsubscribe-card">
    <div className="capture-brand"><span className="brand-mark"><i /><i /><i /></span>LeadFlow</div>
    <span className="unsubscribe-icon">{done ? "✓" : "✉"}</span>
    <h1>{done ? "You’re unsubscribed" : "Stop receiving emails"}</h1>
    <p>{done ? <><strong>{email}</strong> will not receive further outreach from this workspace.</> : <>Confirm that you want to stop outreach emails to <strong>{email}</strong>.</>}</p>
    {!done && <button className="primary-button" disabled={busy} onClick={() => void unsubscribe()}>{busy ? "Unsubscribing…" : "Unsubscribe"}</button>}
    {error && <div className="inline-error" role="alert">{error}</div>}
    <small>This preference applies to this sender’s LeadFlow workspace.</small>
  </section>;
}
