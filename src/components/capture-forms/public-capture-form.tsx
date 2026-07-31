"use client";

import { useState } from "react";

interface PublicForm {
  publicId: string;
  title: string;
  description: string | null;
  successMessage: string;
  collectFirstName: boolean;
  collectLastName: boolean;
  collectCompanyName: boolean;
  collectJobTitle: boolean;
  collectCompanyDomain: boolean;
  collectPhone: boolean;
  collectMessage: boolean;
  requireConsent: boolean;
  consentText: string;
}

export function PublicCaptureForm({ form }: { form: PublicForm }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const data = new FormData(element);
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/public/forms/${form.publicId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        firstName: data.get("firstName") || undefined,
        lastName: data.get("lastName") || undefined,
        companyName: data.get("companyName") || undefined,
        jobTitle: data.get("jobTitle") || undefined,
        companyDomain: data.get("companyDomain") || undefined,
        phone: data.get("phone") || undefined,
        message: data.get("message") || undefined,
        consent: data.get("consent") === "on",
        website: data.get("website") || undefined,
      }),
    });
    const body = (await response.json()) as {
      data?: { successMessage: string };
      error?: { message: string };
    };
    setSubmitting(false);
    if (!response.ok) {
      setError(body.error?.message ?? "The form could not be submitted.");
      return;
    }
    element.reset();
    setMessage(body.data?.successMessage ?? form.successMessage);
  }

  if (message) {
    return <div className="capture-success"><span>✓</span><h2>Submitted</h2><p>{message}</p></div>;
  }

  return (
    <form className="capture-public-form" onSubmit={submit}>
      <input className="capture-honeypot" name="website" tabIndex={-1} autoComplete="off" />
      <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
      <div className="capture-form-row">
        {form.collectFirstName && <label>First name<input name="firstName" autoComplete="given-name" /></label>}
        {form.collectLastName && <label>Last name<input name="lastName" autoComplete="family-name" /></label>}
      </div>
      {form.collectCompanyName && <label>Company<input name="companyName" autoComplete="organization" /></label>}
      {form.collectJobTitle && <label>Job title<input name="jobTitle" autoComplete="organization-title" /></label>}
      {form.collectCompanyDomain && <label>Company website<input name="companyDomain" inputMode="url" placeholder="example.com" /></label>}
      {form.collectPhone && <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>}
      {form.collectMessage && <label>How can we help?<textarea name="message" rows={4} /></label>}
      {form.requireConsent && (
        <label className="capture-consent"><input name="consent" type="checkbox" required /><span>{form.consentText}</span></label>
      )}
      {error && <div className="capture-error" role="alert">{error}</div>}
      <button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</button>
      <small>Powered by LeadFlow</small>
    </form>
  );
}
