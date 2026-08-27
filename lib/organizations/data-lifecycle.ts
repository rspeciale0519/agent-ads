import { appendAuditEvent } from "../audit";
import { getAssuranceStatus, requireAal2 } from "../auth/assurance";
import { withTenantContext, withTenantExclusiveContext, type OrganizationContext } from "../auth/organization-context";
import { hasPermission } from "../auth/permissions";
import { redactSensitive } from "../connections/redaction";
import { archiveConnection, revokeConnection } from "../connections/service";

const MAX_SYNCHRONOUS_CONNECTIONS = 20;
const EXPORT_LIMITS = {
  connectionRequests: 5_000,
  connections: 5_000,
  organizationInvitations: 5_000,
  auditEvents: 10_000,
} as const;

export async function exportOrganizationConnectionData(context: OrganizationContext, correlationId: string) {
  assertDataLifecyclePermission(context, false);
  requireAal2(await getAssuranceStatus(context));
  const exportedAt = new Date();
  const payload = await withTenantContext(context, async (tx) => {
    const organization = await tx.organization.findFirst({ where: { id: context.organizationId }, select: { id: true, name: true, slug: true, status: true, locale: true, timeZone: true, retentionDays: true, createdAt: true, updatedAt: true } });
    if (!organization) throw new DataLifecycleError("ORGANIZATION_NOT_FOUND", 404);
    const [requests, connections, invitations, auditEvents] = await Promise.all([
      tx.connectionRequest.findMany({ where: { organizationId: context.organizationId }, orderBy: { createdAt: "asc" }, take: EXPORT_LIMITS.connectionRequests + 1, select: { id: true, system: true, provider: true, product: true, purpose: true, knownIdentifiers: true, ownershipStatus: true, preferredMethod: true, state: true, notes: true, createdAt: true, updatedAt: true } }),
      tx.connection.findMany({ where: { organizationId: context.organizationId }, orderBy: { createdAt: "asc" }, take: EXPORT_LIMITS.connections + 1, select: { id: true, requestId: true, provider: true, product: true, purpose: true, authorizationMethod: true, principal: true, status: true, accessMode: true, grantedScopes: true, effectiveRole: true, expiresAt: true, lastVerifiedAt: true, archivedAt: true, createdAt: true, updatedAt: true, resources: { select: { id: true, resourceType: true, displayName: true, externalId: true, selected: true, eligibility: true, archivedAt: true, createdAt: true, updatedAt: true } }, healthChecks: { select: { checkKind: true, outcomeCode: true, checkedAt: true, remediationCode: true } }, capabilitySnapshots: { select: { connectorVersion: true, capabilityKey: true, supportLevel: true, limitation: true, evidenceSource: true, sourceDate: true, evidenceAt: true, expiresAt: true } }, accessInvitations: { select: { id: true, provider: true, expectedPrincipal: true, externalAccountId: true, status: true, sentAt: true, acceptedAt: true, verifiedAt: true, expiresAt: true, revokedAt: true, verificationSource: true, sourceDate: true } } } }),
      tx.organizationInvitation.findMany({ where: { organizationId: context.organizationId }, orderBy: { createdAt: "asc" }, take: EXPORT_LIMITS.organizationInvitations + 1, select: { id: true, recipientEmail: true, role: true, permissions: true, status: true, expiresAt: true, acceptedAt: true, revokedAt: true, createdAt: true } }),
      tx.auditEvent.findMany({ where: { organizationId: context.organizationId }, orderBy: { createdAt: "asc" }, take: EXPORT_LIMITS.auditEvents + 1, select: { id: true, action: true, resourceType: true, resourceId: true, correlationId: true, causationId: true, outcomeCode: true, metadata: true, createdAt: true } }),
    ]);
    assertExportWithinLimits({ connectionRequests: requests.length, connections: connections.length, organizationInvitations: invitations.length, auditEvents: auditEvents.length });
    await appendAuditEvent(tx, context, { action: "organization.connection_data_exported", resourceType: "organization", resourceId: context.organizationId, outcomeCode: "exported", correlationId, metadata: { requestCount: requests.length, connectionCount: connections.length, invitationCount: invitations.length, auditEventCount: auditEvents.length } });
    return {
      version: "account-connections-export-v1",
      exportedAt: exportedAt.toISOString(),
      organization,
      connectionRequests: requests.map((request) => ({ ...request, knownIdentifiers: redactSensitive(request.knownIdentifiers) })),
      connections,
      organizationInvitations: invitations,
      auditEvents: auditEvents.map((event) => ({ ...event, metadata: redactSensitive(event.metadata) })),
      exclusions: ["credential references", "broker handles", "provider secrets", "OAuth transactions", "PKCE material", "session and step-up records", "raw provider responses"],
    };
  });
  return payload;
}

