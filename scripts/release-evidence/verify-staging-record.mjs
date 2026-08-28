import { lstatSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  containsPercentDecodedSecretMaterial,
  containsSecretMaterial,
  REQUIRED_STAGING_CHECK_IDS,
  STAGING_CHECK_CONTRACT,
  stagingEvidenceRecordSchema,
} from "./staging-record-schema.mjs";

const MAX_RECORD_BYTES = 128 * 1024;
const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_OBSERVATION_AGE_MS = Object.freeze({
  CI_EXACT_COMMIT: 24 * HOUR_MS,
  TARGET_FINGERPRINT: 24 * HOUR_MS,
  MIGRATION_HEAD: 24 * HOUR_MS,
  TENANT_ISOLATION_RLS: 24 * HOUR_MS,
  RUNTIME_ROLE: 24 * HOUR_MS,
  SECRET_BROKER_VAULT: 24 * HOUR_MS,
  SUPAVISOR_RUNTIME: 24 * HOUR_MS,
  AUTH_SESSION_AAL2: 24 * HOUR_MS,
  STORAGE_PRIVATE_RECOVERY: 30 * DAY_MS,
  EMAIL_TEST_MODE: 24 * HOUR_MS,
  EXTERNAL_OPERATIONS_DISABLED: 24 * HOUR_MS,
  RECOVERY_SET: 7 * DAY_MS,
  RESTORE_DRILL: 30 * DAY_MS,
  READ_ONLY_CONNECTOR_CANARY: 24 * HOUR_MS,
  BROWSER_DESKTOP: 24 * HOUR_MS,
  BROWSER_MOBILE: 24 * HOUR_MS,
  UI_STATES: 24 * HOUR_MS,
  ACCESSIBILITY: 24 * HOUR_MS,
  CONSOLE_ERRORS: 24 * HOUR_MS,
  NETWORK_ERRORS: 24 * HOUR_MS,
  SECURITY_HEADERS: 24 * HOUR_MS,
  ROLLBACK: 7 * DAY_MS,
});
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const ZERO_SHA = "0".repeat(40);
const VERIFIER_FILE = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = realpathSync(path.resolve(path.dirname(VERIFIER_FILE), "..", ".."));
const TRUST_ANCHOR_PATHS = Object.freeze([
  ".gitignore",
  "scripts/release-evidence/staging-record-schema.mjs",
  "scripts/release-evidence/verify-staging-record.mjs",
]);

const gitEnvironment = Object.freeze(Object.assign(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key)),
  ),
  {
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  },
));

class StagingEvidenceError extends Error {
  constructor(code, paths = []) {
    super(code);
    this.code = code;
    this.paths = paths;
  }
}

function fail(code, paths = []) {
  throw new StagingEvidenceError(code, paths);
}

function parseArguments(args) {
  if (args.length === 0) fail("STAGING_EVIDENCE_PATH_REQUIRED");
  if (args.length < 3 || args[1] !== "--expected-revision") {
    fail("STAGING_EVIDENCE_REVISION_REQUIRED");
  }
  if (args.length !== 3) {
    fail("STAGING_EVIDENCE_ARGUMENT_INVALID");
  }
  if (!SHA_PATTERN.test(args[2]) || args[2] === ZERO_SHA) fail("STAGING_EVIDENCE_REVISION_INVALID");
  return { recordPath: args[0], expectedRevision: args[2] };
}

function runGit(args) {
  return spawnSync("git", ["-C", REPOSITORY_ROOT, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: gitEnvironment,
    windowsHide: true,
    maxBuffer: 64 * 1024,
  });
}

function resolveHeadRevision() {
  const topLevel = runGit(["rev-parse", "--show-toplevel"]);
  if (topLevel.status !== 0) fail("STAGING_EVIDENCE_REPOSITORY_INVALID");
  let resolvedTopLevel;
  try {
    resolvedTopLevel = realpathSync(topLevel.stdout.trim());
  } catch {
    fail("STAGING_EVIDENCE_REPOSITORY_INVALID");
  }
  if (resolvedTopLevel !== REPOSITORY_ROOT) fail("STAGING_EVIDENCE_REPOSITORY_INVALID");

  const head = runGit(["rev-parse", "--verify", "HEAD"]);
  const revision = head.status === 0 ? head.stdout.trim() : "";
  if (!SHA_PATTERN.test(revision) || revision === ZERO_SHA) fail("STAGING_EVIDENCE_HEAD_UNAVAILABLE");
  return revision;
}

