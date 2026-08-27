import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { upgradeScenarios } from "./upgrade-fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const databaseUrl = process.env.F0_DATABASE_URL;
const marker = process.env.F0_DISPOSABLE_MARKER;

if (process.env.F0_ALLOW_DISPOSABLE_DATABASE !== "1") {
  throw new Error("F0_ALLOW_DISPOSABLE_DATABASE=1 is required for this destructive disposable-database proof.");
}
if (!databaseUrl || !marker) throw new Error("F0_DATABASE_URL and F0_DISPOSABLE_MARKER are required.");
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(marker)) {
  throw new Error("F0_DISPOSABLE_MARKER must be a canonical lowercase UUID.");
}

const parsed = new URL(databaseUrl);
const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const databaseName = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
if (!allowedHosts.has(parsed.hostname) || databaseName !== "agent_ads_f0") {
  throw new Error("F0_DATABASE_URL must target the local disposable database agent_ads_f0.");
}

const psql = process.env.PSQL_BIN || "psql";
const createdDatabases = [];
const templateName = "agent_ads_f0_upgrade_template";

function urlFor(name) {
  const target = new URL(databaseUrl);
  target.pathname = `/${name}`;
  return target.toString();
}

function psqlResult(url, { file, sql } = {}) {
  const args = ["-X", "--quiet", "--tuples-only", "--no-align", "--dbname", url, "--set", "ON_ERROR_STOP=1"];
  if (file) args.push("--file", file);
  return spawnSync(psql, args, {
    cwd: root,
    encoding: "utf8",
    input: sql,
    maxBuffer: 50 * 1024 * 1024,
  });
}

function requireSuccess(label, url, options) {
  const result = psqlResult(url, options);
  if (result.error || result.status !== 0) {
    process.stderr.write(`${result.stdout || ""}${result.stderr || ""}`);
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }
}

function requireFailure(label, url, sql, expectedMessage) {
  const result = psqlResult(url, { sql });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (!result.error && result.status === 0) throw new Error(`${label} unexpectedly succeeded.`);
  if (!output.includes(expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} did not fail with the expected guard.`);
  }
}

function createDatabase(name, template = "template0") {
  if (!/^agent_ads_f0_[a-z_]+$/u.test(name)) throw new Error("Unsafe upgrade-proof database name.");
  requireSuccess(
    `Create ${name}`,
    urlFor("postgres"),
    { sql: `CREATE DATABASE "${name}" TEMPLATE "${template}";\n` },
  );
  createdDatabases.push(name);
}

const markerResult = psqlResult(databaseUrl, {
  sql: `SELECT marker FROM public._f0_disposable_target;\n`,
});
if (markerResult.error || markerResult.status !== 0 || markerResult.stdout.trim() !== marker) {
  throw new Error("The disposable database marker is missing or incorrect.");
}

const bootstrapFile = path.join(root, "scripts", "f0", "bootstrap.sql");
const baseMigrationFile = path.join(root, "prisma", "migrations", "20260810120000_account_connections", "migration.sql");
const repairMigration = readFileSync(path.join(root, "prisma", "migrations", "20260810120100_credential_reference_uuid", "migration.sql"), "utf8");

try {
  createDatabase(templateName);
  requireSuccess("Upgrade template bootstrap", urlFor(templateName), { file: bootstrapFile });
  requireSuccess("Upgrade template base migration", urlFor(templateName), { file: baseMigrationFile });

  for (const scenario of upgradeScenarios) {
    const scenarioDatabase = `agent_ads_f0_${scenario.name}`;
    createDatabase(scenarioDatabase, templateName);
    const scenarioUrl = urlFor(scenarioDatabase);
    requireSuccess(`Upgrade fixture ${scenario.name}`, scenarioUrl, { sql: scenario.fixture });
    if (scenario.expectedFailure) {
      requireFailure(`Upgrade repair ${scenario.name}`, scenarioUrl, repairMigration, scenario.expectedFailure);
    } else {
      requireSuccess(`Upgrade repair ${scenario.name}`, scenarioUrl, { sql: repairMigration });
    }
    if (scenario.postRepairMigration) {
      requireSuccess(
        `Post-repair migration ${scenario.name}`,
        scenarioUrl,
        { file: path.join(root, "prisma", "migrations", scenario.postRepairMigration, "migration.sql") },
      );
    }
    requireSuccess(`Upgrade assertion ${scenario.name}`, scenarioUrl, { sql: scenario.assertion });
  }
} finally {
  for (const name of createdDatabases.reverse()) {
    const result = psqlResult(urlFor("postgres"), { sql: `DROP DATABASE "${name}" WITH (FORCE);\n` });
    if (result.error || result.status !== 0) process.stderr.write(`${result.stdout || ""}${result.stderr || ""}`);
  }
}

console.log("F0 upgrade proof passed: valid, null, malformed, orphan, cross-tenant, collision, rollback, and historical tenant-column paths are safe.");
