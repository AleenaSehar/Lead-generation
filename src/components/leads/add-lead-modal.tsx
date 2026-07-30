"use client";

import { useEffect, useRef, useState } from "react";
import { useLeads } from "@/components/leads/lead-provider";
import type { LeadSource, NewLead } from "@/types/lead";

export function AddLeadModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { addLead } = useLeads();
  const firstInput = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) firstInput.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const nameParts = String(form.get("name")).trim().split(/\s+/);
    const lead: NewLead = {
      email: String(form.get("email")),
      firstName: nameParts.shift(),
      lastName: nameParts.join(" ") || undefined,
      companyName: String(form.get("company")),
      source: String(form.get("source")) as LeadSource,
    };
    setSubmitting(true);
    setError(null);
    try {
      await addLead(lead);
      formElement.reset();
      onAdded();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add this lead.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`modal-backdrop ${open ? "open" : ""}`}
      aria-hidden={!open}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <span className="modal-icon" aria-hidden="true">◎</span>
        <h2 id="modal-title">Add a new lead</h2>
        <p>Add a prospect to your workspace pipeline. You can qualify it from the leads page.</p>
        <form onSubmit={submit}>
          <label>Full name<input ref={firstInput} required name="name" placeholder="e.g. Jordan Lee" /></label>
          <label>Work email<input required name="email" type="email" placeholder="jordan@company.com" /></label>
          <div className="form-row">
            <label>Company<input required name="company" placeholder="Company name" /></label>
            <label>Source<select name="source" defaultValue="WEBSITE"><option value="WEBSITE">Website</option><option value="LINKEDIN">LinkedIn</option><option value="REFERRAL">Referral</option><option value="OTHER">Other</option></select></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Adding lead…" : "Add lead"} <span>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
