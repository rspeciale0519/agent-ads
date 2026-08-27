import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { OrganizationContext, TenantTransaction } from "./auth/organization-context";
import { safeAuditMetadata } from "./connections/redaction";

export type AuditInput = {
  action: string;
  resourceType: string;
  resourceId?: string;
  outcomeCode: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
};

export async function appendAuditEvent(tx: TenantTransaction, context: OrganizationContext, input: AuditInput) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${context.organizationId}::text, 0::bigint))`;
  const previous = await tx.auditEvent.findFirst({ where: { organizationId: context.organizationId }, orderBy: { createdAt: "desc" }, select: { integrityHash: true } });
  const metadata = safeAuditMetadata(input.metadata ?? {});
  const createdAt = new Date();
  const correlationId = input.correlationId ?? randomUUID();
  const integrityHash = createHash("sha256").update(JSON.stringify({ previousHash: previous?.integrityHash ?? null, organizationId: context.organizationId, actorUserId: context.userId, action: input.action, resourceType: input.resourceType, resourceId: input.resourceId ?? null, correlationId, outcomeCode: input.outcomeCode, metadata, createdAt: createdAt.toISOString() })).digest("hex");
  return tx.auditEvent.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: input.action, resourceType: input.resourceType, resourceId: input.resourceId, correlationId, causationId: input.causationId, outcomeCode: input.outcomeCode, metadata: metadata as Prisma.InputJsonValue, previousHash: previous?.integrityHash, integrityHash, createdAt } });
}
