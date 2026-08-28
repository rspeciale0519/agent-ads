import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type FixtureCheck = {
  id: string;
  requirementIds: string[];
  gate: string;
  ownerRole: string;
  implementationRef: string;
  testRef: string;
  status: "pass" | "fail" | "blocked" | "not_run";
  observedAt: string | null;
  evidenceRef: string | null;
  limitationCodes: string[];
};

type FixtureRecord = {
  recordedAt: string;
  validUntil: string;
  source: {
    gitRevision: string;
    artifactIdentifier: string;
  };
  target: {
    expectedMigrationHead: string;
    currentMigrationHead: string;
  };
  checks: FixtureCheck[];
};

type VerifierOutput = {
  code: string;
  recordValid: boolean;
  declaredChecksComplete: boolean;
  externalSystemsVerified: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const sourceRoot = process.cwd();
const sourceVerifier = path.join(sourceRoot, "scripts", "release-evidence", "verify-staging-record.mjs");
const sourceSchema = path.join(sourceRoot, "scripts", "release-evidence", "staging-record-schema.mjs");
const example = path.join(sourceRoot, "docs", "development", "delivery", "staging-evidence-record.example.json");
const harnessRoot = path.join(sourceRoot, "docs", "temp", "release-evidence");
let root = "";
let verifier = "";
let schema = "";
let evidenceRoot = "";
let headRevision = "";
let testDirectory = "";

function fixture() {
  return JSON.parse(readFileSync(example, "utf8")) as FixtureRecord;
}

function freshFixture() {
  const record = fixture();
  const recordedAt = Date.now() - 60_000;
  record.recordedAt = new Date(recordedAt).toISOString();
  record.validUntil = new Date(recordedAt + (6 * DAY_MS)).toISOString();
  record.source.gitRevision = headRevision;
  return record;
}

function completeFixture() {
  const record = freshFixture();
  const observedAt = new Date(Date.parse(record.recordedAt) - 60_000).toISOString();
  record.checks = record.checks.map((check) => ({
    ...check,
    status: "pass" as const,
    observedAt,
    evidenceRef: `restricted:staging/evidence/${check.id.toLowerCase()}`,
    limitationCodes: [],
  }));
  return record;
}

function writeRaw(name: string, raw: string) {
  const file = path.join(testDirectory, name);
  writeFileSync(file, raw, "utf8");
  return file;
}

function writeFixture(name: string, record: FixtureRecord) {
  return writeRaw(name, `${JSON.stringify(record, null, 2)}\n`);
}

function runVerifier(
  file: string,
  expectedRevision: string | null = headRevision,
  cwd = root,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const args = [verifier, file];
  if (expectedRevision !== null) args.push("--expected-revision", expectedRevision);
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: environment,
    windowsHide: true,
  });
}

function outputOf(result: ReturnType<typeof runVerifier>) {
  const text = result.status === 0 ? result.stdout : result.stderr;
  return JSON.parse(text) as VerifierOutput;
}

function expectCode(result: ReturnType<typeof runVerifier>, code: string) {
  expect(result.status).toBe(code === "STAGING_EVIDENCE_RECORD_VALID" ? 0 : 1);
  expect(outputOf(result).code).toBe(code);
}

