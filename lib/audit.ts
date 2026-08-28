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

type AuditChainTip = {
  integrityHash: string;
  createdAt: Date;
};

async function readAuditChainTip(tx: TenantTransaction, organizationId: string) {
  const tips = await tx.$queryRaw<AuditChainTip[]>`
    SELECT candidate.integrity_hash AS "integrityHash", candidate.created_at AS "createdAt"
    FROM public.audit_events AS candidate
    WHERE candidate.organization_id = ${organizationId}::uuid
      AND NOT EXISTS (
        SELECT 1
        FROM public.audit_events AS successor
        WHERE successor.organization_id = candidate.organization_id
          AND successor.previous_hash = candidate.integrity_hash
      )
    ORDER BY candidate.created_at DESC, candidate.id DESC
    LIMIT 2
  `;
  if (tips.length > 1) throw new Error("AUDIT_CHAIN_FORK_DETECTED");
  if (tips[0]) return tips[0];
  const existing = await tx.auditEvent.findFirst({ where: { organizationId }, select: { id: true } });
  if (existing) throw new Error("AUDIT_CHAIN_TIP_MISSING");
  return undefined;
}

export async function appendAuditEvent(tx: TenantTransaction, context: OrganizationContext, input: AuditInput) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${context.organizationId}::text, 0::bigint))`;
  const previous = await readAuditChainTip(tx, context.organizationId);
  const metadata = safeAuditMetadata(input.metadata ?? {});
  const now = Date.now();
  const createdAt = new Date(previous ? Math.max(now, previous.createdAt.getTime() + 1) : now);
  const correlationId = input.correlationId ?? randomUUID();
  const integrityHash = createHash("sha256").update(JSON.stringify({ previousHash: previous?.integrityHash ?? null, organizationId: context.organizationId, actorUserId: context.userId, action: input.action, resourceType: input.resourceType, resourceId: input.resourceId ?? null, correlationId, outcomeCode: input.outcomeCode, metadata, createdAt: createdAt.toISOString() })).digest("hex");
  return tx.auditEvent.create({ data: { organizationId: context.organizationId, actorUserId: context.userId, action: input.action, resourceType: input.resourceType, resourceId: input.resourceId, correlationId, causationId: input.causationId, outcomeCode: input.outcomeCode, metadata: metadata as Prisma.InputJsonValue, previousHash: previous?.integrityHash, integrityHash, createdAt } });
}
