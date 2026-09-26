"use client";

import Link from "next/link";
import { useState } from "react";
import { mutationFetch, useMutationIdentityStore } from "../../../lib/api/client-mutation";

type ImportResult = {
  metrics: Array<{ key: string; value: number; unit: string; currency: string | null }>;
  summary: { rowsRead: number; rowsCounted: number; rowsOutsideWindow: number; blankRowsSkipped: number; mappingDigest: string };
};
type ResponseBody = { error?: string; result?: ImportResult };

// Stage names the status map may use, shown so people can copy them.
const stages = ["inquiry", "qualified_opportunity", "booked_call", "completed_qualified_meeting", "proposal_issued", "signed_engagement", "booked_revenue", "cancelled", "refunded"];

// Turns lines like "Booked = booked_revenue" into { Booked: "booked_revenue" }.
function parseStatusMap(text: string) {
  return Object.fromEntries(text.split("\n")
    .map((line) => line.split("="))
    .filter((parts) => parts.length === 2 && parts[0].trim() && parts[1].trim())
    .map(([status, stage]) => [status.trim(), stage.trim()]));
}

export default function DubsadoImport({ connectionId }: { connectionId: string }) {
  const mutations = useMutationIdentityStore();
  const intent = `dubsado-import:${connectionId}`;
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState({ recordId: "Project ID", status: "Status", sourceDate: "", bookedRevenue: "", currency: "" });
  const [statusMap, setStatusMap] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [primaryOutcomeKey, setPrimaryOutcomeKey] = useState("qualified_leads");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  const submit = async () => {
    if (!file || !start || !end || !columns.sourceDate.trim()) {
      setError("Choose the export file, the date column, and the reporting dates.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      // Blank optional columns are left out so the parser does not look for them.
      const mapping = Object.fromEntries(Object.entries(columns).filter(([, column]) => column.trim()).map(([field, column]) => [field, column.trim()]));
      const response = await mutationFetch(mutations, intent, `/api/v1/connections/${connectionId}/imports/dubsado`, {
        method: "POST",
        body: JSON.stringify({
          csv: await file.text(),
          mapping,
          statusMap: parseStatusMap(statusMap),
          reportingWindow: { start: new Date(`${start}T00:00:00.000Z`).toISOString(), end: new Date(`${end}T00:00:00.000Z`).toISOString() },
          primaryOutcomeKey,
        }),
      });
      const body = await response.json() as ResponseBody;
      if (!response.ok || !body.result) {
        // A failed attempt may be retried with changed inputs, so start a fresh request identity.
        mutations.reset(intent);
        throw new Error(body.error ?? "The export could not be imported.");
      }
      setResult(body.result);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The export could not be imported.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="dubsado-import">
    <p className="workspace-muted">Upload an approved Dubsado CSV export. Map only record IDs, statuses, dates, and amounts. Names, emails, and phone numbers are refused.</p>
    <label>Export file<input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
    <fieldset><legend>Export column names</legend>
      <label>Record ID column<input value={columns.recordId} onChange={(event) => setColumns({ ...columns, recordId: event.target.value })} /></label>
      <label>Status column<input value={columns.status} onChange={(event) => setColumns({ ...columns, status: event.target.value })} /></label>
      <label>Date column (counts only rows dated inside the dates below)<input value={columns.sourceDate} onChange={(event) => setColumns({ ...columns, sourceDate: event.target.value })} /></label>
      <label>Revenue column (optional)<input value={columns.bookedRevenue} onChange={(event) => setColumns({ ...columns, bookedRevenue: event.target.value })} /></label>
      <label>Currency column (optional)<input value={columns.currency} onChange={(event) => setColumns({ ...columns, currency: event.target.value })} /></label>
    </fieldset>
    <label>Status map, one per line as “Dubsado status = stage”<textarea rows={5} value={statusMap} placeholder={"Lead = qualified_opportunity\nConsult Booked = booked_call\nBooked = booked_revenue"} onChange={(event) => setStatusMap(event.target.value)} /></label>
    <small>Stages: {stages.join(", ")}</small>
    <div className="dubsado-import-row">
      <label>From<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label>Up to (not including)<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <label>Main outcome<select value={primaryOutcomeKey} onChange={(event) => setPrimaryOutcomeKey(event.target.value)}>
        <option value="qualified_leads">Qualified leads</option>
        <option value="booked_calls">Booked calls</option>
        <option value="closed_won_deals">Closed-won deals</option>
        <option value="booked_revenue">Booked revenue</option>
      </select></label>
    </div>
    <button type="button" className="primary-button" disabled={busy} onClick={submit}>{busy ? "Importing…" : "Import export"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {result && <div className="form-success" role="status">
      <p>Saved. Counted {result.summary.rowsCounted} of {result.summary.rowsRead} rows{` (${result.summary.rowsOutsideWindow} undated or outside the dates)`}.</p>
      <ul>{result.metrics.map((metric) => <li key={metric.key}>{metric.key.replaceAll("_", " ")}: {metric.unit === "currency" ? `${metric.value} ${metric.currency}` : metric.value}</li>)}</ul>
      <Link href="/ai-reach">See it in AI Reach →</Link>
    </div>}
  </div>;
}
