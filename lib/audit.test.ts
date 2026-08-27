import { describe, expect, it, vi } from "vitest";
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

describe("audit integrity appends", () => {
  it("serializes the organization chain before reading its predecessor", async () => {
    const order: string[] = [];
    const queryRaw = vi.fn(async () => { order.push("lock"); return [{ pg_advisory_xact_lock: null }]; });
    const findFirst = vi.fn(async () => { order.push("read"); return { integrityHash: "previous-hash" }; });
    const create = vi.fn(async (input: unknown) => { order.push("create"); return input; });
    const tx = { $queryRaw: queryRaw, auditEvent: { findFirst, create } } as unknown as TenantTransaction;

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
});
