import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNetworkProofMutex,
  networkDatabaseEnvironment,
  networkProofRunningMarker,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
assertNetworkProofMutex(context);
const { databaseUrl, marker, psql } = context;
const psqlArgs = psqlBaseArguments();
const markScript = path.join(root, "scripts", "f0", "mark-disposable.sql");
const clusterGuard = readFileSync(
  path.join(root, "scripts", "f0", "disposable-cluster-guard.sql"),
  "utf8",
);
const hiddenDatabase = `f0_mark_guard_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const templateSchema = `f0_mark_guard_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const expectedMarker = networkProofRunningMarker(marker, context.mutex.token);

function safeOutput(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`.replaceAll(databaseUrl, "[REDACTED_DATABASE_URL]");
}

function runPsql(label, args, database = "agent_ads_f0", input) {
  const result = spawnSync(psql, args, {
    cwd: root,
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, database, { trustedCatalogs: true }),
    input,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    process.stderr.write(safeOutput(result));
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed.`);
  }
  return result;
}

function runSql(label, sql, database = "agent_ads_f0") {
  return runPsql(
    label,
    [...psqlArgs, "--command", sql],
    database,
  );
}

function readMarker() {
  const result = runPsql("Disposable marker query", [
    ...psqlArgs,
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--command",
    "SELECT COALESCE(pg_catalog.shobj_description(oid, 'pg_database'), '') FROM pg_catalog.pg_database WHERE datname = pg_catalog.current_database()",
  ]);
  return result.stdout.trim();
}

function verifyBaselineDatabase(database) {
  runPsql(
    `${database} baseline inventory`,
    psqlArgs,
    database,
    `SELECT pg_catalog.set_config('f0.expected_database', '${database}', false);
SELECT pg_catalog.set_config('f0.allowed_database', 'agent_ads_f0', false);
${clusterGuard}`,
  );
}

for (const database of ["postgres", "template1", "agent_ads_f0"]) {
  verifyBaselineDatabase(database);
}
if (readMarker() !== expectedMarker) {
  throw new Error("The mark-guard target must have its exact server-side disposable marker before setup writes.");
}

function expectScriptFailure(label, script, expectedMessage) {
  const result = spawnSync(psql, [
    ...psqlArgs,
    "--set",
    `f0_marker=${marker}`,
    "--set",
    `f0_mutex_token=${context.mutex.token}`,
    "--file",
    script,
  ], {
    cwd: root,
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = safeOutput(result);
  if (!result.error && result.status === 0) throw new Error(`${label} unexpectedly succeeded.`);
  if (!output.includes(expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} failed without the expected guard message.`);
  }
}

let hiddenDatabaseCreated = false;
try {
  runSql("Hidden database creation", `CREATE DATABASE "${hiddenDatabase}" TEMPLATE template1`);
  hiddenDatabaseCreated = true;
  runSql("Hidden database disable", `ALTER DATABASE "${hiddenDatabase}" WITH ALLOW_CONNECTIONS false`);

  expectScriptFailure(
    "Dirty-database marking",
    markScript,
    "F0 disposable guard found an unexpected database",
  );
  if (readMarker() !== expectedMarker) {
    throw new Error("Failed dirty-target marking changed the existing database marker.");
  }
} finally {
  if (hiddenDatabaseCreated) {
    runSql("Hidden database cleanup", `DROP DATABASE "${hiddenDatabase}" WITH (FORCE)`);
  }
}

let templateSchemaCreated = false;
try {
  runSql("Template schema creation", `CREATE SCHEMA "${templateSchema}"`, "template1");
  templateSchemaCreated = true;
  expectScriptFailure(
    "Dirty-template marking",
    markScript,
    "F0 disposable guard found an unexpected schema",
  );
  if (readMarker() !== expectedMarker) {
    throw new Error("Failed dirty-template marking changed the existing database marker.");
  }
} finally {
  if (templateSchemaCreated) {
    runSql("Template schema cleanup", `DROP SCHEMA "${templateSchema}" CASCADE`, "template1");
  }
}

if (readMarker() !== expectedMarker) throw new Error("The mark-guard proof changed the database marker.");

console.log("F0 mark guard proof passed: dirty-database and dirty-template re-marking failed while preserving the marker.");
