import type { CredentialReference } from "@prisma/client";
import type { OrganizationContext } from "../auth/organization-context";
import { withTenantContext } from "../auth/organization-context";
import type { ConnectionProvider } from "./contracts";
import { getProviderAdapter, parseProviderCredentialKind } from "./providers";
import { withRefreshLock } from "./refresh-lock";
import type { SecretBroker } from "./secrets/secret-broker";

const CLEANUP_LEASE_MS = 60_000;

type OAuthSecretReference = {
  id: string;
  pkceSecretReference: string | null;
};

export type CredentialCleanupResult = {
  cleaned: number;
  pending: number;
  providerRevocationUnverified: boolean;
};

export async function cancelConnectionOAuthTransactions(
  context: OrganizationContext,
  connectionId: string,
  broker: SecretBroker,
) {
  const transactions = await withTenantContext(context, async (tx) => {
    await tx.oAuthTransaction.updateMany({
      where: { organizationId: context.organizationId, connectionId, status: "issued" },
      data: { status: "canceled" },
    });
    return tx.oAuthTransaction.findMany({
      where: {
        organizationId: context.organizationId,
        connectionId,
        pkceSecretReference: { not: null },
      },
      select: { id: true, pkceSecretReference: true },
    });
  });
  return destroyOAuthTransactionSecrets(context, transactions, broker);
}

export async function destroyOAuthTransactionSecrets(
  context: OrganizationContext,
  transactions: OAuthSecretReference[],
  broker: SecretBroker,
) {
  let cleaned = 0;
  let pending = 0;
  for (const transaction of transactions) {
    const handle = transaction.pkceSecretReference;
    if (!handle) continue;
    try {
      await broker.destroy(handle);
      await withTenantContext(context, (tx) => tx.oAuthTransaction.updateMany({
        where: {
          id: transaction.id,
          organizationId: context.organizationId,
          pkceSecretReference: handle,
        },
        data: { pkceSecretReference: null },
      }));
      cleaned += 1;
    } catch {
      pending += 1;
    }
  }
  return { cleaned, pending };
}

export async function cleanupCredentialReferences(input: {
  context: OrganizationContext;
  connectionId: string;
  currentReferenceId: string | null;
  provider: ConnectionProvider;
  broker: SecretBroker;
  revokeCurrentProviderGrant: boolean;
  referenceIds?: string[];
}): Promise<CredentialCleanupResult> {
  const references = await claimCredentialReferences(input.context, input.connectionId, input.referenceIds);
  let cleaned = 0;
  let pending = 0;
  let providerRevocationUnverified = false;

  for (const reference of references) {
    try {
      const secret = await input.broker.read(reference.brokerHandle);
      const revokeProvider = input.revokeCurrentProviderGrant && reference.id === input.currentReferenceId;
      if (secret) {
        await withRefreshLock(secret, async () => {
          if (revokeProvider) {
            const credentialKind = parseProviderCredentialKind(reference.credentialKind);
            await getProviderAdapter(input.provider).revoke(secret, credentialKind);
          }
          await input.broker.destroy(reference.brokerHandle);
        });
      } else {
        if (revokeProvider) providerRevocationUnverified = true;
        await input.broker.destroy(reference.brokerHandle);
      }
      await completeCredentialCleanup(input.context, reference.id);
      cleaned += 1;
    } catch {
      await releaseCredentialCleanup(input.context, reference.id);
      pending += 1;
    }
  }

  const outstanding = await countOutstandingCredentialCleanup(input.context, input.connectionId, input.referenceIds);
  return { cleaned, pending: Math.max(pending, outstanding), providerRevocationUnverified };
}

export async function countOutstandingCredentialCleanup(context: OrganizationContext, connectionId: string, referenceIds?: string[]) {
  return withTenantContext(context, (tx) => tx.credentialReference.count({
    where: {
      organizationId: context.organizationId,
      connectionId,
      cleanupStatus: { not: "destroyed" },
      ...(referenceIds ? { id: { in: referenceIds } } : {}),
    },
  }));
}

export async function countPendingCredentialCleanup(context: OrganizationContext, connectionId: string) {
  return withTenantContext(context, (tx) => tx.credentialReference.count({
    where: {
      organizationId: context.organizationId,
      connectionId,
      cleanupStatus: { in: ["cleanup_pending", "cleanup_in_progress"] },
    },
  }));
}

async function claimCredentialReferences(context: OrganizationContext, connectionId: string, referenceIds?: string[]) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + CLEANUP_LEASE_MS);
  return withTenantContext(context, async (tx) => {
    const candidates = await tx.credentialReference.findMany({
      where: {
        organizationId: context.organizationId,
        connectionId,
        ...(referenceIds ? { id: { in: referenceIds } } : {}),
        OR: [
          { cleanupStatus: { in: ["active", "cleanup_pending"] } },
          { cleanupStatus: "cleanup_in_progress", cleanupLeaseExpiresAt: { lte: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const claimed: CredentialReference[] = [];
    for (const candidate of candidates) {
      const updated = await tx.credentialReference.updateMany({
        where: {
          id: candidate.id,
          organizationId: context.organizationId,
          connectionId,
          OR: [
            { cleanupStatus: { in: ["active", "cleanup_pending"] } },
            { cleanupStatus: "cleanup_in_progress", cleanupLeaseExpiresAt: { lte: now } },
          ],
        },
        data: { cleanupStatus: "cleanup_in_progress", cleanupLeaseExpiresAt: leaseExpiresAt },
      });
      if (updated.count === 1) claimed.push({ ...candidate, cleanupStatus: "cleanup_in_progress", cleanupLeaseExpiresAt: leaseExpiresAt });
    }
    return claimed;
  });
}

async function completeCredentialCleanup(context: OrganizationContext, referenceId: string) {
  await withTenantContext(context, (tx) => tx.credentialReference.updateMany({
    where: { id: referenceId, organizationId: context.organizationId, cleanupStatus: "cleanup_in_progress" },
    data: { cleanupStatus: "destroyed", cleanupLeaseExpiresAt: null, revokedAt: new Date() },
  }));
}

async function releaseCredentialCleanup(context: OrganizationContext, referenceId: string) {
  await withTenantContext(context, (tx) => tx.credentialReference.updateMany({
    where: { id: referenceId, organizationId: context.organizationId, cleanupStatus: "cleanup_in_progress" },
    data: { cleanupStatus: "cleanup_pending", cleanupLeaseExpiresAt: null },
  })).catch(() => undefined);
}
