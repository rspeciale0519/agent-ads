import { Prisma } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseReadOnlyEvidenceSnapshot, type ReadOnlyEvidenceSnapshot } from "./evidence-contract";
import { buildOutcomeTiles } from "./outcome-tiles";

const withTenantContextMock = vi.hoisted(() => vi.fn());
vi.mock("../auth/organization-context", () => ({ withTenantContext: withTenantContextMock }));

import { readLatestEvidenceSnapshot, saveEvidenceSnapshot } from "./evidence-store";

const organizationId = "11111111-1111-4111-8111-111111111111";
const context = {
  organizationId,
  organizationName: "Test organization",
  userId: "22222222-2222-4222-8222-222222222222",
  authSubject: "33333333-3333-4333-8333-333333333333",
  email: "test@example.test",
  role: "owner" as const,
  permissions: ["connections.read"],
  sessionId: "session-1",
  assurance: "aal2" as const,
};
const window = { start: "2026-08-01T00:00:00.000Z", end: "2026-08-30T00:00:00.000Z" };

function fixture(overrides: Partial<ReadOnlyEvidenceSnapshot> = {}): ReadOnlyEvidenceSnapshot {
  return parseReadOnlyEvidenceSnapshot({
    snapshotId: "snapshot-synthetic-1",
    organizationId,
    primaryOutcomeKey: "qualified_leads",
    reportingWindow: window,
    capturedAt: "2026-08-30T10:00:00.000Z",
    collectorVersion: "fixture-1.0.0",
    status: "complete",
    freshness: { state: "fresh", checkedAt: "2026-08-30T10:00:00.000Z", maxAgeHours: 48 },
    reconciliation: { state: "passed", limitation: "Synthetic fixture only." },
    evidence: [{ id: "evidence-synthetic-1", sourceClass: "business_outcome_observation", provider: "synthetic-crm", method: "authorized_export", collectedAt: "2026-08-30T10:00:00.000Z", collectorVersion: "fixture-1.0.0", limitations: [] }],
    metrics: [
      { key: "qualified_leads", value: 12, unit: "count", reportingWindow: window, attribution: "direct_first_party", evidenceIds: ["evidence-synthetic-1"], limitations: [] },
      { key: "booked_revenue", value: 4500, unit: "currency", currency: "USD", reportingWindow: window, attribution: "direct_first_party", evidenceIds: ["evidence-synthetic-1"], limitations: [] },
    ],
    limitations: [],
    ...overrides,
  });
}

// Runs the tenant callback against a fake Prisma client with the given model methods.
function mockTenant(model: Record<string, ReturnType<typeof vi.fn>>) {
  withTenantContextMock.mockImplementationOnce(async (_context, callback) => callback({ aiReachEvidenceSnapshot: model }));
}

afterEach(() => vi.resetAllMocks());

describe("AI Reach evidence store", () => {
  it("saves a validated snapshot under the caller's organization", async () => {
    const create = vi.fn().mockResolvedValue({ id: "row-1", snapshotKey: "snapshot-synthetic-1", capturedAt: new Date() });
    mockTenant({ create });
    await saveEvidenceSnapshot(context, fixture());
    const data = create.mock.calls[0][0].data;
    expect(data.organizationId).toBe(organizationId);
    expect(data.snapshotKey).toBe("snapshot-synthetic-1");
    expect(data.primaryOutcomeKey).toBe("qualified_leads");
    expect(data.snapshot.metrics).toHaveLength(2);
  });

  it("refuses a snapshot for another organization before touching the database", async () => {
    await expect(saveEvidenceSnapshot(context, fixture({ organizationId: "44444444-4444-4444-8444-444444444444" }))).rejects.toThrow("EVIDENCE_SNAPSHOT_ORGANIZATION_MISMATCH");
    expect(withTenantContextMock).not.toHaveBeenCalled();
  });

  it("refuses an invalid snapshot before touching the database", async () => {
    await expect(saveEvidenceSnapshot(context, { ...fixture(), metrics: [] })).rejects.toThrow();
    expect(withTenantContextMock).not.toHaveBeenCalled();
  });

  it("reports a duplicate snapshot key", async () => {
    const create = vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
    mockTenant({ create });
    await expect(saveEvidenceSnapshot(context, fixture())).rejects.toThrow("EVIDENCE_SNAPSHOT_ALREADY_SAVED");
  });

  it("returns the newest valid snapshot and skips rows that fail the contract", async () => {
    const findMany = vi.fn().mockResolvedValue([{ snapshot: { snapshotId: "broken" } }, { snapshot: fixture() }]);
    mockTenant({ findMany });
    const snapshot = await readLatestEvidenceSnapshot(context);
    expect(snapshot?.snapshotId).toBe("snapshot-synthetic-1");
    expect(findMany.mock.calls[0][0].where).toEqual({ organizationId });
  });

  it("ignores a stored snapshot that names another organization", async () => {
    mockTenant({ findMany: vi.fn().mockResolvedValue([{ snapshot: fixture({ organizationId: "44444444-4444-4444-8444-444444444444" }) }]) });
    expect(await readLatestEvidenceSnapshot(context)).toBeNull();
  });

  it("returns null when nothing is saved", async () => {
    mockTenant({ findMany: vi.fn().mockResolvedValue([]) });
    expect(await readLatestEvidenceSnapshot(context)).toBeNull();
  });
});

describe("AI Reach outcome tiles", () => {
  it("says an outcome is missing instead of guessing when no snapshot exists", () => {
    const tiles = buildOutcomeTiles(null);
    expect(tiles.map((tile) => tile.value)).toEqual(["Needs confirmation", "Not measured", "Not measured", "Not measured"]);
  });

  it("shows saved metrics and marks the rest as not measured", () => {
    const tiles = buildOutcomeTiles(fixture());
    expect(tiles[0]).toMatchObject({ label: "Primary outcome: Qualified leads", value: "12" });
    expect(tiles[0].detail).toContain("complete snapshot");
    expect(tiles[1]).toMatchObject({ label: "Qualified meetings", value: "Not measured" });
    expect(tiles[3]).toMatchObject({ label: "Booked revenue", value: "$4,500" });
  });

  it("labels a partial snapshot so the number is not read as final", () => {
    expect(buildOutcomeTiles(fixture({ status: "partial" }))[0].detail).toContain("partial snapshot");
  });
});
