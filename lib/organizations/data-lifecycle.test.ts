import { describe, expect, it } from "vitest";
import type { OrganizationContext } from "../auth/organization-context";
import { assertDataLifecyclePermission, assertExportWithinLimits, isOffboardingConfirmationValid, takeOffboardingBatch } from "./data-lifecycle";

function context(role: OrganizationContext["role"], permissions: string[] = ["membership.manage"]): OrganizationContext {
  return { organizationId: "00000000-0000-4000-8000-000000000001", organizationName: "Pilot Org", userId: "00000000-0000-4000-8000-000000000002", authSubject: "00000000-0000-4000-8000-000000000003", email: "owner@example.test", role, permissions, sessionId: "session", assurance: "aal2" };
}

describe("organization data lifecycle contracts", () => {
  it("limits export to administrators and offboarding to owners", () => {
    expect(() => assertDataLifecyclePermission(context("administrator"), false)).not.toThrow();
    expect(() => assertDataLifecyclePermission(context("administrator"), true)).toThrow("OWNER_REQUIRED");
    expect(() => assertDataLifecyclePermission(context("member", []), false)).toThrow("PERMISSION_DENIED");
  });

  it("requires the exact organization-bound confirmation phrase", () => {
    expect(isOffboardingConfirmationValid("Pilot Org", "OFFBOARD Pilot Org")).toBe(true);
    expect(isOffboardingConfirmationValid("Pilot Org", "OFFBOARD Another Org")).toBe(false);
  });

  it("takes a bounded, resumable offboarding batch", () => {
    expect(takeOffboardingBatch(Array.from({ length: 21 }, (_, index) => index))).toHaveLength(20);
  });

  it("fails closed rather than returning a silently truncated export", () => {
    expect(() => assertExportWithinLimits({ connectionRequests: 5_000, connections: 5_000, organizationInvitations: 5_000, auditEvents: 10_000 })).not.toThrow();
    expect(() => assertExportWithinLimits({ connectionRequests: 5_001, connections: 0, organizationInvitations: 0, auditEvents: 0 })).toThrow("EXPORT_SIZE_LIMIT_EXCEEDED");
  });
});
