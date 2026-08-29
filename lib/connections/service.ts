import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { appendAuditEvent } from "../audit";
import { requireAal2, getAssuranceStatus } from "../auth/assurance";
import { hasPermission, type ConnectionPermission } from "../auth/permissions";
import { withTenantContext, type OrganizationContext } from "../auth/organization-context";
import { getProviderAdapter, parseProviderCredentialKind } from "./providers";
import type { ProviderResource } from "./providers";
import { redactSensitive } from "./redaction";
import { getSecretBroker } from "./secrets/supabase-vault";
import type { SecretBroker } from "./secrets/secret-broker";
import { connectionRequestInputSchema, connectionWorkspaceEnabled, providerAuthorizationEnabled, providerRequiresRoleConfirmation, readOnlyRoleConfirmationSchema, requestPatchSchema, type ConnectionProvider, type ConnectionState, type ConnectionRequestInput, type RequestState } from "./contracts";
import { createOAuthState, createPkcePair, expiresAt, hashOAuthState, safeReturnPath, OAuthError } from "./oauth";
import { assertConnectionArchivable, assertConnectionTransition, assertRequestTransition } from "./state-machine";
import { cancelConnectionOAuthTransactions, cleanupCredentialReferences, countPendingCredentialCleanup, destroyOAuthTransactionSecrets } from "./cleanup";
import { activeCredentialReferenceWhere, readScopedCredentialSecret } from "./credential-reference-scope";

export function requireConnectionPermission(context: OrganizationContext, permission: ConnectionPermission) {
  if (!hasPermission(context.permissions, permission)) throw new ConnectionServiceError("PERMISSION_DENIED", 403);
}

export async function listConnectionRequests(context: OrganizationContext) {
  requireConnectionPermission(context, "connections.view");
  return withTenantContext(context, (tx) => tx.connectionRequest.findMany({ where: { organizationId: context.organizationId }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, system: true, provider: true, product: true, knownIdentifiers: true, ownershipStatus: true, preferredMethod: true, state: true, notes: true, createdAt: true, updatedAt: true } }));
}

export async function createConnectionRequest(context: OrganizationContext, input: ConnectionRequestInput, correlationId: string) {
  requireConnectionPermission(context, "connections.inventory.manage");
  const parsed = connectionRequestInputSchema.parse(input);
  if (!connectionWorkspaceEnabled()) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
  return withTenantContext(context, async (tx) => {
    const request = await tx.connectionRequest.create({ data: { organizationId: context.organizationId, createdByUserId: context.userId, system: parsed.system, provider: parsed.provider, product: parsed.product, purpose: parsed.purpose, knownIdentifiers: parsed.knownIdentifiers as Prisma.InputJsonValue, ownershipStatus: parsed.ownershipStatus, preferredMethod: parsed.preferredMethod, state: "draft", notes: parsed.notes } });
    await appendAuditEvent(tx, context, { action: "connection_request.created", resourceType: "connection_request", resourceId: request.id, outcomeCode: "created", correlationId, metadata: { provider: request.provider, system: request.system } });
    return request;
  });
}

export async function updateConnectionRequest(context: OrganizationContext, id: string, input: Partial<ConnectionRequestInput> & { state?: RequestState }, correlationId: string) {
  requireConnectionPermission(context, "connections.inventory.manage");
  if (!connectionWorkspaceEnabled()) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
  return withTenantContext(context, async (tx) => {
    const current = await tx.connectionRequest.findFirst({ where: { id, organizationId: context.organizationId } });
    if (!current) throw new ConnectionServiceError("REQUEST_NOT_FOUND", 404);
    const nextState = input.state ?? current.state as RequestState;
    assertRequestTransition(current.state, nextState);
    const parsed = requestPatchSchema.parse(input);
    const request = await tx.connectionRequest.update({ where: { id: current.id }, data: { ...(parsed.system ? { system: parsed.system } : {}), ...(parsed.provider ? { provider: parsed.provider } : {}), ...(parsed.product !== undefined ? { product: parsed.product } : {}), ...(parsed.purpose ? { purpose: parsed.purpose } : {}), ...(parsed.knownIdentifiers ? { knownIdentifiers: parsed.knownIdentifiers as Prisma.InputJsonValue } : {}), ...(parsed.ownershipStatus ? { ownershipStatus: parsed.ownershipStatus } : {}), ...(parsed.preferredMethod ? { preferredMethod: parsed.preferredMethod } : {}), ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}), state: nextState, updatedByUserId: context.userId } });
    await appendAuditEvent(tx, context, { action: "connection_request.updated", resourceType: "connection_request", resourceId: id, outcomeCode: "updated", correlationId, metadata: { state: nextState } });
    return request;
  });
}

