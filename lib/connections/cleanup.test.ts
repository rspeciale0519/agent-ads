import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationContext, TenantTransaction } from "../auth/organization-context";
import type { SecretBroker } from "./secrets/secret-broker";

const withTenantContextMock = vi.hoisted(() => vi.fn());
const getProviderAdapterMock = vi.hoisted(() => vi.fn());

vi.mock("../auth/organization-context", () => ({
  withTenantContext: withTenantContextMock,
}));

vi.mock("./providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./providers")>();
  return { ...actual, getProviderAdapter: getProviderAdapterMock };
});

import { cleanupCredentialReferences } from "./cleanup";

const context: OrganizationContext = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  organizationName: "Pilot Org",
  userId: "00000000-0000-4000-8000-000000000002",
  authSubject: "00000000-0000-4000-8000-000000000003",
  email: "owner@example.test",
  role: "owner",
  permissions: ["connections.revoke"],
  sessionId: "session",
  assurance: "aal2",
};

function setupReference(credentialKind: string) {
  const reference = {
    id: "00000000-0000-4000-8000-000000000004",
    organizationId: context.organizationId,
    connectionId: "00000000-0000-4000-8000-000000000005",
    brokerHandle: "opaque-handle",
    backend: "test",
    credentialKind,
    keyVersion: "test-v1",
    cleanupStatus: "active",
    cleanupLeaseExpiresAt: null,
    expiresAt: null,
    revokedAt: null,
    fingerprint: null,
    createdAt: new Date("2026-08-28T00:00:00.000Z"),
    updatedAt: new Date("2026-08-28T00:00:00.000Z"),
  };
  const credentialReference = {
    findMany: vi.fn().mockResolvedValue([reference]),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    count: vi.fn().mockResolvedValue(0),
  };
  const tx = { credentialReference } as unknown as TenantTransaction;
  withTenantContextMock.mockImplementation(async (_context: unknown, callback: (tenantTx: TenantTransaction) => unknown) => callback(tx));
  return { reference, credentialReference };
}

function broker() {
  return {
    read: vi.fn().mockResolvedValue("provider-secret"),
    destroy: vi.fn().mockResolvedValue(undefined),
  } as unknown as SecretBroker;
}

beforeEach(() => {
  withTenantContextMock.mockReset();
  getProviderAdapterMock.mockReset();
});

describe("credential cleanup provider revocation", () => {
  it("forwards the stored credential kind to provider revocation", async () => {
    const { reference } = setupReference("oauth_access_token");
    const secretBroker = broker();
    const revoke = vi.fn().mockResolvedValue(undefined);
    getProviderAdapterMock.mockReturnValue({ revoke });

    const result = await cleanupCredentialReferences({
      context,
      connectionId: reference.connectionId,
      currentReferenceId: reference.id,
      provider: "meta",
      broker: secretBroker,
      revokeCurrentProviderGrant: true,
    });

    expect(revoke).toHaveBeenCalledWith("provider-secret", "oauth_access_token");
    expect(secretBroker.destroy).toHaveBeenCalledWith(reference.brokerHandle);
    expect(result).toEqual({ cleaned: 1, pending: 0, providerRevocationUnverified: false });
  });

  it("does not call a provider or destroy the secret when the stored kind is unknown", async () => {
    const { reference } = setupReference("untrusted_kind");
    const secretBroker = broker();

    const result = await cleanupCredentialReferences({
      context,
      connectionId: reference.connectionId,
      currentReferenceId: reference.id,
      provider: "meta",
      broker: secretBroker,
      revokeCurrentProviderGrant: true,
    });

    expect(getProviderAdapterMock).not.toHaveBeenCalled();
    expect(secretBroker.destroy).not.toHaveBeenCalled();
    expect(result).toEqual({ cleaned: 0, pending: 1, providerRevocationUnverified: false });
  });
});
