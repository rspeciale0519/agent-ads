import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationContext, TenantTransaction } from "./auth/organization-context";
import { appendAuditEvent } from "./audit";

const context: OrganizationContext = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  organizationName: "Pilot Org",
  userId: "00000000-0000-4000-8000-000000000002",
  authSubject: "00000000-0000-4000-8000-000000000003",
  email: "owner@example.test",
  role: "owner",
  permissions: ["connections.view"],
  sessionId: "session",
  assurance: "aal2",
};

afterEach(() => {
  vi.useRealTimers();
});

describe("audit integrity appends", () => {
  it("serializes the organization chain before reading its predecessor", async () => {
    const order: string[] = [];
    const queryRaw = vi.fn(async (query: TemplateStringsArray) => {
      const sql = query.join(" ");
      if (sql.includes("pg_advisory_xact_lock")) {
        order.push("lock");
        return [{ pg_advisory_xact_lock: null }];
      }
      order.push("read");
      expect(sql).toContain("NOT EXISTS");
      expect(sql).toContain("successor.previous_hash = candidate.integrity_hash");
      return [{ integrityHash: "previous-hash", createdAt: new Date("2026-08-27T12:00:00.000Z") }];
    });
    const create = vi.fn(async (input: unknown) => { order.push("create"); return input; });
    const tx = { $queryRaw: queryRaw, auditEvent: { findFirst: vi.fn(), create } } as unknown as TenantTransaction;

    await appendAuditEvent(tx, context, {
      action: "connection.verified",
      resourceType: "connection",
      resourceId: "00000000-0000-4000-8000-000000000004",
      outcomeCode: "verified",
      correlationId: "00000000-0000-4000-8000-000000000005",
      metadata: { provider: "google_ads" },
    });

    expect(order).toEqual(["lock", "read", "create"]);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ previousHash: "previous-hash" }),
    }));
  });

  it("uses the true chain tip and a later timestamp when existing events share one millisecond", async () => {
    const timestamp = new Date("2026-08-27T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(timestamp);
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ pg_advisory_xact_lock: null }])
      .mockResolvedValueOnce([{ integrityHash: "tied-child-hash", createdAt: timestamp }]);
    const create = vi.fn(async (input: unknown) => input);
    const tx = { $queryRaw: queryRaw, auditEvent: { findFirst: vi.fn(), create } } as unknown as TenantTransaction;

    await appendAuditEvent(tx, context, {
      action: "connection.authorization_expired",
      resourceType: "oauth_transaction",
      outcomeCode: "expired",
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ previousHash: "tied-child-hash", createdAt: new Date(timestamp.getTime() + 1) }),
    }));
  });

  it("fails closed when an existing organization chain has multiple tips", async () => {
    const timestamp = new Date("2026-08-27T12:00:00.000Z");
    const queryRaw = vi.fn()
      .mockResolvedValueOnce([{ pg_advisory_xact_lock: null }])
      .mockResolvedValueOnce([
        { integrityHash: "fork-one", createdAt: timestamp },
        { integrityHash: "fork-two", createdAt: timestamp },
      ]);
    const create = vi.fn();
    const tx = { $queryRaw: queryRaw, auditEvent: { findFirst: vi.fn(), create } } as unknown as TenantTransaction;

    await expect(appendAuditEvent(tx, context, {
      action: "connection.verified",
      resourceType: "connection",
      outcomeCode: "verified",
    })).rejects.toThrow("AUDIT_CHAIN_FORK_DETECTED");
    expect(create).not.toHaveBeenCalled();
  });
});