export async function submitConnectionRequest(context: OrganizationContext, id: string, correlationId: string) {
  return updateConnectionRequest(context, id, { state: "ready" }, correlationId);
}

export async function listConnections(context: OrganizationContext) {
  requireConnectionPermission(context, "connections.view");
  return withTenantContext(context, (tx) => tx.connection.findMany({
    where: { organizationId: context.organizationId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      provider: true,
      product: true,
      authorizationMethod: true,
      principal: true,
      status: true,
      accessMode: true,
      effectiveRole: true,
      grantedScopes: true,
      expiresAt: true,
      lastVerifiedAt: true,
      resources: { where: { archivedAt: null }, select: { id: true, resourceType: true, displayName: true, externalId: true, selected: true, eligibility: true } },
      healthChecks: { orderBy: { checkedAt: "desc" }, take: 1, select: { outcomeCode: true, remediationCode: true, checkedAt: true } },
    },
  }));
}

export async function getConnectionDetail(context: OrganizationContext, id: string) {
  requireConnectionPermission(context, "connections.view");
  return withTenantContext(context, async (tx) => {
    const connection = await tx.connection.findFirst({
      where: { id, organizationId: context.organizationId, archivedAt: null },
      select: {
        id: true,
        provider: true,
        product: true,
        authorizationMethod: true,
        principal: true,
        status: true,
        accessMode: true,
        credentialReferenceId: true,
        grantedScopes: true,
        effectiveRole: true,
        expiresAt: true,
        lastVerifiedAt: true,
        resources: { where: { archivedAt: null }, orderBy: { displayName: "asc" }, select: { id: true, resourceType: true, displayName: true, externalId: true, selected: true, eligibility: true, metadata: true } },
        healthChecks: { orderBy: { checkedAt: "desc" }, take: 20, select: { outcomeCode: true, remediationCode: true, checkedAt: true } },
        accessInvitations: { orderBy: { expiresAt: "asc" }, take: 20, select: { id: true, status: true, expectedPrincipal: true, verificationSource: true, sourceDate: true, expiresAt: true } },
        request: { select: { id: true, system: true, provider: true, state: true } },
      },
    });
    if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
    return {
      id: connection.id,
      provider: connection.provider,
      product: connection.product,
      authorizationMethod: connection.authorizationMethod,
      principal: connection.principal,
      status: connection.status,
      accessMode: connection.accessMode,
      credentialReferenceId: Boolean(connection.credentialReferenceId),
      grantedScopes: connection.grantedScopes,
      effectiveRole: connection.effectiveRole,
      expiresAt: connection.expiresAt?.toISOString() ?? null,
      lastVerifiedAt: connection.lastVerifiedAt?.toISOString() ?? null,
      resources: connection.resources.map((resource) => ({ id: resource.id, resourceType: resource.resourceType, displayName: resource.displayName, externalId: resource.externalId, selected: resource.selected, eligibility: resource.eligibility, metadata: redactSensitive(resource.metadata) })),
      healthChecks: connection.healthChecks.map((health) => ({ outcomeCode: health.outcomeCode, remediationCode: health.remediationCode, checkedAt: health.checkedAt.toISOString() })),
      accessInvitations: connection.accessInvitations.map((invitation) => ({ id: invitation.id, status: invitation.status, expectedPrincipal: invitation.expectedPrincipal, verificationSource: invitation.verificationSource, sourceDate: invitation.sourceDate?.toISOString() ?? null, expiresAt: invitation.expiresAt?.toISOString() ?? null })),
      request: connection.request,
    };
  });
}

