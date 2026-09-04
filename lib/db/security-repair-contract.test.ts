import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "prisma",
    "migrations",
    "20260830120000_restore_security_contract",
    "migration.sql",
  ),
  "utf8",
).replace(/\r\n/gu, "\n");

describe("forward security repair contract", () => {
  it("bounds the repair and commits only after its checks", () => {
    expect(migration.startsWith("BEGIN;\n")).toBe(true);
    expect(migration.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(migration).toContain("SET LOCAL search_path = pg_catalog;");
    expect(migration).toContain("SET LOCAL lock_timeout = '1s';");
    expect(migration).toContain("SET LOCAL statement_timeout = '15s';");
    expect(migration).toContain("NOT (rolcanlogin OR rolinherit OR rolsuper");
    expect(migration.indexOf("DO $security_contract_preconditions$")).toBeLessThan(
      migration.indexOf("ALTER TABLE private.rate_limit_buckets"),
    );
    expect(migration.indexOf("DO $security_contract_postconditions$")).toBeGreaterThan(
      migration.lastIndexOf("REVOKE EXECUTE ON FUNCTION"),
    );
  });

  it("checks the zero-policy limiter's definer before forcing RLS", () => {
    expect(migration).toContain("AND p.prosecdef");
    expect(migration).toContain("AND l.lanname = 'plpgsql'");
    expect(migration).toContain("AND p.proconfig = ARRAY['search_path=pg_catalog, private']");
    expect(migration).toContain("AND p.proowner = c.relowner");
    expect(migration).toContain("AND (owner_role.rolsuper OR owner_role.rolbypassrls)");
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
      expect(migration).toContain(`AND has_table_privilege(p.proowner, c.oid, '${privilege}')`);
    }
    expect(migration).toContain("AND NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = c.oid)");
    expect(migration).toContain("ACCOUNT_CONNECTIONS_RATE_LIMIT_DEFINER_CONTRACT_INVALID");
    expect(migration).toContain("ALTER TABLE private.rate_limit_buckets FORCE ROW LEVEL SECURITY;");
    expect(migration).toContain("AND relrowsecurity AND relforcerowsecurity");
  });

  it("removes only the two service-role function grants and verifies effective denial", () => {
    const revocations = migration.match(/^REVOKE .+;$/gmu);
    expect(revocations).toEqual([
      "REVOKE EXECUTE ON FUNCTION vault.create_secret(text, text, text, uuid) FROM service_role RESTRICT;",
      "REVOKE EXECUTE ON FUNCTION vault.update_secret(uuid, text, text, text, uuid) FROM service_role RESTRICT;",
    ]);
    expect(migration).toContain("has_function_privilege('app_secret_broker'");
    expect(migration).toContain("ARRAY['anon', 'authenticated', 'service_role', 'app_runtime']");
    expect(migration).toContain("IS DISTINCT FROM true");
    expect(migration).toContain("IS DISTINCT FROM false");
    expect(migration).toContain("ACCOUNT_CONNECTIONS_VAULT_EXECUTE_REPAIR_FAILED");
  });

  it("preserves data, history, policies, identities, and function bodies", () => {
    expect(migration).not.toMatch(/^\s*(?:CREATE|DROP|INSERT|UPDATE|DELETE|TRUNCATE|GRANT)\b/gmu);
    expect(migration).not.toMatch(/ALTER\s+(?:ROLE|FUNCTION|POLICY)\b/gu);
    expect(migration).not.toContain("_prisma_migrations");
    expect(migration).not.toContain("DISABLE ROW LEVEL SECURITY");
    expect(migration).not.toContain("NO FORCE ROW LEVEL SECURITY");
    expect(migration).not.toContain("CASCADE");
    expect(migration).not.toContain("PASSWORD");
  });

  it("resolves snapshot roles without forbidden stored regrole constants", () => {
    const fixtureSource = readFileSync(
      path.join(process.cwd(), "scripts", "f0", "security-repair-fixtures.mjs"),
      "utf8",
    );
    const snapshotView = fixtureSource.match(/const snapshotViewSql = `([\s\S]*?)`;/u)?.[1];
    expect(snapshotView).toBeDefined();
    expect(snapshotView).toContain("SELECT oid FROM pg_roles WHERE rolname = 'service_role'");
    expect(snapshotView).not.toMatch(/::regrole\b/u);
  });
});
