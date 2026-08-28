import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

function run(label, command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} failed with exit code ${result.status}.`);
}

const psql = process.env.PSQL_BIN || "psql";
const psqlArgs = ["-X", "--dbname", databaseUrl, "--set", "ON_ERROR_STOP=1"];
run("F0 disposable-target verification", psql, [...psqlArgs, "--set", `f0_marker=${marker}`, "--file", path.join(root, "scripts", "f0", "verify-disposable.sql")]);
run("F0 bootstrap", psql, [...psqlArgs, "--file", path.join(root, "scripts", "f0", "bootstrap.sql")]);
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
  { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
);
run(
  "Prisma migration deployment",
  process.execPath,
  [path.join(root, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
  { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
);
run("F0 assertions", psql, [...psqlArgs, "--file", path.join(root, "scripts", "f0", "assertions.sql")]);
run("F0 tenant-role proof", psql, [...psqlArgs, "--file", path.join(root, "scripts", "f0", "tenant-role-proof.sql")]);

const historyResult = spawnSync(psql, [
  ...psqlArgs,
  "--quiet",
  "--tuples-only",
  "--no-align",
  "--field-separator=\t",
  "--command",
  "SELECT migration_name, checksum, finished_at IS NOT NULL, rolled_back_at IS NULL FROM public._prisma_migrations ORDER BY migration_name",
], { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
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
