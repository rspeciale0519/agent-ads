import { lstatSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fail, StagingEvidenceError } from "./staging-evidence-error.mjs";

const MAX_RECORD_BYTES = 128 * 1024;
const MODULE_FILE = fileURLToPath(import.meta.url);

export const REPOSITORY_ROOT = realpathSync(
  path.resolve(path.dirname(MODULE_FILE), "..", ".."),
);

const TRUST_ANCHOR_PATHS = Object.freeze([
  ".gitignore",
  "package.json",
  "scripts/release-evidence/capture-staging-runtime-result.mjs",
  "scripts/release-evidence/check-staging-runtime-config.mjs",
  "scripts/release-evidence/staging-evidence-error.mjs",
  "scripts/release-evidence/staging-evidence-repository.mjs",
  "scripts/release-evidence/staging-evidence-validation.mjs",
  "scripts/release-evidence/staging-record-schema.mjs",
  "scripts/release-evidence/staging-runtime-environment-policy.mjs",
  "scripts/release-evidence/staging-runtime-targets.mjs",
  "scripts/release-evidence/strict-json.mjs",
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

function runGit(args) {
  return spawnSync("git", ["-C", REPOSITORY_ROOT, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: gitEnvironment,
    windowsHide: true,
    maxBuffer: 64 * 1024,
  });
}

function isOutside(base, target) {
  const relative = path.relative(base, target);
  return path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`);
}

export function resolveHeadRevision() {
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
  if (!/^[0-9a-f]{40}$/u.test(revision) || revision === "0".repeat(40)) {
    fail("STAGING_EVIDENCE_HEAD_UNAVAILABLE");
  }
  return revision;
}

export function requireTrustAnchorsMatchHead() {
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
  if (difference.status === 1) {
    fail("STAGING_EVIDENCE_TRUST_ANCHOR_MISMATCH", TRUST_ANCHOR_PATHS);
  }
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

export function readApprovedRecord(recordPath) {
  const allowedRoot = path.join(REPOSITORY_ROOT, "docs", "temp", "release-evidence");
  const candidate = path.resolve(REPOSITORY_ROOT, recordPath);
  if (isOutside(allowedRoot, candidate)) fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");
  if (path.extname(candidate).toLowerCase() !== ".json") {
    fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");
  }

  let fileStat;
  try {
    fileStat = lstatSync(candidate);
  } catch {
    fail("STAGING_EVIDENCE_FILE_UNREADABLE");
  }
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    fail("STAGING_EVIDENCE_PATH_NOT_ALLOWED");
  }
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

export function requireMigrationDirectory(migrationHead) {
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
    if (
      !directoryStat.isDirectory()
      || directoryStat.isSymbolicLink()
      || !fileStat.isFile()
      || fileStat.isSymbolicLink()
    ) {
      fail("STAGING_EVIDENCE_MIGRATION_NOT_FOUND");
    }
  } catch (error) {
    if (error instanceof StagingEvidenceError) throw error;
    fail("STAGING_EVIDENCE_MIGRATION_NOT_FOUND");
  }

  const localHash = runGit(["hash-object", "--", migrationPath]);
  const headHash = runGit(["rev-parse", `HEAD:${migrationPath}`]);
  if (
    localHash.status !== 0
    || headHash.status !== 0
    || localHash.stdout.trim() !== headHash.stdout.trim()
  ) {
    fail("STAGING_EVIDENCE_MIGRATION_WORKTREE_MISMATCH");
  }
}