export async function offboardOrganization(context: OrganizationContext, confirmation: string, correlationId: string) {
  assertDataLifecyclePermission(context, true);
  requireAal2(await getAssuranceStatus(context));
  if (!isOffboardingConfirmationValid(context.organizationName, confirmation)) throw new DataLifecycleError("OFFBOARDING_CONFIRMATION_INVALID", 400);
  const candidates = await withTenantContext(context, (tx) => tx.connection.findMany({ where: { organizationId: context.organizationId, archivedAt: null }, orderBy: { createdAt: "asc" }, take: MAX_SYNCHRONOUS_CONNECTIONS, select: { id: true } }));
  const connections = takeOffboardingBatch(candidates);

  for (const connection of connections) await revokeConnection(context, connection.id, correlationId);
  for (const connection of connections) await archiveConnection(context, connection.id, correlationId);

  return withTenantExclusiveContext(context, async (tx) => {
    const remainingConnectionCount = await tx.connection.count({ where: { organizationId: context.organizationId, archivedAt: null } });
    if (remainingConnectionCount > 0) {
      await appendAuditEvent(tx, context, { action: "organization.offboarding_batch_completed", resourceType: "organization", resourceId: context.organizationId, outcomeCode: "connections_remaining", correlationId, metadata: { connectionCount: connections.length, remainingConnectionCount } });
      return { status: "offboarding_in_progress" as const, connectionCount: connections.length, remainingConnectionCount };
    }
    const now = new Date();
    const pendingInvitations = await tx.organizationInvitation.updateMany({ where: { organizationId: context.organizationId, status: "pending" }, data: { status: "revoked", revokedAt: now } });
    const accessInvitations = await tx.accessInvitation.updateMany({ where: { organizationId: context.organizationId, status: { notIn: ["revoked", "expired"] } }, data: { status: "revoked", revokedAt: now } });
    const requests = await tx.connectionRequest.updateMany({ where: { organizationId: context.organizationId, state: { not: "archived" } }, data: { state: "archived", updatedByUserId: context.userId } });
    await tx.stepUpGrant.updateMany({ where: { organizationId: context.organizationId, revokedAt: null }, data: { revokedAt: now } });
    await tx.membership.updateMany({ where: { organizationId: context.organizationId, status: "active" }, data: { status: "inactive" } });
    await tx.organization.update({ where: { id: context.organizationId }, data: { status: "inactive" } });
    await appendAuditEvent(tx, context, { action: "organization.offboarded", resourceType: "organization", resourceId: context.organizationId, outcomeCode: "offboarded", correlationId, metadata: { connectionCount: connections.length, requestCount: requests.count, organizationInvitationCount: pendingInvitations.count, accessInvitationCount: accessInvitations.count, downstreamScheduleStatus: "not_applicable" } });
    return { status: "offboarded" as const, connectionCount: connections.length, requestCount: requests.count };
  });
}

export function assertExportWithinLimits(counts: Record<keyof typeof EXPORT_LIMITS, number>) {
  const exceeded = Object.entries(EXPORT_LIMITS).find(([key, limit]) => counts[key as keyof typeof EXPORT_LIMITS] > limit);
  if (exceeded) throw new DataLifecycleError("EXPORT_SIZE_LIMIT_EXCEEDED", 413);
}

export function assertDataLifecyclePermission(context: OrganizationContext, ownerOnly: boolean) {
  if (!hasPermission(context.permissions, "membership.manage")) throw new DataLifecycleError("PERMISSION_DENIED", 403);
  if (ownerOnly && context.role !== "owner") throw new DataLifecycleError("OWNER_REQUIRED", 403);
  if (!ownerOnly && context.role !== "owner" && context.role !== "administrator") throw new DataLifecycleError("PERMISSION_DENIED", 403);
}

export function isOffboardingConfirmationValid(organizationName: string, confirmation: string) {
  return confirmation === `OFFBOARD ${organizationName}`;
}

export function takeOffboardingBatch<T>(connections: readonly T[]) {
  return connections.slice(0, MAX_SYNCHRONOUS_CONNECTIONS);
}

export class DataLifecycleError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.name = "DataLifecycleError";
    this.code = code;
    this.status = status;
  }
}
