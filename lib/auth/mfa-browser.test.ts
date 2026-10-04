import { beforeEach, describe, expect, it, vi } from "vitest";

const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
}));
const refreshSession = vi.hoisted(() => vi.fn());

vi.mock("../supabase-browser", () => ({ getSupabaseBrowser: () => ({ auth: { mfa, refreshSession } }) }));

import { sessionNeedsTotpVerification, verifySessionWithExistingTotp } from "./mfa-browser";

describe("browser MFA session verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mfa.listFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1" }] }, error: null });
    mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    refreshSession.mockResolvedValue({ data: {}, error: null });
  });

  it("verifies the session with the existing authenticator instead of enrolling a new one", async () => {
    await expect(verifySessionWithExistingTotp("123456")).resolves.toBe(true);
    expect(mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
    expect(refreshSession).toHaveBeenCalled();
  });

  it("rejects malformed codes before calling Supabase", async () => {
    await expect(verifySessionWithExistingTotp("12345")).rejects.toThrow("six-digit");
    expect(mfa.listFactors).not.toHaveBeenCalled();
  });

  it("reports when no verified authenticator exists", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    await expect(verifySessionWithExistingTotp("123456")).resolves.toBe(false);
    expect(mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  it("surfaces a wrong code as an error", async () => {
    mfa.challengeAndVerify.mockResolvedValue({ data: null, error: new Error("Invalid TOTP code entered") });
    await expect(verifySessionWithExistingTotp("000000")).rejects.toThrow("Invalid TOTP code entered");
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("needs a code only when the account can reach AAL2 but the session is AAL1", async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    await expect(sessionNeedsTotpVerification()).resolves.toBe(true);
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({ data: { currentLevel: "aal2", nextLevel: "aal2" }, error: null });
    await expect(sessionNeedsTotpVerification()).resolves.toBe(false);
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({ data: { currentLevel: "aal1", nextLevel: "aal1" }, error: null });
    await expect(sessionNeedsTotpVerification()).resolves.toBe(false);
  });
});
