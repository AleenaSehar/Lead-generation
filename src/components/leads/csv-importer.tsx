"use client";

import Link from "next/link";
import Papa from "papaparse";
import { useMemo, useState } from "react";

type Row = Record<string, string>;
type TargetField = "email" | "firstName" | "lastName" | "phone" | "jobTitle" | "companyName" | "companyDomain" | "score" | "status";

const fields: { key: TargetField; label: string; required?: boolean; guesses: string[] }[] = [
  { key: "email", label: "Email", required: true, guesses: ["email", "email address", "work email"] },
  { key: "firstName", label: "First name", guesses: ["first name", "firstname", "given name"] },
  { key: "lastName", label: "Last name", guesses: ["last name", "lastname", "surname"] },
  { key: "phone", label: "Phone", guesses: ["phone", "phone number", "mobile"] },
  { key: "jobTitle", label: "Job title", guesses: ["job title", "title", "role"] },
  { key: "companyName", label: "Company", guesses: ["company", "company name", "organization"] },
  { key: "companyDomain", label: "Company website", guesses: ["company domain", "website", "domain"] },
  { key: "score", label: "Score", guesses: ["score", "lead score"] },
  { key: "status", label: "Status", guesses: ["status", "lead status"] },
];

interface Result {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string }[];
}

function autoMapping(headers: string[]) {
  return Object.fromEntries(fields.map((field) => {
    const header = headers.find((item) => field.guesses.includes(item.trim().toLowerCase()));
    return [field.key, header ?? ""];
  })) as Record<TargetField, string>;
}

export function CsvImporter() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<TargetField, string>>({} as Record<TargetField, string>);
  const [strategy, setStrategy] = useState<"SKIP" | "UPDATE">("SKIP");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  function chooseFile(file?: File) {
    setError(null);
    setResult(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("CSV files must be 5 MB or smaller.");
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: ({ data, errors, meta }) => {
        if (errors.length) return setError(`CSV parsing failed near row ${errors[0].row ?? 1}: ${errors[0].message}`);
        if (!meta.fields?.length) return setError("The CSV must have a header row.");
        if (data.length > 1000) return setError("Import at most 1,000 rows at a time.");
        setRows(data);
        setHeaders(meta.fields);
        setMapping(autoMapping(meta.fields));
      },
      error: (parseError) => setError(parseError.message),
    });
  }

  async function runImport() {
    if (!mapping.email) return setError("Map one CSV column to Email before importing.");
    setImporting(true);
    setError(null);
    const mapped = Object.fromEntries(Object.entries(mapping).filter(([, header]) => header));
    const response = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, mapping: mapped, duplicateStrategy: strategy }),
    });
    const body = (await response.json()) as { data?: Result; error?: { message: string } };
    setImporting(false);
    if (!response.ok) return setError(body.error?.message ?? "The CSV import failed.");
    setResult(body.data ?? null);
  }

  return (
    <div className="csv-importer">
      <section className="panel csv-upload">
        <div><span>1</span><h2>Choose CSV file</h2><p>The first row must contain column names. Maximum 5 MB or 1,000 leads.</p></div>
        <label className="csv-file">Select CSV<input type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0])} /></label>
        <a href="/sample-leads.csv" download>Download sample CSV</a>
      </section>

      {headers.length > 0 && (
        <section className="panel csv-mapping">
          <div className="csv-section-heading"><span>2</span><div><h2>Map your columns</h2><p>Email is required. Other fields are optional.</p></div></div>
          <div className="mapping-grid">
            {fields.map((field) => (
              <label key={field.key}>{field.label}{field.required ? " *" : ""}
                <select value={mapping[field.key] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}>
                  <option value="">Do not import</option>
                  {headers.map((header) => <option value={header} key={header}>{header}</option>)}
                </select>
              </label>
            ))}
          </div>

          <h3>Preview</h3>
          <div className="csv-preview"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{preview.map((row, index) => <tr key={index}>{headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div>

          <fieldset><legend>When an email already exists</legend>
            <label><input type="radio" checked={strategy === "SKIP"} onChange={() => setStrategy("SKIP")} /> Skip that row</label>
            <label><input type="radio" checked={strategy === "UPDATE"} onChange={() => setStrategy("UPDATE")} /> Update the existing lead with non-empty CSV values</label>
          </fieldset>
          <button className="primary-button" type="button" disabled={importing} onClick={() => void runImport()}>{importing ? "Importing…" : `Import ${rows.length} leads`}</button>
        </section>
      )}

      {error && <div className="inline-error" role="alert">{error}</div>}
      {result && <section className="panel csv-result"><div className="csv-section-heading"><span>3</span><div><h2>Import complete</h2><p>{result.total} rows processed</p></div></div><div><b>{result.created}<small>Created</small></b><b>{result.updated}<small>Updated</small></b><b>{result.skipped}<small>Skipped</small></b><b>{result.failed}<small>Failed</small></b></div>{result.errors.length > 0 && <ul>{result.errors.map((item) => <li key={`${item.row}-${item.message}`}>Row {item.row}: {item.message}</li>)}</ul>}<Link className="primary-button" href="/leads">View lead pipeline</Link></section>}
    </div>
  );
}
