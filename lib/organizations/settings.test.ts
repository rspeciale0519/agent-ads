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

import { permissionsForRole } from "../auth/permissions";
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
  const $queryRaw = vi.fn().mockResolvedValue([{ locked: 1 }]);
  withTenantContextMock.mockImplementation(async (_context, callback) => callback({ organizationSettings, $queryRaw }));
  return Object.assign(organizationSettings, { $queryRaw });
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
    // The organization's settings lock is taken before the previous value is read.
    expect(table.$queryRaw).toHaveBeenCalledTimes(1);
    expect(table.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(table.findUnique.mock.invocationCallOrder[0]);
    expect(auditMock.mock.calls[0][2]).toMatchObject({ action: "organization.settings_updated", metadata: { staleUploadDays: 14, previousStaleUploadDays: 7 } });
  });

  it("gives the settings permission to owners and administrators only", () => {
    expect(permissionsForRole("owner")).toContain("organization.settings.manage");
    expect(permissionsForRole("administrator")).toContain("organization.settings.manage");
    expect(permissionsForRole("operator")).not.toContain("organization.settings.manage");
    expect(permissionsForRole("member")).not.toContain("organization.settings.manage");
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
