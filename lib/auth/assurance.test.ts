import { describe, expect, it } from "vitest";
import { requireAal2, AssuranceError, type AssuranceStatus } from "./assurance";

const status = (overrides: Partial<AssuranceStatus> = {}): AssuranceStatus => ({
  authenticated: true,
  aal: "aal2",
  sessionId: "session-1",
  mfaRequired: false,
  activeSessionValidated: true,
  ...overrides,
});

describe("AAL2 enforcement", () => {
  it("rejects unauthenticated callers before checking assurance", () => {
    expect(() => requireAal2(status({ authenticated: false }))).toThrowError(new AssuranceError("AUTHENTICATION_REQUIRED"));
  });

  it("rejects sessions that have not completed MFA", () => {
    expect(() => requireAal2(status({ aal: "aal1" }))).toThrowError(new AssuranceError("AAL2_REQUIRED"));
  });

  it("rejects AAL2 claims when the backing auth session is not active", () => {
    expect(() => requireAal2(status({ activeSessionValidated: false }))).toThrowError(new AssuranceError("ACTIVE_SESSION_REQUIRED"));
  });

  it("allows an authenticated AAL2 session that was validated server-side", () => {
    expect(() => requireAal2(status())).not.toThrow();
  });
});
