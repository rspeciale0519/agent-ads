import { Prisma } from "@prisma/client";
import { withTenantContext, type OrganizationContext, type TenantTransaction } from "../auth/organization-context";
import { applyCurrentDubsadoExportWindow } from "./dubsado-evidence";
import { readOnlyEvidenceSnapshotSchema, type ReadOnlyEvidenceSnapshot } from "./evidence-contract";

// Writes one validated snapshot inside an existing tenant transaction so the
// caller can record an audit event in the same commit.
export async function createEvidenceSnapshotRecord(tx: TenantTransaction, context: OrganizationContext, snapshot: ReadOnlyEvidenceSnapshot) {
  if (snapshot.organizationId !== context.organizationId) throw new Error("EVIDENCE_SNAPSHOT_ORGANIZATION_MISMATCH");
  try {
    return await tx.aiReachEvidenceSnapshot.create({
      data: {
        organizationId: context.organizationId,
        snapshotKey: snapshot.snapshotId,
        primaryOutcomeKey: snapshot.primaryOutcomeKey,
        status: snapshot.status,
        reportingWindowStart: new Date(snapshot.reportingWindow.start),
        reportingWindowEnd: new Date(snapshot.reportingWindow.end),
        capturedAt: new Date(snapshot.capturedAt),
        collectorVersion: snapshot.collectorVersion,
        snapshot: snapshot as Prisma.InputJsonObject,
      },
      select: { id: true, snapshotKey: true, capturedAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("EVIDENCE_SNAPSHOT_ALREADY_SAVED");
    throw error;
  }
}

// Saves one validated snapshot for the caller's organization. Snapshots are
// append-only: a correction is saved as a new snapshot with a new key.
export async function saveEvidenceSnapshot(context: OrganizationContext, value: unknown) {
  const snapshot = readOnlyEvidenceSnapshotSchema.parse(value);
  if (snapshot.organizationId !== context.organizationId) throw new Error("EVIDENCE_SNAPSHOT_ORGANIZATION_MISMATCH");
  return withTenantContext(context, (tx) => createEvidenceSnapshotRecord(tx, context, snapshot));
}

const readBatchSize = 20;

// Returns the newest valid snapshot, or null when none exists. A stored row
// that no longer matches the contract is skipped rather than shown, so older
// rows are read in batches until a valid one is found.
export async function readLatestEvidenceSnapshot(context: OrganizationContext): Promise<ReadOnlyEvidenceSnapshot | null> {
  for (let skip = 0; ; skip += readBatchSize) {
    const rows = await withTenantContext(context, (tx) => tx.aiReachEvidenceSnapshot.findMany({
      where: { organizationId: context.organizationId },
      orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip,
      take: readBatchSize,
      select: { snapshot: true },
    }));
    for (const row of rows) {
      const parsed = readOnlyEvidenceSnapshotSchema.safeParse(row.snapshot);
      if (parsed.success && parsed.data.organizationId === context.organizationId) return applyCurrentDubsadoExportWindow(parsed.data);
    }
    if (rows.length < readBatchSize) return null;
  }
}
