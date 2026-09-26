import { Prisma } from "@prisma/client";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { readOnlyEvidenceSnapshotSchema, type ReadOnlyEvidenceSnapshot } from "./evidence-contract";

// Saves one validated snapshot for the caller's organization. Snapshots are
// append-only: a correction is saved as a new snapshot with a new key.
export async function saveEvidenceSnapshot(context: OrganizationContext, value: unknown) {
  const snapshot = readOnlyEvidenceSnapshotSchema.parse(value);
  if (snapshot.organizationId !== context.organizationId) throw new Error("EVIDENCE_SNAPSHOT_ORGANIZATION_MISMATCH");
  try {
    return await withTenantContext(context, (tx) => tx.aiReachEvidenceSnapshot.create({
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
    }));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("EVIDENCE_SNAPSHOT_ALREADY_SAVED");
    throw error;
  }
}

// Returns the newest valid snapshot, or null when none exists. A stored row
// that no longer matches the contract is skipped rather than shown.
export async function readLatestEvidenceSnapshot(context: OrganizationContext): Promise<ReadOnlyEvidenceSnapshot | null> {
  const rows = await withTenantContext(context, (tx) => tx.aiReachEvidenceSnapshot.findMany({
    where: { organizationId: context.organizationId },
    orderBy: [{ capturedAt: "desc" }, { createdAt: "desc" }],
    take: 5,
    select: { snapshot: true },
  }));
  for (const row of rows) {
    const parsed = readOnlyEvidenceSnapshotSchema.safeParse(row.snapshot);
    if (parsed.success && parsed.data.organizationId === context.organizationId) return parsed.data;
  }
  return null;
}