export async function selectConnectionResources(context: OrganizationContext, id: string, resourceIds: string[], correlationId: string) {
  requireConnectionPermission(context, "connections.resources.select");
  return withTenantContext(context, async (tx) => {
    const connection = await tx.connection.findFirst({ where: { id, organizationId: context.organizationId, archivedAt: null }, select: { id: true, status: true } });
    if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
    const resources = await tx.connectionResource.findMany({ where: { connectionId: id, organizationId: context.organizationId, archivedAt: null }, select: { id: true, eligibility: true } });
    if (resourceIds.some((resourceId) => !resources.some((resource) => resource.id === resourceId))) throw new ConnectionServiceError("RESOURCE_NOT_FOUND", 404);
    if (resourceIds.some((resourceId) => resources.find((resource) => resource.id === resourceId)?.eligibility !== "eligible")) throw new ConnectionServiceError("RESOURCE_NOT_ELIGIBLE", 409);
    await tx.connectionResource.updateMany({ where: { connectionId: id, organizationId: context.organizationId, archivedAt: null }, data: { selected: false } });
    if (resourceIds.length) await tx.connectionResource.updateMany({ where: { connectionId: id, organizationId: context.organizationId, id: { in: resourceIds } }, data: { selected: true } });
    const nextState: ConnectionState = resourceIds.length ? "verifying" : "degraded";
    assertConnectionTransition(connection.status, nextState);
    await tx.connection.update({ where: { id }, data: { status: nextState } });
    await appendAuditEvent(tx, context, { action: "connection.resources.selected", resourceType: "connection", resourceId: id, outcomeCode: "updated", correlationId, metadata: { selectedCount: resourceIds.length } });
    return { selectedCount: resourceIds.length, state: nextState };
  });
}

export async function verifyConnection(context: OrganizationContext, id: string, correlationId: string, broker: SecretBroker = getSecretBroker()) {
  requireConnectionPermission(context, "connections.verify");
  const assurance = await getAssuranceStatus(context);
  requireAal2(assurance);
  const connection = await withTenantContext(context, (tx) => tx.connection.findFirst({ where: { id, organizationId: context.organizationId, archivedAt: null }, include: { resources: { where: { archivedAt: null, selected: true } }, } }));
  if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
  if (!providerAuthorizationEnabled(connection.provider as ConnectionProvider, context.organizationId)) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
  if (await countPendingCredentialCleanup(context, id)) throw new ConnectionServiceError("SECRET_CLEANUP_PENDING", 503);
  const reference = connection.credentialReferenceId ? await withTenantContext(context, (tx) => tx.credentialReference.findFirst({ where: activeCredentialReferenceWhere(context.organizationId, id, connection.credentialReferenceId as string) })) : null;
  const secret = await readScopedCredentialSecret(connection.credentialReferenceId, reference, broker);
  if (!secret && connection.authorizationMethod === "oauth") throw new ConnectionServiceError("SECRET_UNAVAILABLE", 503);
  const provider = connection.provider as ConnectionProvider;
  const adapter = getProviderAdapter(provider);
  const adapterResult = await adapter.verify(secret ?? "manual-inventory", connection.resources as ProviderResource[], parseProviderCredentialKind(reference?.credentialKind));
  const roleConfirmed = reference && providerRequiresRoleConfirmation(provider)
    ? await withTenantContext(context, (tx) => tx.capabilitySnapshot.count({ where: { organizationId: context.organizationId, connectionId: id, connectorVersion: adapter.version, capabilityKey: "read_only_role", supportLevel: "confirmed", evidenceAt: { gte: reference.createdAt }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } })).then((count) => count > 0)
    : !providerRequiresRoleConfirmation(provider);
  const result = adapterResult.outcomeCode === "verified" && !roleConfirmed
    ? { ...adapterResult, outcomeCode: "missing_role" as const, remediationCode: `confirm_${provider}_read_only_role`, effectiveRole: undefined }
    : adapterResult.outcomeCode === "verified" && roleConfirmed
      ? { ...adapterResult, effectiveRole: providerRequiresRoleConfirmation(provider) ? "read_only" : adapterResult.effectiveRole }
      : adapterResult;
  return withTenantContext(context, async (tx) => {
    const nextState: ConnectionState = result.outcomeCode === "verified" ? "active_read_only" : result.outcomeCode === "invalid_grant" ? "expired" : "degraded";
    assertConnectionTransition(connection.status, nextState);
    await tx.connection.update({ where: { id }, data: { status: nextState, ...(result.outcomeCode === "verified" ? { lastVerifiedAt: new Date() } : {}), ...(result.effectiveRole ? { effectiveRole: result.effectiveRole } : {}), ...(result.grantedScopes ? { grantedScopes: result.grantedScopes } : {}) } });
    await tx.connectionHealthCheck.create({ data: { organizationId: context.organizationId, connectionId: id, checkKind: "read_only", outcomeCode: result.outcomeCode, latencyMs: result.latencyMs, remediationCode: result.remediationCode } });
    await appendAuditEvent(tx, context, { action: "connection.verified", resourceType: "connection", resourceId: id, outcomeCode: result.outcomeCode, correlationId, metadata: { provider: connection.provider, state: nextState, remediationCode: result.remediationCode, latencyMs: result.latencyMs } });
    return { state: nextState, outcomeCode: result.outcomeCode, remediationCode: result.remediationCode };
  });
}