function isOutside(base, target) {
  const relative = path.relative(base, target);
  return path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`);
}

function requireTrustAnchorsMatchHead() {
  const tracked = runGit(["ls-files", "--error-unmatch", "--", ...TRUST_ANCHOR_PATHS]);
  if (tracked.status === 1) fail("STAGING_EVIDENCE_TRUST_ANCHOR_UNTRACKED", TRUST_ANCHOR_PATHS);
  if (tracked.status !== 0) fail("STAGING_EVIDENCE_REPOSITORY_INVALID");
  const trackedPaths = new Set(tracked.stdout.split(/\r?\n/u).filter(Boolean));
  const missing = TRUST_ANCHOR_PATHS.filter((relative) => !trackedPaths.has(relative));
  if (missing.length > 0) fail("STAGING_EVIDENCE_TRUST_ANCHOR_UNTRACKED", missing);

  for (const relative of TRUST_ANCHOR_PATHS) {
    const candidate = path.join(REPOSITORY_ROOT, ...relative.split("/"));
    try {
      const fileStat = lstatSync(candidate);
      if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
        fail("STAGING_EVIDENCE_TRUST_ANCHOR_INVALID", [relative]);
      }
      const resolved = realpathSync(candidate);
      if (isOutside(REPOSITORY_ROOT, resolved)) {
        fail("STAGING_EVIDENCE_TRUST_ANCHOR_INVALID", [relative]);
      }
    } catch (error) {
      if (error instanceof StagingEvidenceError) throw error;
      fail("STAGING_EVIDENCE_TRUST_ANCHOR_INVALID", [relative]);
    }
  }

  const difference = runGit([
    "diff",
    "--quiet",
    "--no-ext-diff",
    "HEAD",
    "--",
    ...TRUST_ANCHOR_PATHS,
  ]);
  if (difference.status === 1) fail("STAGING_EVIDENCE_TRUST_ANCHOR_MISMATCH", TRUST_ANCHOR_PATHS);
  if (difference.status !== 0) fail("STAGING_EVIDENCE_REPOSITORY_INVALID");
}

function requireIgnoredPath(candidate) {
  const relative = path.relative(REPOSITORY_ROOT, candidate).split(path.sep).join("/");
  const tracked = runGit(["ls-files", "--error-unmatch", "--", relative]);
  if (tracked.status === 0) fail("STAGING_EVIDENCE_PATH_TRACKED");
  if (tracked.status !== 1) fail("STAGING_EVIDENCE_REPOSITORY_INVALID");

  const ignored = runGit(["check-ignore", "--no-index", "-v", "--", relative]);
  if (ignored.status !== 0) fail("STAGING_EVIDENCE_PATH_NOT_IGNORED");
  const rule = ignored.stdout.split("\t", 1)[0];
  if (!/^\.gitignore:\d+:docs\/temp\/release-evidence\/$/u.test(rule)) {
    fail("STAGING_EVIDENCE_PATH_NOT_REPOSITORY_IGNORED");
  }
}

function readApprovedRecord(recordPath) {
  const root = REPOSITORY_ROOT;
  const allowedRoot = path.join(root, "docs", "temp", "release-evidence");
  const candidate = path.resolve(root, recordPath);
  if (isOutside(allowedRoot, candidate)) fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");
  if (path.extname(candidate).toLowerCase() !== ".json") fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");

  let fileStat;
  try {
    fileStat = lstatSync(candidate);
  } catch {
    fail("STAGING_EVIDENCE_FILE_UNREADABLE");
  }
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");
  if (fileStat.size > MAX_RECORD_BYTES) fail("STAGING_EVIDENCE_FILE_TOO_LARGE");

  let resolved;
  try {
    resolved = realpathSync(candidate);
  } catch {
    fail("STAGING_EVIDENCE_FILE_UNREADABLE");
  }
  if (isOutside(allowedRoot, resolved)) fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");
  requireIgnoredPath(resolved);

  try {
    return readFileSync(resolved, "utf8");
  } catch {
    fail("STAGING_EVIDENCE_FILE_UNREADABLE");
  }
}

function parseJsonWithoutDuplicateKeys(raw) {
  let index = 0;

  function skipWhitespace() {
    while (index < raw.length && /[\t\n\r ]/u.test(raw[index])) index += 1;
  }

  function parseString() {
    if (raw[index] !== '"') fail("STAGING_EVIDENCE_JSON_INVALID");
    const start = index;
    index += 1;
    while (index < raw.length) {
      const character = raw[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(raw.slice(start, index));
        } catch {
          fail("STAGING_EVIDENCE_JSON_INVALID");
        }
      }
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character.charCodeAt(0) < 0x20) fail("STAGING_EVIDENCE_JSON_INVALID");
      index += 1;
    }
    fail("STAGING_EVIDENCE_JSON_INVALID");
  }

  function parsePrimitive() {
    const start = index;
    while (index < raw.length && !/[\t\n\r ,\]}]/u.test(raw[index])) index += 1;
    if (index === start) fail("STAGING_EVIDENCE_JSON_INVALID");
  }

  function parseArray(depth) {
    index += 1;
    skipWhitespace();
    if (raw[index] === "]") {
      index += 1;
      return;
    }
    while (index < raw.length) {
      parseValue(depth + 1);
      skipWhitespace();
      if (raw[index] === "]") {
        index += 1;
        return;
      }
      if (raw[index] !== ",") fail("STAGING_EVIDENCE_JSON_INVALID");
      index += 1;
      skipWhitespace();
    }
    fail("STAGING_EVIDENCE_JSON_INVALID");
  }

  function parseObject(depth) {
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (raw[index] === "}") {
      index += 1;
      return;
    }
    while (index < raw.length) {
      const key = parseString();
      if (keys.has(key)) fail("STAGING_EVIDENCE_DUPLICATE_OBJECT_KEY");
      keys.add(key);
      skipWhitespace();
      if (raw[index] !== ":") fail("STAGING_EVIDENCE_JSON_INVALID");
      index += 1;
      parseValue(depth + 1);
      skipWhitespace();
      if (raw[index] === "}") {
        index += 1;
        return;
      }
      if (raw[index] !== ",") fail("STAGING_EVIDENCE_JSON_INVALID");
      index += 1;
      skipWhitespace();
    }
    fail("STAGING_EVIDENCE_JSON_INVALID");
  }

  function parseValue(depth) {
    if (depth > 100) fail("STAGING_EVIDENCE_JSON_INVALID");
    skipWhitespace();
    if (index >= raw.length) fail("STAGING_EVIDENCE_JSON_INVALID");
    if (raw[index] === "{") return parseObject(depth);
    if (raw[index] === "[") return parseArray(depth);
    if (raw[index] === '"') {
      parseString();
      return;
    }
    parsePrimitive();
  }

  parseValue(0);
  skipWhitespace();
  if (index !== raw.length) fail("STAGING_EVIDENCE_JSON_INVALID");

  let candidate;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("STAGING_EVIDENCE_JSON_INVALID");
  }
  return candidate;
}

function decodedValueContainsSecret(value) {
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current === "string") {
      if (containsSecretMaterial(current) || containsPercentDecodedSecretMaterial(current)) return true;
      continue;
    }
    if (!current || typeof current !== "object") continue;
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    for (const [key, nested] of Object.entries(current)) {
      if (containsSecretMaterial(`${key}:`)) return true;
      pending.push(nested);
    }
  }
  return false;
}

function parseRecord(raw) {
  const candidate = parseJsonWithoutDuplicateKeys(raw);
  if (containsSecretMaterial(raw) || decodedValueContainsSecret(candidate)) {
    fail("STAGING_EVIDENCE_SECRET_MATERIAL");
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) || candidate.schemaVersion !== 1) {
    fail("STAGING_EVIDENCE_SCHEMA_UNSUPPORTED");
  }

  const parsed = stagingEvidenceRecordSchema.safeParse(candidate);
  if (!parsed.success) {
    const paths = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].slice(0, 20);
    fail("STAGING_EVIDENCE_SCHEMA_INVALID", paths);
  }
  return parsed.data;
}

function valuesMatch(actual, expected) {
  return Array.isArray(expected)
    ? Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index])
    : actual === expected;
}

function validateCheckContracts(record) {
  const mismatchPaths = [];
  for (const [index, check] of record.checks.entries()) {
    const contract = STAGING_CHECK_CONTRACT[check.id];
    for (const field of ["requirementIds", "gate", "ownerRole", "implementationRef", "testRef"]) {
      if (!valuesMatch(check[field], contract[field])) mismatchPaths.push(`checks.${index}.${field}`);
    }
  }
  if (mismatchPaths.length > 0) fail("STAGING_EVIDENCE_CHECK_CONTRACT_MISMATCH", mismatchPaths);
}

function resolveLatestTrackedMigrationHead() {
  const tree = runGit(["ls-tree", "-r", "--name-only", "HEAD", "--", "prisma/migrations"]);
  if (tree.status !== 0) fail("STAGING_EVIDENCE_MIGRATION_NOT_FOUND");
  const migrationHeads = tree.stdout
    .split(/\r?\n/u)
    .map((entry) => /^prisma\/migrations\/(\d{14}_[a-z0-9_]+)\/migration\.sql$/u.exec(entry)?.[1])
    .filter(Boolean)
    .sort();
  if (migrationHeads.length === 0) fail("STAGING_EVIDENCE_MIGRATION_NOT_FOUND");
  return migrationHeads.at(-1);
}

function requireMigrationDirectory(migrationHead) {
  const latestTrackedMigrationHead = resolveLatestTrackedMigrationHead();
  if (migrationHead !== latestTrackedMigrationHead) {
    fail("STAGING_EVIDENCE_MIGRATION_NOT_LATEST", [
      "target.expectedMigrationHead",
      "target.currentMigrationHead",
    ]);
  }

  const migrationDirectory = path.join(REPOSITORY_ROOT, "prisma", "migrations", migrationHead);
  const migrationFile = path.join(migrationDirectory, "migration.sql");
  const migrationPath = `prisma/migrations/${migrationHead}/migration.sql`;
  try {
    const directoryStat = lstatSync(migrationDirectory);
    const fileStat = lstatSync(migrationFile);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || !fileStat.isFile() || fileStat.isSymbolicLink()) {
      fail("STAGING_EVIDENCE_MIGRATION_NOT_FOUND");
    }
  } catch (error) {
    if (error instanceof StagingEvidenceError) throw error;
    fail("STAGING_EVIDENCE_MIGRATION_NOT_FOUND");
  }

  const localHash = runGit(["hash-object", "--", migrationPath]);
  const headHash = runGit(["rev-parse", `HEAD:${migrationPath}`]);
  if (localHash.status !== 0 || headHash.status !== 0 || localHash.stdout.trim() !== headHash.stdout.trim()) {
    fail("STAGING_EVIDENCE_MIGRATION_WORKTREE_MISMATCH");
  }
}

function validateTimes(record, now) {
  const recordedAt = Date.parse(record.recordedAt);
  const validUntil = Date.parse(record.validUntil);
  if (now - recordedAt > MAX_RECORD_AGE_MS) fail("STAGING_EVIDENCE_RECORDED_AT_STALE", ["recordedAt"]);
  if (recordedAt - now > MAX_FUTURE_SKEW_MS) fail("STAGING_EVIDENCE_RECORDED_AT_FUTURE", ["recordedAt"]);
  if (validUntil <= recordedAt || validUntil - recordedAt > MAX_RECORD_AGE_MS) {
    fail("STAGING_EVIDENCE_VALIDITY_INVALID", ["recordedAt", "validUntil"]);
  }
  if (now >= validUntil) fail("STAGING_EVIDENCE_RECORD_EXPIRED", ["validUntil"]);

  const futureObservations = [];
  const staleObservations = [];
  for (const [index, check] of record.checks.entries()) {
    if (check.status !== "pass" || !check.observedAt) continue;
    const observedAt = Date.parse(check.observedAt);
    if (observedAt > recordedAt) futureObservations.push(`checks.${index}.observedAt`);
    if (now - observedAt > MAX_OBSERVATION_AGE_MS[check.id]) {
      staleObservations.push(`checks.${index}.observedAt`);
    }
  }
  if (futureObservations.length > 0) fail("STAGING_EVIDENCE_OBSERVATION_FUTURE", futureObservations);
  if (staleObservations.length > 0) fail("STAGING_EVIDENCE_OBSERVATION_STALE", staleObservations);
}

function validateDeclarations(record, expectedRevision, now) {
  const indexesById = new Map();
  for (const [index, check] of record.checks.entries()) {
    const indexes = indexesById.get(check.id) ?? [];
    indexes.push(index);
    indexesById.set(check.id, indexes);
  }

  const duplicatePaths = [...indexesById.values()]
    .filter((indexes) => indexes.length > 1)
    .flatMap((indexes) => indexes.map((index) => `checks.${index}.id`));
  if (duplicatePaths.length > 0) fail("STAGING_EVIDENCE_CHECK_DUPLICATE", duplicatePaths);

  const missing = REQUIRED_STAGING_CHECK_IDS.filter((id) => !indexesById.has(id));
  if (missing.length > 0) fail("STAGING_EVIDENCE_REQUIRED_CHECK_MISSING", missing.map((id) => `checks.${id}`));

  validateCheckContracts(record);

  if (record.source.gitRevision === ZERO_SHA) fail("STAGING_EVIDENCE_REVISION_INVALID", ["source.gitRevision"]);
  if (record.source.gitRevision !== expectedRevision) {
    fail("STAGING_EVIDENCE_REVISION_MISMATCH", ["source.gitRevision"]);
  }
  if (record.target.expectedMigrationHead !== record.target.currentMigrationHead) {
    fail("STAGING_EVIDENCE_MIGRATION_MISMATCH", [
      "target.expectedMigrationHead",
      "target.currentMigrationHead",
    ]);
  }
  requireMigrationDirectory(record.target.expectedMigrationHead);
  validateTimes(record, now);

  const missingPassEvidence = record.checks.flatMap((check, index) => (
    check.status === "pass" && (!check.observedAt || !check.evidenceRef)
      ? [`checks.${index}`]
      : []
  ));
  if (missingPassEvidence.length > 0) {
    fail("STAGING_EVIDENCE_PASS_WITHOUT_REFERENCE", missingPassEvidence);
  }

  const passingLimitations = record.checks.flatMap((check, index) => (
    check.status === "pass" && check.limitationCodes.length > 0
      ? [`checks.${index}.limitationCodes`]
      : []
  ));
  if (passingLimitations.length > 0) fail("STAGING_EVIDENCE_PASS_WITH_LIMITATION", passingLimitations);

  const unresolved = record.checks.flatMap((check, index) => (
    check.status === "pass" ? [] : [`checks.${index}.status`]
  ));
  if (unresolved.length > 0) fail("STAGING_EVIDENCE_CHECK_UNRESOLVED", unresolved);
}

export function verifyStagingEvidenceFile(args) {
  const { recordPath, expectedRevision } = parseArguments(args);
  const headRevision = resolveHeadRevision();
  if (expectedRevision !== headRevision) fail("STAGING_EVIDENCE_HEAD_MISMATCH");
  requireTrustAnchorsMatchHead();
  const record = parseRecord(readApprovedRecord(recordPath));
  validateDeclarations(record, expectedRevision, Date.now());
  return {
    code: "STAGING_EVIDENCE_RECORD_VALID",
    recordValid: true,
    declaredChecksComplete: true,
    externalSystemsVerified: false,
    checkCount: record.checks.length,
  };
}

function emitFailure(error) {
  const failure = error instanceof StagingEvidenceError
    ? error
    : new StagingEvidenceError("STAGING_EVIDENCE_INTERNAL_ERROR");
  const output = {
    code: failure.code,
    recordValid: false,
    declaredChecksComplete: false,
    externalSystemsVerified: false,
    ...(failure.paths.length > 0 ? { paths: failure.paths } : {}),
  };
  console.error(JSON.stringify(output));
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === VERIFIER_FILE) {
  try {
    console.log(JSON.stringify(verifyStagingEvidenceFile(process.argv.slice(2))));
  } catch (error) {
    emitFailure(error);
  }
}
