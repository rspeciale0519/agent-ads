import { randomUUID } from "node:crypto";
import { z } from "zod";
import { appendAuditEvent } from "../audit";
import { getAssuranceStatus, requireAal2 } from "../auth/assurance";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { mapDubsadoOutcomeStages, parseDubsadoExport } from "../connections/providers/dubsado-export";
import { ConnectionServiceError, requireConnectionPermission } from "../connections/service";
import { buildDubsadoEvidenceSnapshot } from "./dubsado-evidence";
import { createEvidenceSnapshotRecord } from "./evidence-store";

export const DUBSADO_IMPORT_COLLECTOR_VERSION = "dubsado-export-import-1.0.0";

// Vercel functions accept request bodies up to 4.5 MB, so cap the CSV below that.
const MAX_EXPORT_CHARACTERS = 4_000_000;

const isoDate = z.string().trim().refine((value) => Number.isFinite(Date.parse(value)), "Use an ISO date.");

export const dubsadoImportInputSchema = z.object({
  csv: z.string().min(1).max(MAX_EXPORT_CHARACTERS),
  // Which export column holds each field, for example { recordId: "Project ID" }.
  mapping: z.record(z.string(), z.string()),
  // Which Dubsado status means which funnel stage, for example { Booked: "booked_revenue" }.
  statusMap: z.record(z.string(), z.string()),
  reportingWindow: z.object({ start: isoDate, end: isoDate }),
  primaryOutcomeKey: z.enum(["qualified_leads", "booked_calls", "closed_won_deals", "booked_revenue"]),
}).strict();

export type DubsadoImportInput = z.infer<typeof dubsadoImportInputSchema>;

// Parser and evidence errors are plain Errors whose message is a stable code.
// Return them as a 422 so the person uploading can fix the file or mapping.
function toImportError(error: unknown) {
  if (error instanceof Error && /^(?:DUBSADO|EVIDENCE)_[A-Z0-9_]+$/u.test(error.message)) return new ConnectionServiceError(error.message, 422);
  return error;
}

// Imports one approved Dubsado export for a Dubsado connection, saves the
// resulting read-only evidence snapshot, and records an audit event with
// counts only. No row values or record identifiers leave this function.
export async function importDubsadoExport(context: OrganizationContext, connectionId: string, input: unknown, correlationId: string, now = new Date()) {
  requireConnectionPermission(context, "connections.verify");
  requireAal2(await getAssuranceStatus(context));
  const parsed = dubsadoImportInputSchema.parse(input);
  const windowStart = Date.parse(parsed.reportingWindow.start);
  const windowEnd = Date.parse(parsed.reportingWindow.end);
  if (windowEnd <= windowStart) throw new ConnectionServiceError("DUBSADO_IMPORT_WINDOW_INVALID", 422);
  if (windowEnd > now.getTime()) throw new ConnectionServiceError("DUBSADO_IMPORT_WINDOW_IN_FUTURE", 422);

  const connection = await withTenantContext(context, (tx) => tx.connection.findFirst({
    where: { id: connectionId, organizationId: context.organizationId, archivedAt: null },
    select: { id: true, provider: true },
  }));
  if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
  if (connection.provider !== "dubsado") throw new ConnectionServiceError("PROVIDER_NOT_SUPPORTED", 409);

  let snapshot;
  let summary;
  try {
    const exportResult = parseDubsadoExport(parsed.csv, parsed.mapping);
    const mapped = mapDubsadoOutcomeStages(exportResult.records, parsed.statusMap);
    // With a date column, count only records dated inside the window.
    // Without one, every row counts and the summary says so.
    const dated = Boolean(parsed.mapping.sourceDate);
    const inWindow = dated
      ? mapped.filter((record) => record.sourceDate !== null && Date.parse(record.sourceDate) >= windowStart && Date.parse(record.sourceDate) < windowEnd)
      : mapped;
    summary = {
      rowsRead: exportResult.records.length,
      rowsCounted: inWindow.length,
      rowsOutsideWindow: mapped.length - inWindow.length,
      blankRowsSkipped: exportResult.skippedRows,
      filteredByDate: dated,
    };
    const capturedAt = now.toISOString();
    snapshot = buildDubsadoEvidenceSnapshot({
      snapshotId: `dubsado-import-${randomUUID()}`,
      organizationId: context.organizationId,
      evidenceId: `dubsado-export-${randomUUID()}`,
      reportingWindow: { start: new Date(windowStart).toISOString(), end: new Date(windowEnd).toISOString() },
      capturedAt,
      collectorVersion: DUBSADO_IMPORT_COLLECTOR_VERSION,
      primaryOutcomeKey: parsed.primaryOutcomeKey,
      records: inWindow,
    });
  } catch (error) {
    throw toImportError(error);
  }

  const saved = await withTenantContext(context, async (tx) => {
    const record = await createEvidenceSnapshotRecord(tx, context, snapshot);
    await appendAuditEvent(tx, context, {
      action: "ai_reach.evidence_imported",
      resourceType: "connection",
      resourceId: connection.id,
      outcomeCode: "saved",
      correlationId,
      metadata: { provider: "dubsado", snapshotKey: record.snapshotKey, metricCount: snapshot.metrics.length, ...summary },
    });
    return record;
  });
  return {
    snapshotKey: saved.snapshotKey,
    primaryOutcomeKey: snapshot.primaryOutcomeKey,
    metrics: snapshot.metrics.map((metric) => ({ key: metric.key, value: metric.value, unit: metric.unit, currency: metric.currency ?? null })),
    summary,
  };
}
