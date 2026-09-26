import { afterEach, describe, expect, it, vi } from "vitest";

const withTenantContextMock = vi.hoisted(() => vi.fn());
const appendAuditEventMock = vi.hoisted(() => vi.fn());
const assuranceMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/organization-context", () => ({ withTenantContext: withTenantContextMock }));
vi.mock("../audit", () => ({ appendAuditEvent: appendAuditEventMock }));
vi.mock("../auth/assurance", () => ({
  getAssuranceStatus: assuranceMock,
  requireAal2: (status: { aal: string }) => { if (status.aal !== "aal2") throw Object.assign(new Error("AAL2_REQUIRED"), { code: "AAL2_REQUIRED" }); },
}));
// Keep the real error type and permission check without loading provider adapters.
vi.mock("../connections/service", () => {
  class ConnectionServiceError extends Error {
    constructor(readonly code: string, readonly status = 400) { super(code); }
  }
  return {
    ConnectionServiceError,
    requireConnectionPermission: (context: { permissions: string[] }, permission: string) => {
      if (!context.permissions.includes(permission)) throw new ConnectionServiceError("PERMISSION_DENIED", 403);
    },
  };
});

import { importDubsadoExport } from "./dubsado-import";

const organizationId = "11111111-1111-4111-8111-111111111111";
const connectionId = "55555555-5555-4555-8555-555555555555";
const context = {
  organizationId,
  organizationName: "Test organization",
  userId: "22222222-2222-4222-8222-222222222222",
  authSubject: "33333333-3333-4333-8333-333333333333",
  email: "test@example.test",
  role: "owner" as const,
  permissions: ["connections.view", "connections.verify"],
  sessionId: "session-1",
  assurance: "aal2" as const,
};
const now = new Date("2026-09-01T12:00:00.000Z");
const csv = [
  "Project ID,Status,Created,Revenue,Currency",
  "proj-1,Qualified,2026-08-03,,",
  "proj-2,Call,2026-08-05,,",
  "proj-3,Booked,2026-08-20,1500,USD",
  "proj-4,Qualified,2026-07-15,,",
].join("\n");
const input = {
  csv,
  mapping: { recordId: "Project ID", status: "Status", sourceDate: "Created", bookedRevenue: "Revenue", currency: "Currency" },
  statusMap: { Qualified: "qualified_opportunity", Call: "booked_call", Booked: "booked_revenue" },
  reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-09-01T00:00:00.000Z" },
  primaryOutcomeKey: "qualified_leads",
};

// Serves the connection lookup, then the save transaction, from fake models.
const readyConnection = { id: connectionId, provider: "dubsado", status: "active_read_only", accessMode: "read_only", authorizationMethod: "approved_export" };

function mockDatabase(connection: Record<string, string> | null = readyConnection) {
  const findFirst = vi.fn().mockResolvedValue(connection);
  const create = vi.fn().mockImplementation(async ({ data }) => ({ id: "row-1", snapshotKey: data.snapshotKey, capturedAt: data.capturedAt }));
  withTenantContextMock.mockImplementation(async (_context, callback) => callback({ connection: { findFirst }, aiReachEvidenceSnapshot: { create } }));
  return { findFirst, create };
}

afterEach(() => vi.resetAllMocks());

