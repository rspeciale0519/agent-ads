import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type SecurityScanModule = {
  findCredentialPatternLabels: (text: string) => string[];
};

const modulePath = path.join(process.cwd(), "scripts", "security-scan.mjs");
const scanModule = import(pathToFileURL(modulePath).href) as Promise<SecurityScanModule>;

describe("security scan credential patterns", () => {
  it("detects a Supabase secret key without flagging a publishable key", async () => {
    const { findCredentialPatternLabels } = await scanModule;
    const secret = ["sb", "secret", "s".repeat(32)].join("_");
    const publishable = ["sb", "publishable", "p".repeat(32)].join("_");

    expect(findCredentialPatternLabels(secret)).toContain("Supabase secret key");
    expect(findCredentialPatternLabels(publishable)).not.toContain("Supabase secret key");
  });

  it("detects Resend keys and credential-bearing database URLs", async () => {
    const { findCredentialPatternLabels } = await scanModule;
    const resendKey = ["re", "r".repeat(32)].join("_");
    const databaseUrl = [
      "postgresql",
      "://runtime:",
      "r".repeat(32),
      "@database.example.invalid:5432/postgres",
    ].join("");

    expect(findCredentialPatternLabels(resendKey)).toContain("Resend API key");
    expect(findCredentialPatternLabels(databaseUrl)).toContain("database URL credential");
  });

  it("detects GitHub fine-grained personal access tokens", async () => {
    const { findCredentialPatternLabels } = await scanModule;
    const token = ["github", "pat", "g".repeat(40)].join("_");

    expect(findCredentialPatternLabels(token)).toContain("GitHub fine-grained token");
  });

  it("allows explicit synthetic database credentials used by tests and templates", async () => {
    const { findCredentialPatternLabels } = await scanModule;

    expect(findCredentialPatternLabels(
      "postgresql://runtime:synthetic-password@127.0.0.1:5432/postgres",
    )).not.toContain("database URL credential");
    expect(findCredentialPatternLabels(
      "postgresql://runtime:${secretSentinel}@127.0.0.1:5432/postgres",
    )).not.toContain("database URL credential");
  });
});