export async function confirmConnectionReadOnlyRole(context: OrganizationContext, id: string, input: unknown, correlationId: string) {
  requireConnectionPermission(context, "connections.verify");
  requireAal2(await getAssuranceStatus(context));
  const parsed = readOnlyRoleConfirmationSchema.parse(input);
  return withTenantContext(context, async (tx) => {
    const connection = await tx.connection.findFirst({ where: { id, organizationId: context.organizationId, archivedAt: null }, select: { id: true, provider: true, status: true, credentialReferenceId: true } });
    if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
    const provider = connection.provider as ConnectionProvider;
    if (!providerRequiresRoleConfirmation(provider)) throw new ConnectionServiceError("ROLE_CONFIRMATION_NOT_REQUIRED", 409);
    if (!providerAuthorizationEnabled(provider, context.organizationId)) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
    if (["pending", "authorizing", "expired", "revoked", "archived"].includes(connection.status)) throw new ConnectionServiceError("CONNECTION_STATE_INVALID", 409);
    if (!connection.credentialReferenceId) throw new ConnectionServiceError("SECRET_UNAVAILABLE", 503);
    const reference = await tx.credentialReference.findFirst({ where: activeCredentialReferenceWhere(context.organizationId, id, connection.credentialReferenceId), select: { createdAt: true } });
    if (!reference) throw new ConnectionServiceError("SECRET_CLEANUP_PENDING", 503);
    const adapter = getProviderAdapter(provider);
    const evidenceAt = new Date();
    const snapshot = await tx.capabilitySnapshot.create({ data: { organizationId: context.organizationId, connectionId: id, connectorVersion: adapter.version, capabilityKey: "read_only_role", supportLevel: "confirmed", evidenceSource: parsed.evidenceSource, sourceDate: parsed.sourceDate, evidenceAt, expiresAt: new Date(evidenceAt.getTime() + 90 * 24 * 60 * 60 * 1000) } });
    await tx.connection.update({ where: { id }, data: { effectiveRole: "read_only_evidence_recorded" } });
    await appendAuditEvent(tx, context, { action: "connection.read_only_role_confirmed", resourceType: "connection", resourceId: id, outcomeCode: "evidence_recorded", correlationId, metadata: { provider, evidenceSource: parsed.evidenceSource, sourceDate: parsed.sourceDate.toISOString(), connectorVersion: adapter.version } });
    return { id: snapshot.id, evidenceAt: evidenceAt.toISOString(), expiresAt: snapshot.expiresAt?.toISOString() ?? null };
  });
}

