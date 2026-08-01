"use client";

import { useEffect, useState } from "react";

interface CaptureForm {
  id: string;
  publicId: string;
  name: string;
  title: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  requireConsent: boolean;
  collectFirstName: boolean;
  collectLastName: boolean;
  collectCompanyName: boolean;
  collectJobTitle: boolean;
  collectCompanyDomain: boolean;
  collectPhone: boolean;
  collectMessage: boolean;
  _count: { submissions: number };
}

export function FormManager({ canManage }: { canManage: boolean }) {
  const [forms, setForms] = useState<CaptureForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/capture-forms");
    const body = (await response.json()) as { data?: CaptureForm[]; error?: { message: string } };
    setLoading(false);
    if (!response.ok) return setError(body.error?.message ?? "Unable to load forms.");
    setForms(body.data ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);
    setCreating(true);
    setError(null);
    const response = await fetch("/api/capture-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        title: data.get("title"),
        description: data.get("description") || null,
        successMessage: data.get("successMessage") || undefined,
        collectFirstName: data.get("collectFirstName") === "on",
        collectLastName: data.get("collectLastName") === "on",
        collectCompanyName: data.get("collectCompanyName") === "on",
        collectJobTitle: data.get("collectJobTitle") === "on",
        collectCompanyDomain: data.get("collectCompanyDomain") === "on",
        collectPhone: data.get("collectPhone") === "on",
        collectMessage: data.get("collectMessage") === "on",
        requireConsent: data.get("requireConsent") === "on",
      }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    setCreating(false);
    if (!response.ok) return setError(body.error?.message ?? "Unable to create form.");
    element.reset();
    await load();
  }

  async function toggle(form: CaptureForm) {
    await fetch(`/api/capture-forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    await load();
  }

  function publicUrl(form: CaptureForm) {
    return `${window.location.origin}/f/${form.publicId}`;
  }

  return (
    <div className="capture-manager">
      {canManage && (
        <form className="panel capture-create" onSubmit={create}>
          <div><h2>Create a capture form</h2><p>Publish a hosted form or embed it on your website.</p></div>
          <label>Internal name<input name="name" required minLength={2} placeholder="Website demo requests" /></label>
          <label>Public heading<input name="title" required minLength={2} placeholder="Talk to our team" /></label>
          <label>Description<input name="description" placeholder="Tell us how we can help." /></label>
          <label>Success message<input name="successMessage" placeholder="Thanks! We will be in touch soon." /></label>
          <div className="capture-options">
            <label><input name="collectFirstName" type="checkbox" defaultChecked /> First name</label>
            <label><input name="collectLastName" type="checkbox" defaultChecked /> Last name</label>
            <label><input name="collectCompanyName" type="checkbox" defaultChecked /> Company</label>
            <label><input name="collectJobTitle" type="checkbox" /> Job title</label>
            <label><input name="collectCompanyDomain" type="checkbox" /> Company website</label>
            <label><input name="collectPhone" type="checkbox" /> Phone</label>
            <label><input name="collectMessage" type="checkbox" defaultChecked /> Message</label>
            <label><input name="requireConsent" type="checkbox" defaultChecked /> Require consent</label>
          </div>
          <button className="primary-button" disabled={creating}>{creating ? "Creating…" : "Create form"}</button>
        </form>
      )}
      {error && <div className="inline-error" role="alert">{error}</div>}
      <div className="capture-form-grid">
        {loading ? <div className="panel kanban-loading">Loading capture forms…</div> : forms.map((form) => (
          <article className="panel capture-form-card" key={form.id}>
            <header><span className={`capture-status ${form.status.toLowerCase()}`}>{form.status.toLowerCase()}</span><b>{form._count.submissions} submissions</b></header>
            <h2>{form.name}</h2><p>{form.title}</p>
            <div className="capture-field-list">
              <span>Email</span>
              {form.collectFirstName && <span>First name</span>}
              {form.collectLastName && <span>Last name</span>}
              {form.collectCompanyName && <span>Company</span>}
              {form.collectJobTitle && <span>Job title</span>}
              {form.collectCompanyDomain && <span>Website</span>}
              {form.collectPhone && <span>Phone</span>}
              {form.collectMessage && <span>Message</span>}
            </div>
            <div className="capture-card-actions">
              <a href={`/f/${form.publicId}`} target="_blank" rel="noreferrer">Preview</a>
              <button type="button" onClick={() => void navigator.clipboard.writeText(publicUrl(form))}>Copy link</button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(`<iframe src="${publicUrl(form)}" width="100%" height="650" style="border:0" title="${form.title}"></iframe>`)}>Copy embed</button>
              {canManage && <button type="button" onClick={() => void toggle(form)}>{form.status === "ACTIVE" ? "Pause" : "Activate"}</button>}
            </div>
          </article>
        ))}
        {!loading && !forms.length && <div className="panel kanban-loading">No capture forms yet.</div>}
      </div>
    </div>
  );
}
