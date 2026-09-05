import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const envExample = readFileSync(path.join(root, ".env.example"), "utf8");
const nextConfig = readFileSync(path.join(root, "next.config.ts"), "utf8");
const supabaseCaCertificate = readFileSync(
  path.join(root, "prisma", "prod-ca-2021.crt"),
  "utf8",
);
const roleAssertions = readFileSync(path.join(root, "scripts", "f0", "assertions.sql"), "utf8");
const tenantRoleProof = readFileSync(
  path.join(root, "scripts", "f0", "tenant-role-proof.sql"),
  "utf8",
);
const vaultBoundaryMigration = readFileSync(
  path.join(
    root,
    "prisma",
    "migrations",
    "20260827190000_vault_write_function_boundary",
    "migration.sql",
  ),
  "utf8",
);
const operations = readFileSync(
  path.join(root, "docs", "development", "quality", "account-connections-operations.md"),
  "utf8",
);

describe("database role deployment contract", () => {
  it("uses separate login principals in pooled connection examples", () => {
    expect(envExample).toContain(
      "DATABASE_URL=postgresql://app_runtime_login.your-project-ref:",
    );
    expect(envExample).toContain(
      "SECRET_BROKER_DATABASE_URL=postgresql://app_secret_broker_login.your-project-ref:",
    );
    expect(envExample).not.toContain("DATABASE_URL=postgresql://app_runtime:");
    expect(envExample).not.toContain(
      "SECRET_BROKER_DATABASE_URL=postgresql://app_secret_broker:",
    );
  });

  it("pins and packages the approved Supabase CA certificate", () => {
    expect(new X509Certificate(supabaseCaCertificate).fingerprint256).toBe(
      "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
    );
    expect(envExample.match(/sslcert=prod-ca-2021\.crt/gu)).toHaveLength(3);
    expect(nextConfig).toContain('"/*": ["./prisma/prod-ca-2021.crt"]');
  });

  it("keeps permission roles unable to log in", () => {
    expect(roleAssertions).toContain("rolcanlogin");
    expect(vaultBoundaryMigration).toContain(
      "ACCOUNT_CONNECTIONS_PERMISSION_ROLE_LOGIN_ENABLED",
    );
    expect(vaultBoundaryMigration).toContain("AND rolcanlogin");
    expect(operations).toContain(
      "The migration creates `app_runtime` and `app_secret_broker` as `NOLOGIN` permission roles.",
    );
    expect(operations).toContain("Never enable `LOGIN` on these roles.");
    expect(operations).toContain("Use this expand-and-contract transition");
    expect(operations).toContain(
      "Set `app_runtime` and `app_secret_broker` to `NOLOGIN`",
    );
    expect(operations).toContain(
      "migrate resolve --rolled-back 20260827190000_vault_write_function_boundary",
    );
    expect(operations).toContain(
      "Confirm the failed transaction changed no Vault grants or other database state.",
    );
  });

  it("proves safe inherited memberships on a disposable target", () => {
    expect(operations).toContain("Grant `app_runtime` only to the runtime login.");
    expect(operations).toContain(
      "Grant `app_secret_broker` only to the broker login.",
    );
    expect(operations).toContain(
      "Do not grant database-object permissions directly to either login principal.",
    );
    expect(tenantRoleProof).toContain("CREATE ROLE f0_app_runtime_login");
    expect(tenantRoleProof).toContain("CREATE ROLE f0_app_secret_broker_login");
    expect(tenantRoleProof).toContain(
      "WITH INHERIT TRUE, SET FALSE, ADMIN FALSE;",
    );
    expect(tenantRoleProof).toContain("membership.inherit_option");
    expect(tenantRoleProof).toContain("membership.set_option");
    expect(tenantRoleProof).toContain("membership.admin_option");
    expect(tenantRoleProof).toContain("SET LOCAL ROLE f0_app_runtime_login;");
    expect(tenantRoleProof).toContain("SET LOCAL ROLE f0_app_secret_broker_login;");
    expect(tenantRoleProof).toContain("runtime login executed a broker-only function");
    expect(tenantRoleProof).toContain("runtime login created a Vault secret");
    expect(tenantRoleProof).toContain("runtime login updated a Vault secret");
    expect(tenantRoleProof).toContain("broker login read the Vault table directly");
    expect(tenantRoleProof).toContain("broker login read an application table");
  });
});