export async function revokeConnection(context: OrganizationContext, id: string, correlationId: string, broker: SecretBroker = getSecretBroker()) {
  requireConnectionPermission(context, "connections.revoke");
  const assurance = await getAssuranceStatus(context);
  requireAal2(assurance);
  const connection = await withTenantContext(context, async (tx) => {
    const current = await tx.connection.findFirst({ where: { id, organizationId: context.organizationId, archivedAt: null }, select: { id: true, status: true, provider: true, credentialReferenceId: true } });
    if (!current) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
    if (current.status !== "revoked") assertConnectionTransition(current.status, "revoked");
    await tx.connection.update({ where: { id }, data: { status: "revoked", archivedAt: null } });
    await appendAuditEvent(tx, context, { action: current.status === "revoked" ? "connection.revoke_retried" : "connection.revoked", resourceType: "connection", resourceId: id, outcomeCode: "revoked", correlationId, metadata: { provider: current.provider } });
    return current;
  });

  const transactionCleanup = await cancelConnectionOAuthTransactions(context, id, broker);
  const credentialCleanup = await cleanupCredentialReferences({
    context,
    connectionId: id,
    currentReferenceId: connection.credentialReferenceId,
    provider: connection.provider as ConnectionProvider,
    broker,
    revokeCurrentProviderGrant: true,
  });
  if (transactionCleanup.pending || credentialCleanup.pending) {
    await withTenantContext(context, (tx) => appendAuditEvent(tx, context, { action: "connection.revoke_cleanup_pending", resourceType: "connection", resourceId: id, outcomeCode: transactionCleanup.pending ? "oauth_cleanup_pending" : "secret_cleanup_pending", correlationId, metadata: { provider: connection.provider } })).catch(() => undefined);
    throw new ConnectionServiceError("SECRET_REVOKE_CLEANUP_PENDING", 503);
  }
  await withTenantContext(context, (tx) => appendAuditEvent(tx, context, {
    action: "connection.revoke_cleanup_completed",
    resourceType: "connection",
    resourceId: id,
    outcomeCode: credentialCleanup.providerRevocationUnverified ? "provider_revocation_unverified" : "cleanup_complete",
    correlationId,
    metadata: { provider: connection.provider, credentialCount: credentialCleanup.cleaned, oauthTransactionCount: transactionCleanup.cleaned },
  }));
  return { state: "revoked" as const, cleanup: "complete" as const };
}

export async function archiveConnection(context: OrganizationContext, id: string, correlationId: string) {
  requireConnectionPermission(context, "connections.revoke");
  const assurance = await getAssuranceStatus(context);
  requireAal2(assurance);
  return withTenantContext(context, async (tx) => {
    const connection = await tx.connection.findFirst({ where: { id, organizationId: context.organizationId, archivedAt: null }, select: { id: true, status: true, provider: true } });
    if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
    const credentialCleanupPending = await tx.credentialReference.count({ where: { organizationId: context.organizationId, connectionId: id, cleanupStatus: { not: "destroyed" } } });
    const transactionCleanupPending = await tx.oAuthTransaction.count({ where: { organizationId: context.organizationId, connectionId: id, pkceSecretReference: { not: null } } });
    assertConnectionArchivable(connection.status, credentialCleanupPending + transactionCleanupPending > 0);
    await tx.connection.update({ where: { id }, data: { status: "archived", archivedAt: new Date() } });
    await appendAuditEvent(tx, context, { action: "connection.archived", resourceType: "connection", resourceId: id, outcomeCode: "archived", correlationId, metadata: { provider: connection.provider } });
    return { state: "archived" as const };
  });
}

async function expireOAuthTransactions(context: OrganizationContext, broker: SecretBroker) {
  const now = new Date();
  const expired = await withTenantContext(context, (tx) => tx.oAuthTransaction.findMany({ where: { organizationId: context.organizationId, status: "issued", expiresAt: { lte: now } }, select: { id: true, pkceSecretReference: true, provider: true, connectionId: true } }));
  if (!expired.length) return;
  await withTenantContext(context, async (tx) => {
    await tx.oAuthTransaction.updateMany({ where: { organizationId: context.organizationId, id: { in: expired.map((transaction) => transaction.id) }, status: "issued" }, data: { status: "expired" } });
    for (const transaction of expired) await appendAuditEvent(tx, context, { action: "connection.authorization_expired", resourceType: "oauth_transaction", resourceId: transaction.id, outcomeCode: "expired", metadata: { provider: transaction.provider, connectionId: transaction.connectionId } });
  });
  const cleanup = await destroyOAuthTransactionSecrets(context, expired, broker);
  if (cleanup.pending) {
    await withTenantContext(context, (tx) => appendAuditEvent(tx, context, { action: "connection.authorization_cleanup_pending", resourceType: "oauth_transaction", outcomeCode: "pkce_cleanup_pending", metadata: { transactionCount: cleanup.pending } })).catch(() => undefined);
  }
}

