import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNetworkProofMutex,
  networkDatabaseEnvironment,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
assertNetworkProofMutex(context);
const { databaseUrl, marker, psql, spawnEnvironment } = context;
const guardEnvironment = networkDatabaseEnvironment(
  context,
  "agent_ads_f0",
  { trustedCatalogs: true },
);
const psqlEnvironment = networkDatabaseEnvironment(context, "agent_ads_f0");

function run(label, command, args, env = spawnEnvironment) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}.`);
}

const psqlArgs = psqlBaseArguments();
const markerResult = spawnSync(psql, [
  ...psqlArgs,
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--command",
  "SELECT pg_catalog.shobj_description(oid, 'pg_database') FROM pg_catalog.pg_database WHERE datname = pg_catalog.current_database()",
], {
  cwd: root,
  encoding: "utf8",
  env: guardEnvironment,
  maxBuffer: 10 * 1024 * 1024,
});
if (
  markerResult.error
  || markerResult.status !== 0
  || markerResult.stdout.trim() !== `agent_ads_f0_disposable:${marker}`
) {
  throw new Error("F0 network target marker is missing or incorrect.");
}
run(
  "F0 disposable-target verification",
  psql,
  [
    ...psqlArgs,
    "--set",
    `f0_marker=${marker}`,
    "--file",
    path.join(root, "scripts", "f0", "verify-disposable.sql"),
  ],
  guardEnvironment,
);
run(
  "F0 bootstrap",
  psql,
  [...psqlArgs, "--file", path.join(root, "scripts", "f0", "bootstrap.sql")],
  psqlEnvironment,
);
run(
  "Prisma legacy baseline resolution",
  process.execPath,
  [
    path.join(root, "node_modules", "prisma", "build", "index.js"),
    "migrate",
    "resolve",
    "--applied",
    "00000000000000_legacy_baseline",
  ],
  { ...spawnEnvironment, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
);
run(
  "Prisma migration deployment",
  process.execPath,
  [path.join(root, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
  { ...spawnEnvironment, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
);
run(
  "F0 assertions",
  psql,
  [...psqlArgs, "--file", path.join(root, "scripts", "f0", "assertions.sql")],
  psqlEnvironment,
);
run(
  "F0 tenant-role proof",
  psql,
  [...psqlArgs, "--file", path.join(root, "scripts", "f0", "tenant-role-proof.sql")],
  psqlEnvironment,
);

const historyResult = spawnSync(psql, [
  ...psqlArgs,
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--field-separator=\t",
  "--command",
  "SELECT migration_name, checksum, finished_at IS NOT NULL, rolled_back_at IS NULL FROM public._prisma_migrations ORDER BY migration_name",
], {
  cwd: root,
  encoding: "utf8",
  env: psqlEnvironment,
  maxBuffer: 10 * 1024 * 1024,
});
if (historyResult.error || historyResult.status !== 0) throw new Error("Prisma migration history query failed.");

const migrationRoot = path.join(root, "prisma", "migrations");
const migrationNames = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const historyRows = historyResult.stdout.trim().split(/\r?\n/u).filter(Boolean);
const history = new Map(historyRows.map((line) => {
  const [name, checksum, finished, notRolledBack] = line.split("\t");
  return [name, { checksum, finished, notRolledBack }];
}));
if (historyRows.length !== migrationNames.length || history.size !== migrationNames.length) {
  throw new Error("Prisma migration history must contain exactly one row for each migration.");
}
for (const name of migrationNames) {
  const migrationFile = path.join(migrationRoot, name, "migration.sql");
  const expectedChecksum = createHash("sha256").update(readFileSync(migrationFile)).digest("hex");
  const applied = history.get(name);
  if (!applied || applied.checksum !== expectedChecksum || applied.finished !== "t" || applied.notRolledBack !== "t") {
    throw new Error(`Prisma migration history does not match ${name}.`);
  }
}

run("F0 upgrade proof", process.execPath, [path.join(root, "scripts", "f0", "upgrade-proof.mjs")]);

console.log("F0 fresh migration proof passed: marked empty target, Prisma history, UUID upgrades, permission-role login guards, foreign keys, indexes, forced RLS, tenant isolation, roles, and ownership are valid.");
