"use client";
import { useEffect, useState } from "react";
import { PageHeading } from "@/components/shared/page-heading";

type Field = "SOURCE" | "STATUS" | "JOB_TITLE" | "COMPANY_NAME" | "COMPANY_DOMAIN" | "EMAIL" | "PHONE" | "CONSENT";
type Operator = "EQUALS" | "CONTAINS" | "EXISTS" | "NOT_EXISTS";
type Rule = { id: string; name: string; field: Field; operator: Operator; value: string | null; points: number; isActive: boolean };
const fields: Field[] = ["SOURCE", "STATUS", "JOB_TITLE", "COMPANY_NAME", "COMPANY_DOMAIN", "EMAIL", "PHONE", "CONSENT"];
const operators: Operator[] = ["EQUALS", "CONTAINS", "EXISTS", "NOT_EXISTS"];
const initial = { name: "", field: "JOB_TITLE" as Field, operator: "CONTAINS" as Operator, value: "", points: 10, isActive: true };
const sentenceCase = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed.");
  return body.data as T;
}

export function ScoringManager({ canManage }: { canManage: boolean }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() { try { setRules(await request<Rule[]>("/api/scoring-rules")); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load rules."); } }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await request(editing ? `/api/scoring-rules/${editing}` : "/api/scoring-rules", { method: editing ? "PATCH" : "POST", body: JSON.stringify({ ...form, value: ["EXISTS", "NOT_EXISTS"].includes(form.operator) ? null : form.value }) });
      setForm(initial); setEditing(null); await load(); setMessage(editing ? "Rule updated. Recalculate leads to apply it." : "Rule created. Recalculate leads to apply it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save rule."); } finally { setBusy(false); }
  }
  async function patch(rule: Rule, input: Partial<Rule>) { setBusy(true); try { await request(`/api/scoring-rules/${rule.id}`, { method: "PATCH", body: JSON.stringify(input) }); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update rule."); } finally { setBusy(false); } }
  async function remove(rule: Rule) { if (!confirm(`Delete “${rule.name}”?`)) return; setBusy(true); try { await request(`/api/scoring-rules/${rule.id}`, { method: "DELETE" }); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete rule."); } finally { setBusy(false); } }
  async function recalculate() { setBusy(true); setMessage(""); try { const result = await request<{ total: number; changed: number }>("/api/scoring-rules/recalculate", { method: "POST" }); setMessage(`Scored ${result.total} active leads; ${result.changed} changed.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to recalculate scores."); } finally { setBusy(false); } }
  function edit(rule: Rule) { setEditing(rule.id); setForm({ name: rule.name, field: rule.field, operator: rule.operator, value: rule.value ?? "", points: rule.points, isActive: rule.isActive }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  return <section className="page scoring-page">
    <PageHeading eyebrow="QUALIFICATION" title="Lead scoring" description="Build transparent rules and see exactly why each lead received its score." action={canManage ? <button className="secondary-button" disabled={busy} onClick={() => void recalculate()}>Recalculate all leads</button> : undefined} />
    {!canManage && <div className="inline-error">Your role can view scoring rules but only owners and admins can change them.</div>}
    {canManage && <form className="panel scoring-form" onSubmit={save}>
      <h2>{editing ? "Edit scoring rule" : "Create a scoring rule"}</h2>
      <div className="scoring-grid">
        <label>Rule name<input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Founder fit" /></label>
        <label>Lead field<select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value as Field })}>{fields.map((field) => <option key={field} value={field}>{field.replaceAll("_", " ")}</option>)}</select></label>
        <label>Condition<select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value as Operator })}>{operators.map((operator) => <option key={operator} value={operator}>{operator.replaceAll("_", " ")}</option>)}</select></label>
        <label>Value<input disabled={["EXISTS", "NOT_EXISTS"].includes(form.operator)} required={["EQUALS", "CONTAINS"].includes(form.operator)} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Founder" /></label>
        <label>Points<input type="number" min="-100" max="100" required value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} /></label>
      </div>
      <div className="scoring-actions"><button className="primary-button" disabled={busy}>{busy ? "Saving…" : editing ? "Update rule" : "Add rule"}</button>{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(null); setForm(initial); }}>Cancel</button>}</div>
    </form>}
    {message && <div className="scoring-message" role="status">{message}</div>}
    <div className="scoring-rules">{rules.map((rule) => <article className={`panel scoring-rule ${rule.isActive ? "" : "inactive"}`} key={rule.id}>
      <div className="scoring-rule-main">
        <span className={`score-points ${rule.points < 0 ? "negative" : ""}`}><strong>{rule.points > 0 ? "+" : ""}{rule.points}</strong><small>points</small></span>
        <div className="scoring-rule-copy"><div className="scoring-rule-title"><h2>{rule.name}</h2><span className="rule-status">{rule.isActive ? "Active" : "Disabled"}</span></div><p><b>{sentenceCase(rule.field)}</b> <span>{sentenceCase(rule.operator).toLowerCase()}</span>{rule.value && <em>“{rule.value}”</em>}</p></div>
      </div>
      {canManage && <div className="scoring-rule-actions"><button onClick={() => edit(rule)}>Edit</button><button disabled={busy} onClick={() => void patch(rule, { isActive: !rule.isActive })}>{rule.isActive ? "Disable" : "Enable"}</button><button disabled={busy} onClick={() => void remove(rule)}>Delete</button></div>}
    </article>)}{!rules.length && <div className="panel scoring-empty">No scoring rules yet. Create the first rule above.</div>}</div>
  </section>;
}