export async function startOAuth(context: OrganizationContext, input: { provider: ConnectionProvider; operation: "authorize" | "reconnect"; requestId?: string; connectionId?: string; returnPath?: string; redirectUri: string; correlationId: string }, broker: SecretBroker = getSecretBroker()) {
  requireConnectionPermission(context, "connections.authorize");
  const assurance = await getAssuranceStatus(context);
  requireAal2(assurance);
  if (!providerAuthorizationEnabled(input.provider, context.organizationId)) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
  const adapter = getProviderAdapter(input.provider);
  await expireOAuthTransactions(context, broker);
  const state = createOAuthState();
  const pkce = createPkcePair();
  const authorizationUrl = adapter.buildAuthorizationUrl({ state, codeChallenge: pkce.challenge, redirectUri: input.redirectUri });
  const pkceSecret = await broker.put({ value: pkce.verifier, kind: "pkce_verifier" });
  const transactionId = randomUUID();
  const browserTransactionId = randomUUID();
  const returnPath = safeReturnPath(input.returnPath);
  try {
    const setup = await withTenantContext(context, async (tx) => {
      let connection = input.connectionId ? await tx.connection.findFirst({ where: { id: input.connectionId, organizationId: context.organizationId, archivedAt: null } }) : null;
      if (!connection && input.requestId) {
        const request = await tx.connectionRequest.findFirst({ where: { id: input.requestId, organizationId: context.organizationId, state: { not: "archived" } } });
        if (!request) throw new ConnectionServiceError("REQUEST_NOT_FOUND", 404);
        connection = await tx.connection.create({ data: { organizationId: context.organizationId, requestId: request.id, createdByUserId: context.userId, provider: request.provider, product: request.product, authorizationMethod: "oauth", accessMode: "read_only", grantedScopes: [] } });
      }
      if (!connection) connection = await tx.connection.create({ data: { organizationId: context.organizationId, createdByUserId: context.userId, provider: input.provider, authorizationMethod: "oauth", accessMode: "read_only", grantedScopes: [] } });
      if (connection.provider !== input.provider) throw new OAuthError("OAUTH_PROVIDER_MISMATCH");
      if (connection.status !== "authorizing") assertConnectionTransition(connection.status, "authorizing");
      const replacedTransactions = await tx.oAuthTransaction.findMany({ where: { organizationId: context.organizationId, connectionId: connection.id, status: "issued" }, select: { id: true, pkceSecretReference: true } });
      if (replacedTransactions.length) await tx.oAuthTransaction.updateMany({ where: { organizationId: context.organizationId, id: { in: replacedTransactions.map((transaction) => transaction.id) }, status: "issued" }, data: { status: "canceled" } });
      await tx.connection.update({ where: { id: connection.id }, data: { status: "authorizing" } });
      await tx.oAuthTransaction.create({ data: { id: transactionId, organizationId: context.organizationId, userId: context.userId, connectionId: connection.id, provider: input.provider, stateHash: hashOAuthState(state), pkceSecretReference: pkceSecret.handle, returnPath, browserTransactionId, expiresAt: expiresAt(), status: "issued" } });
      await appendAuditEvent(tx, context, { action: input.operation === "reconnect" ? "connection.reconnect_started" : "connection.authorization_started", resourceType: "connection", resourceId: connection.id, outcomeCode: "started", correlationId: input.correlationId, metadata: { provider: input.provider, adapterVersion: adapter.version, operation: input.operation } });
      return { connectionId: connection.id, replacedTransactions };
    });
    const priorCleanup = await destroyOAuthTransactionSecrets(context, setup.replacedTransactions, broker);
    if (priorCleanup.pending) await withTenantContext(context, (tx) => appendAuditEvent(tx, context, { action: "connection.authorization_cleanup_pending", resourceType: "connection", resourceId: setup.connectionId, outcomeCode: "pkce_cleanup_pending", correlationId: input.correlationId, metadata: { provider: input.provider, transactionCount: priorCleanup.pending } })).catch(() => undefined);
    return { transactionId, connectionId: setup.connectionId, browserTransactionId, authorizationUrl };
  } catch (error) {
    await broker.destroy(pkceSecret.handle).catch(() => undefined);
    throw error;
  }
}

