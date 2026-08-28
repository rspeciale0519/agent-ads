import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "scripts", "f0");
const mark = readFileSync(path.join(root, "mark-disposable.sql"), "utf8");
const verify = readFileSync(path.join(root, "verify-disposable.sql"), "utf8");
const upgrade = readFileSync(path.join(root, "upgrade-proof.mjs"), "utf8");
const freshProof = readFileSync(path.join(root, "fresh-migration-proof.mjs"), "utf8");
const singleUserProofPath = path.join(root, "single-user-migration-proof.mjs");
const singleUserProof = readFileSync(singleUserProofPath, "utf8");
const validMarker = "f0000000-0000-4000-8000-000000000001";
type EnvironmentOverrides = Record<string, string | undefined>;

function isolatedEnvironment(overrides: EnvironmentOverrides = {}): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment.F0_ALLOW_DISPOSABLE_DATABASE;
  delete environment.F0_POSTGRES_DATA_DIR;
  delete environment.F0_DISPOSABLE_MARKER;
  delete environment.POSTGRES_BIN;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete environment[key];
    else environment[key] = value;
  }
  return environment;
}

function runSingleUserGuard(overrides: EnvironmentOverrides = {}) {
  return spawnSync(process.execPath, [singleUserProofPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: isolatedEnvironment(overrides),
  });
}

function guardOutput(result: ReturnType<typeof runSingleUserGuard>) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

describe("F0 disposable target marker", () => {
  it("uses database metadata without making Prisma see a non-empty schema", () => {
    expect(mark).toContain("COMMENT ON DATABASE");
    expect(mark).toContain("agent_ads_f0_disposable:");
    expect(mark).not.toContain("CREATE TABLE");
    expect(mark).not.toContain("CREATE SCHEMA");
  });

  it("verifies the same server-side database comment", () => {
    expect(verify).toContain("shobj_description(oid, 'pg_database')");
    expect(verify).toContain("agent_ads_f0_disposable:");
    expect(upgrade).toContain("shobj_description(oid, 'pg_database')");
    expect(upgrade).toContain("agent_ads_f0_disposable:${marker}");
  });

  it("records the simulated legacy baseline before migration deployment", () => {
    const baselineIndex = freshProof.indexOf("Prisma legacy baseline resolution");
    const deploymentIndex = freshProof.indexOf("Prisma migration deployment");
    expect(baselineIndex).toBeGreaterThanOrEqual(0);
    expect(baselineIndex).toBeLessThan(deploymentIndex);
    expect(freshProof).toContain('"--applied"');
    expect(freshProof).toContain('"00000000000000_legacy_baseline"');
  });

  it("guards the single-user proof with an empty-cluster marker before its first database write", () => {
    expect(singleUserProof).toContain("F0_DISPOSABLE_MARKER must be a canonical lowercase UUIDv4");
    expect(singleUserProof).toContain("POSTGRES_BIN must resolve to the PostgreSQL postgres executable");
    expect(singleUserProof).toContain("agent_ads_f0_single_user_disposable:");
    expect(singleUserProof).toContain("unexpected user database");
    expect(singleUserProof).toContain("unexpected user role");
    expect(singleUserProof).toContain("unexpected user relation");
    expect(singleUserProof).toContain("unexpected extension");
    expect(singleUserProof).toContain("default administrative connection database");
    expect(singleUserProof).toContain("shobj_description(oid, 'pg_database')");

    const guardIndex = singleUserProof.indexOf('runSql("Disposable cluster guard"');
    const databaseWriteIndex = singleUserProof.indexOf('runSql("Disposable database creation"');
    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeLessThan(databaseWriteIndex);
  });

  it("fails before filesystem or database access when destructive proof approval is missing", () => {
    const result = runSingleUserGuard();
    expect(result.status).not.toBe(0);
    expect(guardOutput(result)).toContain("F0_ALLOW_DISPOSABLE_DATABASE=1 is required");
  });

  it("rejects a malformed disposable marker before database access", () => {
    const result = runSingleUserGuard({
      F0_ALLOW_DISPOSABLE_DATABASE: "1",
      F0_DISPOSABLE_MARKER: "not-a-marker",
      F0_POSTGRES_DATA_DIR: process.cwd(),
      POSTGRES_BIN: process.execPath,
    });
    expect(result.status).not.toBe(0);
    expect(guardOutput(result)).toContain("F0_DISPOSABLE_MARKER must be a canonical lowercase UUIDv4");
  });

  it("rejects a data directory outside this repository's docs/temp directory", () => {
    const result = runSingleUserGuard({
      F0_ALLOW_DISPOSABLE_DATABASE: "1",
      F0_DISPOSABLE_MARKER: validMarker,
      F0_POSTGRES_DATA_DIR: tmpdir(),
      POSTGRES_BIN: process.execPath,
    });
    expect(result.status).not.toBe(0);
    expect(guardOutput(result)).toContain("F0_POSTGRES_DATA_DIR must be inside this project's docs/temp directory");
  });

  it("rejects an executable that is not PostgreSQL", () => {
    const disposableDirectory = mkdtempSync(path.join(process.cwd(), "docs", "temp", "f0-guard-test-"));
    try {
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("POSTGRES_BIN must resolve to the PostgreSQL postgres executable");
    } finally {
      rmdirSync(disposableDirectory);
    }
  });
});