beforeAll(() => {
  mkdirSync(harnessRoot, { recursive: true });
  root = mkdtempSync(path.join(harnessRoot, "verifier-repository-"));
  verifier = path.join(root, "scripts", "release-evidence", "verify-staging-record.mjs");
  schema = path.join(root, "scripts", "release-evidence", "staging-record-schema.mjs");
  evidenceRoot = path.join(root, "docs", "temp", "release-evidence");
  mkdirSync(path.dirname(verifier), { recursive: true });
  copyFileSync(sourceVerifier, verifier);
  copyFileSync(sourceSchema, schema);
  writeFileSync(path.join(root, ".gitignore"), "docs/temp/release-evidence/\n", "utf8");

  const migrationHead = fixture().target.expectedMigrationHead;
  const migrationDirectory = path.join(root, "prisma", "migrations", migrationHead);
  mkdirSync(migrationDirectory, { recursive: true });
  copyFileSync(
    path.join(sourceRoot, "prisma", "migrations", migrationHead, "migration.sql"),
    path.join(migrationDirectory, "migration.sql"),
  );

  const git = (args: string[]) => spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  expect(git(["init"]).status).toBe(0);
  expect(git(["config", "user.name", "Verifier Test"]).status).toBe(0);
  expect(git(["config", "user.email", "verifier@example.invalid"]).status).toBe(0);
  expect(git(["config", "core.autocrlf", "false"]).status).toBe(0);
  expect(git(["add", ".gitignore", "scripts/release-evidence", "prisma/migrations"]).status).toBe(0);
  expect(git(["-c", "commit.gpgSign=false", "commit", "-m", "verifier fixture"]).status).toBe(0);
  const headResult = git(["rev-parse", "--verify", "HEAD"]);
  expect(headResult.status).toBe(0);
  headRevision = headResult.stdout.trim();
  expect(headRevision).toMatch(/^[0-9a-f]{40}$/u);
  mkdirSync(evidenceRoot, { recursive: true });
  testDirectory = mkdtempSync(path.join(evidenceRoot, "verifier-test-"));
}, 20_000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("staging evidence verifier", () => {
  it("validates current-commit declarations without claiming external verification", () => {
    const record = completeFixture();
    const file = writeFixture("valid.json", record);
    const result = runVerifier(file, headRevision, testDirectory);

    expect(result.status).toBe(0);
    expect(outputOf(result)).toMatchObject({
      code: "STAGING_EVIDENCE_RECORD_VALID",
      recordValid: true,
      declaredChecksComplete: true,
      externalSystemsVerified: false,
    });
  });

  it("ignores hostile Git environment redirects", () => {
    const file = writeFixture("hostile-git-environment.json", completeFixture());
    const hostileEnvironment = {
      ...process.env,
      GIT_DIR: path.join(testDirectory, "hostile-git-dir"),
      GIT_INDEX_FILE: path.join(testDirectory, "hostile-index"),
      GIT_OBJECT_DIRECTORY: path.join(testDirectory, "hostile-objects"),
      GIT_WORK_TREE: testDirectory,
    };
    expectCode(
      runVerifier(file, headRevision, testDirectory, hostileEnvironment),
      "STAGING_EVIDENCE_RECORD_VALID",
    );
  });

  it("rejects dirty verifier trust anchors", () => {
    const anchors = [path.join(root, ".gitignore"), schema, verifier];
    for (const [index, anchor] of anchors.entries()) {
      const original = readFileSync(anchor, "utf8");
      writeFileSync(anchor, `${original}\n`, "utf8");
      try {
        expectCode(
          runVerifier(writeFixture(`dirty-trust-anchor-${index}.json`, completeFixture())),
          "STAGING_EVIDENCE_TRUST_ANCHOR_MISMATCH",
        );
      } finally {
        writeFileSync(anchor, original, "utf8");
      }
    }
  }, 60_000);

  it("requires a current, nonzero expected revision", () => {
    const file = writeFixture("revision-required.json", completeFixture());
    expectCode(runVerifier(file, null), "STAGING_EVIDENCE_REVISION_REQUIRED");
    expectCode(runVerifier(file, "0".repeat(40)), "STAGING_EVIDENCE_REVISION_INVALID");

    const otherRevision = headRevision === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40);
    expectCode(runVerifier(file, otherRevision), "STAGING_EVIDENCE_HEAD_MISMATCH");
  });

  it("requires the record revision to match HEAD", () => {
    const zeroRecord = completeFixture();
    zeroRecord.source.gitRevision = "0".repeat(40);
    expectCode(
      runVerifier(writeFixture("zero-record-revision.json", zeroRecord)),
      "STAGING_EVIDENCE_REVISION_INVALID",
    );

    const mismatch = completeFixture();
    mismatch.source.gitRevision = headRevision === "a".repeat(40) ? "b".repeat(40) : "a".repeat(40);
    expectCode(
      runVerifier(writeFixture("record-revision-mismatch.json", mismatch)),
      "STAGING_EVIDENCE_REVISION_MISMATCH",
    );
  });

  it("restricts records to the private evidence directory and rejects traversal", () => {
    expectCode(runVerifier(example), "STAGING_EVIDENCE_PATH_NOT_ALLOWED");
    const traversal = path.join(evidenceRoot, "..", "escaped-record.json");
    expectCode(runVerifier(traversal), "STAGING_EVIDENCE_PATH_NOT_ALLOWED");

    const record = completeFixture();
    record.checks[0].evidenceRef = "../private/evidence.json";
    expectCode(
      runVerifier(writeFixture("reference-traversal.json", record)),
      "STAGING_EVIDENCE_SCHEMA_INVALID",
    );
  });

  it("keeps the synthetic incomplete example unresolved", () => {
    expectCode(
      runVerifier(writeFixture("incomplete-example.json", freshFixture())),
      "STAGING_EVIDENCE_CHECK_UNRESOLVED",
    );
  });

  it("rejects literal and decoded duplicate object keys", () => {
    const raw = JSON.stringify(completeFixture(), null, 2);
    const marker = '  "environment": "staging",';
    const literal = raw.replace(marker, `${marker}\n  "environment": "staging",`);
    expectCode(
      runVerifier(writeRaw("duplicate-key.json", literal)),
      "STAGING_EVIDENCE_DUPLICATE_OBJECT_KEY",
    );

    const escaped = raw.replace(marker, `${marker}\n  "environm\\u0065nt": "staging",`);
    expectCode(
      runVerifier(writeRaw("escaped-duplicate-key.json", escaped)),
      "STAGING_EVIDENCE_DUPLICATE_OBJECT_KEY",
    );
  });

  it("rejects supported secret token shapes without printing values", () => {
    const tokens = [
      `${["sb", "secret"].join("_")}_${"a".repeat(24)}`,
      `${"re"}_${"b".repeat(24)}`,
      `${["sk", "test"].join("_")}_${"c".repeat(24)}`,
      `${["sk", "live"].join("_")}_${"d".repeat(24)}`,
      `${"S"}G.${"e".repeat(16)}.${"f".repeat(16)}`,
      `${["github", "pat"].join("_")}_${"g".repeat(40)}`,
    ];

    tokens.forEach((token, index) => {
      const record = completeFixture();
      record.source.artifactIdentifier = token;
      const result = runVerifier(writeFixture(`secret-token-${index}.json`, record));
      expectCode(result, "STAGING_EVIDENCE_SECRET_MATERIAL");
      expect(result.stderr).not.toContain(token);
    });
  }, 20_000);

  it("rejects Unicode-escaped secrets without printing decoded values", () => {
    const record = completeFixture();
    const token = `${["sk", "live"].join("_")}_${"z".repeat(24)}`;
    record.source.artifactIdentifier = token;
    const encodedToken = `sk\\u005f${"live"}\\u005f${"z".repeat(24)}`;
    const raw = JSON.stringify(record, null, 2).replace(token, encodedToken);
    const result = runVerifier(writeRaw("unicode-secret.json", raw));

    expectCode(result, "STAGING_EVIDENCE_SECRET_MATERIAL");
    expect(result.stderr).not.toContain(token);
    expect(result.stderr).not.toContain("zzzzzzzzzzzzzzzzzzzzzzzz");
  });

  it("rejects percent-encoded secrets without printing decoded values", () => {
    const record = completeFixture();
    const token = `${["sk", "live"].join("_")}_${"y".repeat(24)}`;
    record.checks[0].evidenceRef = `https://evidence.example.invalid/${[...token]
      .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")}`;
    const result = runVerifier(writeFixture("percent-secret.json", record));

    expectCode(result, "STAGING_EVIDENCE_SECRET_MATERIAL");
    expect(result.stderr).not.toContain(token);
    expect(result.stderr).not.toContain("yyyyyyyyyyyyyyyyyyyyyyyy");
  });

  it("allows only exact safe reference forms", () => {
    const valid = completeFixture();
    valid.checks[0].evidenceRef = "https://evidence.example.invalid/staging/check.json";
    expectCode(runVerifier(writeFixture("https-reference.json", valid)), "STAGING_EVIDENCE_RECORD_VALID");

    const invalidReferences = [
      "HTTPS://evidence.example.invalid/check.json",
      "http://evidence.example.invalid/check.json",
      "ftp://evidence.example.invalid/check.json",
      "Restricted:staging/evidence/check.json",
      "https://evidence.example.invalid/path\u0000segment",
      "https://evidence.example.invalid/path\tsegment",
      "https://evidence.example.invalid/path\nsegment",
      "https://evidence.example.invalid/path\rsegment",
      "https://evidence.example.invalid/path\\segment",
      "https://evidence.example.invalid/%2e%2e/check.json",
      "https://evidence.example.invalid/%252e%252e/check.json",
    ];
    invalidReferences.forEach((reference, index) => {
      const record = completeFixture();
      record.checks[0].evidenceRef = reference;
      expectCode(
        runVerifier(writeFixture(`invalid-reference-${index}.json`, record)),
        "STAGING_EVIDENCE_SCHEMA_INVALID",
      );
    });

    const credentialReference = completeFixture();
    credentialReference.checks[0].evidenceRef = "https://user:password@evidence.example.invalid/check.json";
    expectCode(
      runVerifier(writeFixture("credential-reference.json", credentialReference)),
      "STAGING_EVIDENCE_SECRET_MATERIAL",
    );
  }, 60_000);

  it("does not let limitation codes approve checks", () => {
    const passing = completeFixture();
    passing.checks[0].limitationCodes = ["KNOWN_LIMITATION"];
    expectCode(
      runVerifier(writeFixture("passing-limitation.json", passing)),
      "STAGING_EVIDENCE_PASS_WITH_LIMITATION",
    );

    const blocked = completeFixture();
    blocked.checks[0] = {
      ...blocked.checks[0],
      status: "blocked",
      observedAt: null,
      evidenceRef: null,
      limitationCodes: ["KNOWN_LIMITATION"],
    };
    expectCode(
      runVerifier(writeFixture("blocked-limitation.json", blocked)),
      "STAGING_EVIDENCE_CHECK_UNRESOLVED",
    );
  });

  it("rejects invalid, stale, future, and expired record times", () => {
    const invalidDate = completeFixture();
    invalidDate.recordedAt = "2026-02-30T12:00:00Z";
    expectCode(
      runVerifier(writeFixture("invalid-calendar-date.json", invalidDate)),
      "STAGING_EVIDENCE_SCHEMA_INVALID",
    );

    const stale = completeFixture();
    stale.recordedAt = new Date(Date.now() - (7 * DAY_MS) - 60_000).toISOString();
    stale.validUntil = new Date(Date.parse(stale.recordedAt) + (7 * DAY_MS)).toISOString();
    expectCode(runVerifier(writeFixture("stale-record.json", stale)), "STAGING_EVIDENCE_RECORDED_AT_STALE");

    const future = completeFixture();
    future.recordedAt = new Date(Date.now() + (6 * 60_000)).toISOString();
    future.validUntil = new Date(Date.parse(future.recordedAt) + DAY_MS).toISOString();
    expectCode(runVerifier(writeFixture("future-record.json", future)), "STAGING_EVIDENCE_RECORDED_AT_FUTURE");

    const expired = completeFixture();
    expired.recordedAt = new Date(Date.now() - (2 * DAY_MS)).toISOString();
    expired.validUntil = new Date(Date.now() - DAY_MS).toISOString();
    expectCode(runVerifier(writeFixture("expired-record.json", expired)), "STAGING_EVIDENCE_RECORD_EXPIRED");
  }, 20_000);

  it("rejects invalid validity and observation chronology", () => {
    const chronology = completeFixture();
    chronology.validUntil = chronology.recordedAt;
    expectCode(runVerifier(writeFixture("invalid-chronology.json", chronology)), "STAGING_EVIDENCE_VALIDITY_INVALID");

    const tooLong = completeFixture();
    tooLong.validUntil = new Date(Date.parse(tooLong.recordedAt) + (7 * DAY_MS) + 1_000).toISOString();
    expectCode(runVerifier(writeFixture("validity-too-long.json", tooLong)), "STAGING_EVIDENCE_VALIDITY_INVALID");

    const futureObservation = completeFixture();
    futureObservation.checks[0].observedAt = new Date(Date.parse(futureObservation.recordedAt) + 1_000).toISOString();
    expectCode(
      runVerifier(writeFixture("future-observation.json", futureObservation)),
      "STAGING_EVIDENCE_OBSERVATION_FUTURE",
    );

    const staleObservation = completeFixture();
    staleObservation.checks[0].observedAt = new Date(Date.parse(staleObservation.recordedAt) - (90 * DAY_MS) - 1_000).toISOString();
    expectCode(
      runVerifier(writeFixture("stale-observation.json", staleObservation)),
      "STAGING_EVIDENCE_OBSERVATION_STALE",
    );
  }, 20_000);

  it("uses short check-specific observation freshness limits", () => {
    const browserStale = completeFixture();
    const browserIndex = browserStale.checks.findIndex((check) => check.id === "BROWSER_DESKTOP");
    browserStale.checks[browserIndex].observedAt = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString();
    expectCode(
      runVerifier(writeFixture("browser-evidence-stale.json", browserStale)),
      "STAGING_EVIDENCE_OBSERVATION_STALE",
    );

    const recentRestoreDrill = completeFixture();
    const restoreIndex = recentRestoreDrill.checks.findIndex((check) => check.id === "RESTORE_DRILL");
    recentRestoreDrill.checks[restoreIndex].observedAt = new Date(Date.now() - (25 * 60 * 60 * 1000)).toISOString();
    expectCode(
      runVerifier(writeFixture("restore-evidence-recent.json", recentRestoreDrill)),
      "STAGING_EVIDENCE_RECORD_VALID",
    );
  }, 15_000);

  it("enforces every fixed check-contract field", () => {
    const mutations: Array<(check: FixtureCheck) => void> = [
      (check) => { check.requirementIds = ["OPS-005"]; },
      (check) => { check.gate = "F0"; },
      (check) => { check.ownerRole = "database-owner"; },
      (check) => { check.implementationRef = "scripts/other-check.mjs"; },
      (check) => { check.testRef = "restricted:staging/test-plan/other-check"; },
    ];

    mutations.forEach((mutate, index) => {
      const record = completeFixture();
      mutate(record.checks[0]);
      expectCode(
        runVerifier(writeFixture(`contract-mismatch-${index}.json`, record)),
        "STAGING_EVIDENCE_CHECK_CONTRACT_MISMATCH",
      );
    });
  }, 20_000);

  it("requires a valid migration head present in this checkout", () => {
    const mismatch = completeFixture();
    mismatch.target.currentMigrationHead = "20990101000000_other_migration";
    expectCode(
      runVerifier(writeFixture("migration-mismatch.json", mismatch)),
      "STAGING_EVIDENCE_MIGRATION_MISMATCH",
    );

    const invalid = completeFixture();
    invalid.target.expectedMigrationHead = "invalid-migration";
    invalid.target.currentMigrationHead = "invalid-migration";
    expectCode(
      runVerifier(writeFixture("invalid-migration.json", invalid)),
      "STAGING_EVIDENCE_SCHEMA_INVALID",
    );

    const missing = completeFixture();
    missing.target.expectedMigrationHead = "20990101000000_missing_migration";
    missing.target.currentMigrationHead = "20990101000000_missing_migration";
    expectCode(
      runVerifier(writeFixture("missing-migration.json", missing)),
      "STAGING_EVIDENCE_MIGRATION_NOT_LATEST",
    );

    const historical = completeFixture();
    historical.target.expectedMigrationHead = "00000000000000_legacy_baseline";
    historical.target.currentMigrationHead = "00000000000000_legacy_baseline";
    expectCode(
      runVerifier(writeFixture("historical-migration.json", historical)),
      "STAGING_EVIDENCE_MIGRATION_NOT_LATEST",
    );
  }, 20_000);

  it("rejects an untracked migration directory", () => {
    const untrackedHead = `20990101000000_untracked_${process.pid}`;
    const untrackedDirectory = path.join(root, "prisma", "migrations", untrackedHead);
    mkdirSync(untrackedDirectory);
    writeFileSync(path.join(untrackedDirectory, "migration.sql"), "SELECT 1;\n", "utf8");
    try {
      const record = completeFixture();
      record.target.expectedMigrationHead = untrackedHead;
      record.target.currentMigrationHead = untrackedHead;
      expectCode(
        runVerifier(writeFixture("untracked-migration.json", record)),
        "STAGING_EVIDENCE_MIGRATION_NOT_LATEST",
      );
    } finally {
      rmSync(untrackedDirectory, { recursive: true, force: true });
    }
  });

  it("rejects missing checks, duplicate checks, and passes without evidence", () => {
    const missing = completeFixture();
    missing.checks.pop();
    expectCode(
      runVerifier(writeFixture("missing-check.json", missing)),
      "STAGING_EVIDENCE_REQUIRED_CHECK_MISSING",
    );

    const duplicate = completeFixture();
    duplicate.checks[1] = { ...duplicate.checks[0] };
    expectCode(
      runVerifier(writeFixture("duplicate-check.json", duplicate)),
      "STAGING_EVIDENCE_CHECK_DUPLICATE",
    );

    const noEvidence = completeFixture();
    noEvidence.checks[0].evidenceRef = null;
    expectCode(
      runVerifier(writeFixture("pass-without-evidence.json", noEvidence)),
      "STAGING_EVIDENCE_PASS_WITHOUT_REFERENCE",
    );
  }, 15_000);

  it("requires observed evidence that external operations remain disabled", () => {
    const record = completeFixture();
    const checkIndex = record.checks.findIndex((check) => check.id === "EXTERNAL_OPERATIONS_DISABLED");
    expect(checkIndex).toBeGreaterThanOrEqual(0);
    record.checks[checkIndex].evidenceRef = null;
    expectCode(
      runVerifier(writeFixture("external-operations-without-evidence.json", record)),
      "STAGING_EVIDENCE_PASS_WITHOUT_REFERENCE",
    );
  });

  it("rejects symlinks and oversized evidence files", () => {
    const linkTarget = path.join(testDirectory, "link-target");
    const linkPath = path.join(testDirectory, "linked-record.json");
    mkdirSync(linkTarget);
    symlinkSync(linkTarget, linkPath, "junction");
    expectCode(runVerifier(linkPath), "STAGING_EVIDENCE_PATH_NOT_ALLOWED");

    const oversized = writeRaw("oversized.json", "x".repeat((128 * 1024) + 1));
    expectCode(runVerifier(oversized), "STAGING_EVIDENCE_FILE_TOO_LARGE");
  });

  it("requires the actual evidence path to be ignored", () => {
    const fakeRoot = path.join(testDirectory, "unignored-repository");
    const fakeScripts = path.join(fakeRoot, "scripts", "release-evidence");
    const fakeEvidenceRoot = path.join(fakeRoot, "docs", "temp", "release-evidence");
    mkdirSync(fakeScripts, { recursive: true });
    mkdirSync(fakeEvidenceRoot, { recursive: true });
    copyFileSync(verifier, path.join(fakeScripts, "verify-staging-record.mjs"));
    copyFileSync(schema, path.join(fakeScripts, "staging-record-schema.mjs"));
    writeFileSync(path.join(fakeRoot, ".gitignore"), "", "utf8");

    const git = (args: string[]) => spawnSync("git", args, {
      cwd: fakeRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(git(["init"]).status).toBe(0);
    expect(git(["config", "user.name", "Verifier Test"]).status).toBe(0);
    expect(git(["config", "user.email", "verifier@example.invalid"]).status).toBe(0);
    expect(git(["config", "core.autocrlf", "false"]).status).toBe(0);
    expect(git(["add", ".gitignore", "scripts/release-evidence"]).status).toBe(0);
    expect(git(["-c", "commit.gpgSign=false", "commit", "-m", "test head"]).status).toBe(0);
    const fakeHead = git(["rev-parse", "--verify", "HEAD"]).stdout.trim();
    const fakeRecord = path.join(fakeEvidenceRoot, "record.json");
    writeFileSync(fakeRecord, "{}\n", "utf8");

    const result = spawnSync(
      process.execPath,
      [path.join(fakeScripts, "verify-staging-record.mjs"), fakeRecord, "--expected-revision", fakeHead],
      { cwd: root, encoding: "utf8", windowsHide: true },
    );
    expectCode(result, "STAGING_EVIDENCE_PATH_NOT_IGNORED");
  });

  it("rejects force-tracked private evidence", () => {
    const fakeRoot = path.join(testDirectory, "tracked-evidence-repository");
    const fakeScripts = path.join(fakeRoot, "scripts", "release-evidence");
    const fakeEvidenceRoot = path.join(fakeRoot, "docs", "temp", "release-evidence");
    mkdirSync(fakeScripts, { recursive: true });
    mkdirSync(fakeEvidenceRoot, { recursive: true });
    copyFileSync(verifier, path.join(fakeScripts, "verify-staging-record.mjs"));
    copyFileSync(schema, path.join(fakeScripts, "staging-record-schema.mjs"));
    writeFileSync(path.join(fakeRoot, ".gitignore"), "docs/temp/release-evidence/\n", "utf8");
    const fakeRecord = path.join(fakeEvidenceRoot, "record.json");
    writeFileSync(fakeRecord, "{}\n", "utf8");

    const git = (args: string[]) => spawnSync("git", args, {
      cwd: fakeRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(git(["init"]).status).toBe(0);
    expect(git(["config", "user.name", "Verifier Test"]).status).toBe(0);
    expect(git(["config", "user.email", "verifier@example.invalid"]).status).toBe(0);
    expect(git(["config", "core.autocrlf", "false"]).status).toBe(0);
    expect(git(["add", ".gitignore", "scripts/release-evidence"]).status).toBe(0);
    expect(git(["add", "--force", "docs/temp/release-evidence/record.json"]).status).toBe(0);
    expect(git(["-c", "commit.gpgSign=false", "commit", "-m", "tracked evidence fixture"]).status).toBe(0);
    const fakeHead = git(["rev-parse", "--verify", "HEAD"]).stdout.trim();

    const result = spawnSync(
      process.execPath,
      [path.join(fakeScripts, "verify-staging-record.mjs"), fakeRecord, "--expected-revision", fakeHead],
      { cwd: root, encoding: "utf8", windowsHide: true },
    );
    expectCode(result, "STAGING_EVIDENCE_PATH_TRACKED");
  });

  it("rejects customer-specific and other unknown fields", () => {
    const record = Object.assign(completeFixture(), { customerName: "synthetic" });
    expectCode(
      runVerifier(writeFixture("unknown-field.json", record)),
      "STAGING_EVIDENCE_SCHEMA_INVALID",
    );
  });
});