export async function completeOAuth(context: OrganizationContext, input: { provider: ConnectionProvider; state: string; code: string; browserTransactionId: string; correlationId: string }, broker: SecretBroker = getSecretBroker()) {
  requireConnectionPermission(context, "connections.authorize");
  requireAal2(await getAssuranceStatus(context));
  if (!providerAuthorizationEnabled(input.provider, context.organizationId)) throw new ConnectionServiceError("CONNECTIONS_DISABLED", 503);
  await expireOAuthTransactions(context, broker);
  const stateHash = hashOAuthState(input.state);
  const transaction = await withTenantContext(context, async (tx) => {
    const current = await tx.oAuthTransaction.findFirst({ where: { stateHash, provider: input.provider, organizationId: context.organizationId, userId: context.userId, browserTransactionId: input.browserTransactionId, status: "issued", expiresAt: { gt: new Date() } } });
    if (!current) throw new OAuthError("OAUTH_STATE_INVALID");
    const connection = current.connectionId ? await tx.connection.findFirst({ where: { id: current.connectionId, organizationId: context.organizationId, archivedAt: null }, select: { status: true, provider: true } }) : null;
    if (!connection || connection.provider !== input.provider || connection.status !== "authorizing") {
      await tx.oAuthTransaction.updateMany({ where: { id: current.id, status: "issued" }, data: { status: "canceled" } });
      return { ...current, connectionStateValid: false };
    }
    const consumed = await tx.oAuthTransaction.updateMany({ where: { id: current.id, status: "issued", expiresAt: { gt: new Date() } }, data: { status: "consumed", consumedAt: new Date() } });
    if (consumed.count !== 1) throw new OAuthError("OAUTH_STATE_REPLAYED");
    return { ...current, connectionStateValid: true };
  });
  const connectionId = transaction.connectionId;
  if (!connectionId) throw new OAuthError("OAUTH_CONNECTION_INVALID");
  const verifier = transaction.pkceSecretReference ? await broker.read(transaction.pkceSecretReference) : null;
  const verifierCleanup = await destroyOAuthTransactionSecrets(context, [transaction], broker);
  if (!transaction.connectionStateValid) throw new OAuthError("OAUTH_CONNECTION_STATE_INVALID");
  if (verifierCleanup.pending) {
    await recordOAuthFailure(context, connectionId, input.provider, input.correlationId, "pkce_cleanup_pending");
    throw new ConnectionServiceError("OAUTH_VERIFIER_CLEANUP_PENDING", 503);
  }
  if (!verifier) {
    await recordOAuthFailure(context, connectionId, input.provider, input.correlationId, "verifier_unavailable");
    throw new OAuthError("OAUTH_VERIFIER_UNAVAILABLE");
  }
  const adapter = getProviderAdapter(input.provider);
  let stored: Awaited<ReturnType<SecretBroker["put"]>> | undefined;
  try {
    const exchanged = await adapter.exchangeCode(input.code, verifier);
    const resources = await adapter.discoverResources(exchanged.secret, exchanged.secretKind);
    stored = await broker.put({ value: exchanged.secret, kind: exchanged.secretKind, expiresAt: exchanged.expiresAt });
    const storedSecret = stored;
    const completed = await withTenantContext(context, async (tx) => {
      const connection = await tx.connection.findFirst({ where: { id: connectionId, organizationId: context.organizationId, archivedAt: null } });
      if (!connection) throw new ConnectionServiceError("CONNECTION_NOT_FOUND", 404);
      if (connection.status !== "authorizing") throw new OAuthError("OAUTH_CONNECTION_STATE_INVALID");
      const nextState: ConnectionState = resources.length ? "discovering" : "degraded";
      assertConnectionTransition(connection.status, nextState);
      const previousReferenceId = connection.credentialReferenceId;
      const reference = await tx.credentialReference.create({ data: { organizationId: context.organizationId, connectionId: connection.id, brokerHandle: storedSecret.handle, backend: broker.backend, credentialKind: exchanged.secretKind, keyVersion: broker.keyVersion, cleanupStatus: "active", expiresAt: exchanged.expiresAt, fingerprint: storedSecret.fingerprint } });
      if (previousReferenceId) await tx.credentialReference.updateMany({ where: { id: previousReferenceId, organizationId: context.organizationId, connectionId: connection.id, cleanupStatus: { not: "destroyed" } }, data: { cleanupStatus: "cleanup_pending", cleanupLeaseExpiresAt: null } });
      const updated = await tx.connection.updateMany({ where: { id: connection.id, organizationId: context.organizationId, status: "authorizing", archivedAt: null }, data: { credentialReferenceId: reference.id, status: nextState, grantedScopes: exchanged.grantedScopes, principal: exchanged.principal, effectiveRole: exchanged.effectiveRole, expiresAt: exchanged.expiresAt } });
      if (updated.count !== 1) throw new OAuthError("OAUTH_CONNECTION_STATE_INVALID");
      for (const resource of resources) await tx.connectionResource.upsert({ where: { organizationId_connectionId_resourceType_externalId: { organizationId: context.organizationId, connectionId: connection.id, resourceType: resource.resourceType, externalId: resource.externalId } }, create: { organizationId: context.organizationId, connectionId: connection.id, resourceType: resource.resourceType, externalId: resource.externalId, displayName: resource.displayName, metadata: resource.metadata as Prisma.InputJsonValue | undefined, eligibility: resource.eligibility }, update: { displayName: resource.displayName, metadata: resource.metadata as Prisma.InputJsonValue | undefined, eligibility: resource.eligibility, archivedAt: null } });
      await appendAuditEvent(tx, context, { action: "connection.authorization_completed", resourceType: "connection", resourceId: connection.id, outcomeCode: "discovered", correlationId: input.correlationId, metadata: { provider: input.provider, resourceCount: resources.length } });
      return { connectionId: connection.id, state: nextState, resourceCount: resources.length, returnPath: transaction.returnPath, previousReferenceId, referenceId: reference.id };
    });
    stored = undefined;
    if (completed.previousReferenceId) {
      const cleanup = await cleanupCredentialReferences({ context, connectionId, currentReferenceId: completed.referenceId, provider: input.provider, broker, revokeCurrentProviderGrant: false, referenceIds: [completed.previousReferenceId] });
      if (cleanup.pending) {
        await withTenantContext(context, async (tx) => {
          await tx.connection.updateMany({ where: { id: connectionId, organizationId: context.organizationId, status: completed.state }, data: { status: "degraded" } });
          await tx.connectionHealthCheck.create({ data: { organizationId: context.organizationId, connectionId, checkKind: "credential_cleanup", outcomeCode: "cleanup_pending", remediationCode: "revoke_or_retry_cleanup" } });
          await appendAuditEvent(tx, context, { action: "connection.reconnect_cleanup_pending", resourceType: "connection", resourceId: connectionId, outcomeCode: "previous_secret_cleanup_pending", correlationId: input.correlationId, metadata: { provider: input.provider } });
        });
        return { connectionId, state: "degraded" as const, resourceCount: completed.resourceCount, returnPath: completed.returnPath };
      }
    }
    return { connectionId, state: completed.state, resourceCount: completed.resourceCount, returnPath: completed.returnPath };
  } catch (error) {
    if (stored) await broker.destroy(stored.handle).catch(() => undefined);
    await recordOAuthFailure(context, connectionId, input.provider, input.correlationId, safeFailureCode(error));
    throw error;
  }
}

async function recordOAuthFailure(context: OrganizationContext, connectionId: string, provider: ConnectionProvider, correlationId: string, outcomeCode: string) {
  await withTenantContext(context, async (tx) => {
    const connection = await tx.connection.findFirst({ where: { id: connectionId, organizationId: context.organizationId, archivedAt: null }, select: { status: true } });
    if (connection?.status === "authorizing") await tx.connection.update({ where: { id: connectionId }, data: { status: "degraded" } });
    await appendAuditEvent(tx, context, { action: "connection.authorization_failed", resourceType: "connection", resourceId: connectionId, outcomeCode, correlationId, metadata: { provider } });
  }).catch(() => undefined);
}

function safeFailureCode(error: unknown) {
  if (error instanceof Error && "code" in error && typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code)) return error.code.toLowerCase();
  return "authorization_failed";
}

export class ConnectionServiceError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "ConnectionServiceError";
    this.code = code;
    this.status = status;
  }
}
