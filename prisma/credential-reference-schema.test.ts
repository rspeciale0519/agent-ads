import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationRoot = path.join(process.cwd(), "prisma", "migrations");
const migrationNames = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const schema = readFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), "utf8");

function migration(name: string) {
  return readFileSync(path.join(migrationRoot, name, "migration.sql"), "utf8");
}

describe("connection credential database contract", () => {
  it("maps both credential identifiers to PostgreSQL UUID values", () => {
    expect(schema).toMatch(/credentialReferenceId\s+String\?\s+@map\("credential_reference_id"\)\s+@db\.Uuid/u);
    expect(schema.match(/model CredentialReference \{[\s\S]*?\n\}/u)?.[0]).toMatch(/id\s+String\s+@id\s+@default\(uuid\(\)\)\s+@db\.Uuid/u);
  });

  it("runs the UUID repair before every migration that compares the identifiers", () => {
    const baseIndex = migrationNames.indexOf("20260810120000_account_connections");
    const repairIndex = migrationNames.indexOf("20260810120100_credential_reference_uuid");
    const firstComparisonIndex = migrationNames.indexOf("20260810180000_credential_reference_tenant_scope");
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(repairIndex).toBeGreaterThan(baseIndex);
    expect(repairIndex).toBeLessThan(firstComparisonIndex);
  });

  it("fails closed before converting stored text values", () => {
    const sql = migration("20260810120100_credential_reference_uuid");
    expect(sql).toContain("BEGIN;");
    expect(sql).toContain("non-canonical UUID");
    expect(sql).toContain("orphaned or cross-tenant reference");
    expect(sql).toContain("collide after UUID normalization");
    expect(sql).toContain("organization_id is missing while credential pointers exist");
    expect(sql).toContain("ALTER COLUMN credential_reference_id TYPE uuid");
    expect(sql).toContain("connections_organization_id_credential_reference_id_idx");
  });

  it("binds the current pointer to its owning connection", () => {
    const sql = migration("20260811110100_credential_reference_ownership");
    expect(sql).toContain("FOREIGN KEY (organization_id, id, credential_reference_id)");
    expect(sql).toContain("REFERENCES private.credential_references (organization_id, connection_id, id)");
    expect(sql).toContain("VALIDATE CONSTRAINT connections_credential_owner_fkey");
    expect(sql).toContain("confupdtype = 'c'");
    expect(sql).toContain("confdeltype = 'r'");
  });

  it("prepares the identity-bound function before its parameter rename", () => {
    const preparationIndex = migrationNames.indexOf("20260811129900_prepare_definer_identity_binding");
    const identityBindingIndex = migrationNames.indexOf("20260811130000_definer_identity_binding");
    expect(preparationIndex).toBeGreaterThanOrEqual(0);
    expect(preparationIndex).toBeLessThan(identityBindingIndex);
    expect(migration("20260811129900_prepare_definer_identity_binding")).toContain("pg_get_function_identity_arguments");
  });
});
