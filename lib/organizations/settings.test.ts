import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrganizationContext } from "../auth/organization-context";

// Stand-ins for the database, MFA check, and audit log.
const withTenantContextMock = vi.hoisted(() => vi.fn());
const assuranceMock = vi.hoisted(() => vi.fn());
const auditMock = vi.hoisted(() => vi.fn());
vi.mock("../auth/organization-context", () => ({ withTenantContext: withTenantContextMock }));
vi.mock("../auth/assurance", () => ({
  getAssuranceStatus: assuranceMock,
  requireAal2: (status: { aal2: boolean }) => { if (!status.aal2) throw Object.assign(new Error("MFA_REQUIRED"), { code: "MFA_REQUIRED" }); },
}));
vi.mock("../audit", () => ({ appendAuditEvent: auditMock }));

import { readOrganizationSettings, updateOrganizationSettings } from "./settings";

const organizationId = "00000000-0000-4000-8000-000000000001";
function context(role: OrganizationContext["role"], permissions: string[]): OrganizationContext {
  return { organizationId, organizationName: "Pilot Org", userId: "00000000-0000-4000-8000-000000000002", authSubject: "00000000-0000-4000-8000-000000000003", email: "owner@example.test", role, permissions, sessionId: "session", assurance: "aal2" };
}
const owner = context("owner", ["organization.settings.manage"]);

function mockDatabase(saved: { staleUploadDays: number } | null) {
  const organizationSettings = {
    findUnique: vi.fn().mockResolvedValue(saved),
    upsert: vi.fn().mockImplementation(async ({ create }) => ({ staleUploadDays: create.staleUploadDays })),
  };
  withTenantContextMock.mockImplementation(async (_context, callback) => callback({ organizationSettings }));
  return organizationSettings;
}

afterEach(() => vi.clearAllMocks());

describe("organization settings", () => {
  it("defaults to 7 days until something is saved", async () => {
    mockDatabase(null);
    expect(await readOrganizationSettings(owner)).toEqual({ staleUploadDays: 7 });
    mockDatabase({ staleUploadDays: 14 });
    expect(await readOrganizationSettings(owner)).toEqual({ staleUploadDays: 14 });
  });

  it("saves a new value and records who changed it in the audit log", async () => {
    assuranceMock.mockResolvedValue({ aal2: true });
    const table = mockDatabase({ staleUploadDays: 7 });
    expect(await updateOrganizationSettings(owner, { staleUploadDays: 14 }, "correlation-1")).toEqual({ staleUploadDays: 14 });
    expect(table.upsert.mock.calls[0][0].create).toEqual({ organizationId, staleUploadDays: 14, updatedBy: owner.userId });
    expect(auditMock.mock.calls[0][2]).toMatchObject({ action: "organization.settings_updated", metadata: { staleUploadDays: 14, previousStaleUploadDays: 7 } });
  });

  it("refuses people without the settings permission", async () => {
    mockDatabase(null);
    await expect(updateOrganizationSettings(context("member", ["connections.view"]), { staleUploadDays: 14 }, "c")).rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
  });

  it("requires current MFA", async () => {
    assuranceMock.mockResolvedValue({ aal2: false });
    const table = mockDatabase(null);
    await expect(updateOrganizationSettings(owner, { staleUploadDays: 14 }, "c")).rejects.toThrow("MFA_REQUIRED");
    expect(table.upsert).not.toHaveBeenCalled();
  });

  it.each([0, 91, 7.5, "7"])("rejects %s days", async (value) => {
    assuranceMock.mockResolvedValue({ aal2: true });
    const table = mockDatabase(null);
    await expect(updateOrganizationSettings(owner, { staleUploadDays: value }, "c")).rejects.toThrow();
    expect(table.upsert).not.toHaveBeenCalled();
  });
});
