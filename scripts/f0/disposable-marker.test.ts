import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "scripts", "f0");
const mark = readFileSync(path.join(root, "mark-disposable.sql"), "utf8");
const verify = readFileSync(path.join(root, "verify-disposable.sql"), "utf8");
const upgrade = readFileSync(path.join(root, "upgrade-proof.mjs"), "utf8");
const freshProof = readFileSync(path.join(root, "fresh-migration-proof.mjs"), "utf8");

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
});
