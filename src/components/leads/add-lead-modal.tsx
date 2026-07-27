"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (open) firstInput.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lead: NewLead = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      company: String(form.get("company")),
      source: String(form.get("source")) as LeadSource,
    };
    addLead(lead);
    event.currentTarget.reset();
    onAdded();
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
        <p>We’ll automatically calculate a score from the information you add.</p>
        <form onSubmit={submit}>
          <label>Full name<input ref={firstInput} required name="name" placeholder="e.g. Jordan Lee" /></label>
          <label>Work email<input required name="email" type="email" placeholder="jordan@company.com" /></label>
          <div className="form-row">
            <label>Company<input required name="company" placeholder="Company name" /></label>
            <label>Source<select name="source" defaultValue="Website"><option>Website</option><option>LinkedIn</option><option>Referral</option><option>Other</option></select></label>
          </div>
          <button className="primary-button" type="submit">Add and score lead <span>→</span></button>
        </form>
      </div>
    </div>
  );
}