describe("Dubsado export import", () => {
  it("saves a snapshot counted only from records inside the window", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    const { create } = mockDatabase();
    const result = await importDubsadoExport(context, connectionId, input, "corr-1", now);
    const metrics = Object.fromEntries(result.metrics.map((metric) => [metric.key, metric.value]));
    expect(metrics).toMatchObject({ qualified_leads: 1, booked_calls: 1, closed_won_deals: 1, booked_revenue: 1500 });
    expect(result.summary).toMatchObject({ rowsRead: 4, rowsCounted: 3, rowsOutsideWindow: 1, blankRowsSkipped: 0 });
    expect(create.mock.calls[0][0].data.organizationId).toBe(organizationId);
    // The saved evidence names the mapping it was counted with.
    expect(create.mock.calls[0][0].data.collectorVersion).toBe(`dubsado-export-import-1.0.0+map.${result.summary.mappingDigest}`);
  });

  it("audits counts only, never row values or record identifiers", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    mockDatabase();
    await importDubsadoExport(context, connectionId, input, "corr-1", now);
    const audit = appendAuditEventMock.mock.calls[0][2];
    expect(audit.action).toBe("ai_reach.evidence_imported");
    expect(JSON.stringify(audit)).not.toContain("proj-");
    expect(audit.metadata.rowsCounted).toBe(3);
  });

  it("requires the verify permission and MFA before reading the database", async () => {
    await expect(importDubsadoExport({ ...context, permissions: ["connections.view"] }, connectionId, input, "corr-1", now)).rejects.toThrow("PERMISSION_DENIED");
    assuranceMock.mockResolvedValue({ aal: "aal1" });
    await expect(importDubsadoExport(context, connectionId, input, "corr-1", now)).rejects.toThrow("AAL2_REQUIRED");
    expect(withTenantContextMock).not.toHaveBeenCalled();
  });

  it("rejects a window that ends in the future", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    await expect(importDubsadoExport(context, connectionId, { ...input, reportingWindow: { start: "2026-08-01T00:00:00.000Z", end: "2026-10-01T00:00:00.000Z" } }, "corr-1", now)).rejects.toMatchObject({ code: "DUBSADO_IMPORT_WINDOW_IN_FUTURE", status: 422 });
  });

  it("only accepts a Dubsado connection in this organization", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    mockDatabase({ ...readyConnection, provider: "google_ads" });
    await expect(importDubsadoExport(context, connectionId, input, "corr-1", now)).rejects.toMatchObject({ code: "PROVIDER_NOT_SUPPORTED" });
    mockDatabase(null);
    await expect(importDubsadoExport(context, connectionId, input, "corr-1", now)).rejects.toMatchObject({ code: "CONNECTION_NOT_FOUND", status: 404 });
  });

  it("refuses a Dubsado route that is not verified as a read-only approved export", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    for (const connection of [{ ...readyConnection, status: "pending" }, { ...readyConnection, status: "degraded" }, { ...readyConnection, authorizationMethod: "client_owned_integration" }]) {
      const { create } = mockDatabase(connection);
      await expect(importDubsadoExport(context, connectionId, input, "corr-1", now)).rejects.toMatchObject({ code: "CONNECTION_NOT_READY", status: 409 });
      expect(create).not.toHaveBeenCalled();
    }
  });

  it("requires a date column so counts match the reporting window", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    const { sourceDate: _unused, ...withoutDate } = input.mapping;
    void _unused;
    await expect(importDubsadoExport(context, connectionId, { ...input, mapping: withoutDate }, "corr-1", now)).rejects.toMatchObject({ code: "DUBSADO_IMPORT_DATE_COLUMN_REQUIRED", status: 422 });
    expect(withTenantContextMock).not.toHaveBeenCalled();
  });

  it("rejects a record ID that appears twice instead of counting it twice", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    const { create } = mockDatabase();
    await expect(importDubsadoExport(context, connectionId, { ...input, csv: `${csv}\nproj-1,Qualified,2026-08-04,,` }, "corr-1", now)).rejects.toMatchObject({ code: "DUBSADO_IMPORT_DUPLICATE_RECORD_ROW_6", status: 422 });
    expect(create).not.toHaveBeenCalled();
  });

  it("gives the same mapping the same digest regardless of key order", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    mockDatabase();
    const first = await importDubsadoExport(context, connectionId, input, "corr-1", now);
    mockDatabase();
    const reordered = { ...input, statusMap: { Booked: "booked_revenue", Call: "booked_call", Qualified: "qualified_opportunity" } };
    const second = await importDubsadoExport(context, connectionId, reordered, "corr-2", now);
    expect(second.summary.mappingDigest).toBe(first.summary.mappingDigest);
  });

  it("returns fixable file problems as 422 errors without saving", async () => {
    assuranceMock.mockResolvedValue({ aal: "aal2" });
    const { create } = mockDatabase();
    await expect(importDubsadoExport(context, connectionId, { ...input, statusMap: { Qualified: "qualified_opportunity" } }, "corr-1", now)).rejects.toMatchObject({ code: "DUBSADO_EXPORT_STATUS_UNMAPPED_ROW_3", status: 422 });
    await expect(importDubsadoExport(context, connectionId, { ...input, mapping: { ...input.mapping, recordId: "Client Email" } }, "corr-1", now)).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
