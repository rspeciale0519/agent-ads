import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  networkDatabaseEnvironment,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";
import { upgradeScenarios } from "./upgrade-fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
const { marker, psql } = context;
const createdDatabases = [];
const templateName = "agent_ads_f0_upgrade_template";

function psqlResult(database, { file, sql } = {}) {
  const args = psqlBaseArguments({ quiet: true, tuplesOnly: true, noAlign: true });
  if (file) args.push("--file", file);
  return spawnSync(psql, args, {
    cwd: root,
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, database),
    input: sql,
    maxBuffer: 50 * 1024 * 1024,
  });
}

function requireSuccess(label, database, options) {
  const result = psqlResult(database, options);
  if (result.error || result.status !== 0) {
    process.stderr.write(`${result.stdout || ""}${result.stderr || ""}`);
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }
}

function requireFailure(label, database, sql, expectedMessage) {
  const result = psqlResult(database, { sql });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (!result.error && result.status === 0) throw new Error(`${label} unexpectedly succeeded.`);
  if (!output.includes(expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} did not fail with the expected guard.`);
  }
}

function createDatabase(name, template = "template1") {
  if (!/^agent_ads_f0_[a-z_]+$/u.test(name)) throw new Error("Unsafe upgrade-proof database name.");
  requireSuccess(
    `Create ${name}`,
    "postgres",
    { sql: `CREATE DATABASE "${name}" TEMPLATE "${template}";\n` },
  );
  createdDatabases.push(name);
}

const markerResult = psqlResult("agent_ads_f0", {
  sql: `SELECT shobj_description(oid, 'pg_database') FROM pg_database WHERE datname = current_database();\n`,
});
if (
  markerResult.error ||
  markerResult.status !== 0 ||
  markerResult.stdout.trim() !== `agent_ads_f0_disposable:${marker}`
) {
  throw new Error("The disposable database marker is missing or incorrect.");
}

const bootstrapFile = path.join(root, "scripts", "f0", "bootstrap.sql");
const baseMigrationFile = path.join(root, "prisma", "migrations", "20260810120000_account_connections", "migration.sql");
const repairMigration = readFileSync(path.join(root, "prisma", "migrations", "20260810120100_credential_reference_uuid", "migration.sql"), "utf8");
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

function provePermissionRoleLoginGuard(roleName) {
  if (!new Set(["app_runtime", "app_secret_broker"]).has(roleName)) {
    throw new Error("Unsafe permission-role proof name.");
  }
  requireFailure(
    `Permission-role login guard for ${roleName}`,
    "agent_ads_f0",
    `BEGIN;\nALTER ROLE "${roleName}" LOGIN;\n${vaultBoundaryMigration}`,
    "ACCOUNT_CONNECTIONS_PERMISSION_ROLE_LOGIN_ENABLED",
  );
  const state = psqlResult("agent_ads_f0", {
    sql: `SELECT rolcanlogin FROM pg_roles WHERE rolname = '${roleName}';\n`,
  });
  if (state.error || state.status !== 0 || state.stdout.trim() !== "f") {
    throw new Error(`Permission-role login guard did not roll back ${roleName}.`);
  }
}

try {
  provePermissionRoleLoginGuard("app_runtime");
  provePermissionRoleLoginGuard("app_secret_broker");

  createDatabase(templateName);
  requireSuccess("Upgrade template bootstrap", templateName, { file: bootstrapFile });
  requireSuccess("Upgrade template base migration", templateName, { file: baseMigrationFile });

  for (const scenario of upgradeScenarios) {
    const scenarioDatabase = `agent_ads_f0_${scenario.name}`;
    createDatabase(scenarioDatabase, templateName);
    requireSuccess(`Upgrade fixture ${scenario.name}`, scenarioDatabase, { sql: scenario.fixture });
    if (scenario.expectedFailure) {
      requireFailure(
        `Upgrade repair ${scenario.name}`,
        scenarioDatabase,
        repairMigration,
        scenario.expectedFailure,
      );
    } else {
      requireSuccess(`Upgrade repair ${scenario.name}`, scenarioDatabase, { sql: repairMigration });
    }
    if (scenario.postRepairMigration) {
      requireSuccess(
        `Post-repair migration ${scenario.name}`,
        scenarioDatabase,
        { file: path.join(root, "prisma", "migrations", scenario.postRepairMigration, "migration.sql") },
      );
    }
    requireSuccess(`Upgrade assertion ${scenario.name}`, scenarioDatabase, { sql: scenario.assertion });
  }
} finally {
  let cleanupFailed = false;
  for (const name of createdDatabases.reverse()) {
    const result = psqlResult("postgres", { sql: `DROP DATABASE "${name}" WITH (FORCE);\n` });
    if (result.error || result.status !== 0) {
      cleanupFailed = true;
      process.stderr.write(`${result.stdout || ""}${result.stderr || ""}`);
    }
  }
  if (cleanupFailed) throw new Error("F0 upgrade proof could not remove every run-owned database.");
}

console.log("F0 upgrade proof passed: permission-role login guards, valid, null, malformed, orphan, cross-tenant, collision, rollback, and historical tenant-column paths are safe.");
