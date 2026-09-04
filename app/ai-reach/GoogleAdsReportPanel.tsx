"use client";

import { useEffect, useMemo, useState } from "react";
import { formatGoogleAdsMoney, formatGoogleAdsNumber, formatGoogleAdsPercent, parseGoogleAdsReportPayload, visibleGoogleAdsReportRows } from "../../lib/ai-reach/google-ads-report-view";
import type { GoogleAdsReport } from "../../lib/connections/providers/google-ads-report";

export type GoogleAdsReportTarget = { connectionId: string; customerId: string; displayName: string };
type Props = { targets: GoogleAdsReportTarget[] };
type DateRange = { startDate: string; endDate: string };

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initialDateRange(): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
}

function reportErrorMessage(status: number, code: unknown) {
  if (status === 401 || status === 403) return "Your session cannot view this report. Sign in again or ask an owner to check access.";
  if (status === 409 || code === "CONNECTION_NOT_READY" || code === "RESOURCE_NOT_SELECTED") return "Google Ads read-only access needs review before this report can load.";
  if (status === 503 || code === "CONNECTIONS_DISABLED") return "Google Ads reporting is not enabled for this pilot yet.";
  return "The Google Ads report could not load. Try again later.";
}

export default function GoogleAdsReportPanel({ targets }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>(() => initialDateRange());
  const [targetIndex, setTargetIndex] = useState(0);
  const [report, setReport] = useState<GoogleAdsReport | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const target = targets[targetIndex] ?? targets[0];
  const dateError = dateRange.startDate && dateRange.endDate && dateRange.endDate < dateRange.startDate
    ? "Choose an end date after the start date."
    : null;
  const rows = useMemo(() => report ? visibleGoogleAdsReportRows(report) : [], [report]);

  useEffect(() => {
    if (targetIndex >= targets.length) setTargetIndex(0);
  }, [targetIndex, targets.length]);

  async function loadReport() {
    if (!target || dateError) return;
    setState("loading");
    setError(null);
    setReport(null);
    const query = new URLSearchParams({ customerId: target.customerId, ...dateRange });
    try {
      const response = await fetch(`/api/v1/connections/${encodeURIComponent(target.connectionId)}/reports/google-ads?${query.toString()}`, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const code = body && typeof body === "object" && "error" in body ? body.error : null;
        throw new Error(reportErrorMessage(response.status, code));
      }
      const parsed = parseGoogleAdsReportPayload(body);
      if (!parsed) throw new Error("The report returned an unsupported format.");
      setReport(parsed);
      setState("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The Google Ads report could not load. Try again later.");
      setState("error");
    }
  }

  if (!targets.length) return <article className="workspace-card ai-reach-report-card" aria-label="Google Ads report"><div className="workspace-card-heading"><div><span className="eyebrow">Campaign evidence</span><h2>Google Ads reporting</h2></div><span className="ai-reach-readonly">Read-only</span></div><div className="ai-reach-report-empty"><strong>Connect Google Ads before reviewing campaign results.</strong><p>Use an official read-only connection, select an ads customer, and verify access. AI Reach will not change ads or spending.</p></div></article>;

  return <article className="workspace-card ai-reach-report-card" aria-label="Google Ads report">
    <div className="workspace-card-heading"><div><span className="eyebrow">Campaign evidence</span><h2>Google Ads reporting</h2></div><span className="ai-reach-readonly">Read-only</span></div>
    <p className="ai-reach-report-intro">Review platform-reported campaign activity for a short date range. This view does not prove qualified leads, revenue, or causality.</p>
    <div className="ai-reach-report-controls">
      <label><span>Ads customer</span><select value={targetIndex} onChange={(event) => { setTargetIndex(Number(event.target.value)); setReport(null); setState("idle"); }} aria-label="Google Ads customer">{targets.map((item, index) => <option value={index} key={`${item.connectionId}-${item.customerId}`}>{item.displayName}</option>)}</select></label>
      <label><span>From</span><input type="date" value={dateRange.startDate} onChange={(event) => setDateRange((current) => ({ ...current, startDate: event.target.value }))} /></label>
      <label><span>To</span><input type="date" value={dateRange.endDate} onChange={(event) => setDateRange((current) => ({ ...current, endDate: event.target.value }))} /></label>
      <button className="primary-button" type="button" onClick={() => void loadReport()} disabled={state === "loading" || Boolean(dateError)}>{state === "loading" ? "Loading…" : "Load report"}</button>
    </div>
    {dateError && <p className="ai-reach-report-error" role="alert">{dateError}</p>}
    {state === "error" && error && <div className="ai-reach-report-error" role="alert"><strong>{error}</strong><button className="text-button" type="button" onClick={() => void loadReport()}>Try again</button></div>}
    {state === "loading" && <div className="ai-reach-report-loading" aria-busy="true"><span className="ai-reach-skeleton" /><span className="ai-reach-skeleton" /><span className="ai-reach-skeleton" /></div>}
    {state === "success" && report && <div className="ai-reach-report-results">
      <div className="ai-reach-report-stat-grid"><div><span>Spend</span><strong>{formatGoogleAdsMoney(report.totals.costMicros, report.currencyCode)}</strong></div><div><span>Impressions</span><strong>{formatGoogleAdsNumber(report.totals.impressions)}</strong></div><div><span>Clicks</span><strong>{formatGoogleAdsNumber(report.totals.clicks)}</strong></div><div><span>Conversions</span><strong>{formatGoogleAdsNumber(report.totals.conversions)}</strong></div><div><span>Click rate</span><strong>{formatGoogleAdsPercent(report.totals.ctr)}</strong></div></div>
      {report.rows.length ? <div className="ai-reach-report-table-wrap"><table className="ai-reach-report-table"><caption>Recent campaign rows, newest first</caption><thead><tr><th scope="col">Campaign</th><th scope="col">Date</th><th scope="col">Clicks</th><th scope="col">Spend</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.campaignId}-${row.date ?? "all"}`}><th scope="row">{row.campaignName ?? `Campaign ${row.campaignId}`}</th><td>{row.date ?? "All dates"}</td><td>{formatGoogleAdsNumber(row.metrics.clicks)}</td><td>{formatGoogleAdsMoney(row.metrics.costMicros, report.currencyCode)}</td></tr>)}</tbody></table>{report.rows.length > rows.length && <p className="ai-reach-report-note">Showing {rows.length} of {report.rows.length} rows.</p>}</div> : <div className="ai-reach-report-empty"><strong>No campaign activity was returned for this date range.</strong><p>Try a wider date range after confirming the selected customer.</p></div>}
      <p className="ai-reach-report-footnote">Platform-reported data · {report.reportingWindow ? `${report.reportingWindow.start} to ${report.reportingWindow.end}` : "reporting window not supplied"} · Read-only observation</p>
    </div>}
  </article>;
}
