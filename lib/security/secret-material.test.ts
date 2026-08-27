import { describe, expect, it } from "vitest";
import { findSecretPattern, isUnsafeCredentialDocumentName } from "./secret-material";

describe("secret material boundary", () => {
  it("detects credential and recovery-code shaped text", () => {
    expect(findSecretPattern("password: synthetic-only")).toBe("password");
    expect(findSecretPattern("recovery code: 1234 5678")).toBe("MFA or recovery code");
    expect(findSecretPattern("ordinary campaign notes")).toBeNull();
  });

  it("rejects credential-export filenames without blocking ordinary policy documents", () => {
    expect(isUnsafeCredentialDocumentName("client-passwords.xlsx")).toBe(true);
    expect(isUnsafeCredentialDocumentName("recovery_codes.csv")).toBe(true);
    expect(isUnsafeCredentialDocumentName("password-policy.pdf")).toBe(false);
  });
});
