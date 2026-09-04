import { afterAll, beforeAll, expect, vi } from "vitest";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type FixtureCheck = {
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

export type FixtureRecord = {
  schemaVersion: number;
  recordedAt: string;
  validUntil: string;
  source: {
    gitRevision: string;
    artifactIdentifier: string;
  };
  target: {
    deploymentOrigin: string;
    vercelProjectIdentifier: string;
    vercelDeploymentIdentifier: string;
    vercelProjectLinkSha256: string;
    supabaseProjectReference: string;
    supabaseTargetFingerprintSha256: string;
    expectedMigrationHead: string;
    currentMigrationHead: string;
    supavisorMode: "transaction" | "session";
    supavisorPort: number;
  };
  runtimeCheck: {
    observedAt: string;
    resultRef: string;
    resultSha256: string;
  };
  recovery: {
    mode: "unselected" | "same-project-physical" | "new-project-physical" | "logical";
    manifestSha256: string;
  };
  checks: FixtureCheck[];
};

export type FixtureRuntimeResult = {
  schemaVersion: number;
  resultType: string;
  status: string;
  observedAt: string;
  source: { gitRevision: string };
  bindings: {
    vercelProjectIdentifierSha256: string;
    vercelDeploymentIdentifierSha256: string;
    vercelProjectLinkSha256: string;
    supabaseProjectReferenceSha256: string;
    supabaseTargetFingerprintSha256: string;
  };
  counts: { failed: number; passed: number; skipped: number; total: number };
  unexpected?: string;
};

type VerifierOutput = {
  code: string;
  recordValid: boolean;
  declaredChecksComplete: boolean;
  runtimeConfigBindingVerified?: boolean;
  deploymentAttestationVerified?: boolean;
  externalSystemsVerified: boolean;
  paths?: string[];
};

export const DAY_MS = 24 * 60 * 60 * 1000;
const VERIFIER_TEST_TIMEOUT_MS = 20_000;

export function createVerifierHarness() {
  vi.setConfig({ testTimeout: VERIFIER_TEST_TIMEOUT_MS });
  const sourceRoot = process.cwd();
  const sourceVerifier = path.join(sourceRoot, "scripts", "release-evidence", "verify-staging-record.mjs");
  const sourceSchema = path.join(sourceRoot, "scripts", "release-evidence", "staging-record-schema.mjs");
  const sourceCapture = path.join(sourceRoot, "scripts", "release-evidence", "capture-staging-runtime-result.mjs");
  const sourceChecker = path.join(sourceRoot, "scripts", "release-evidence", "check-staging-runtime-config.mjs");
  const sourceEvidenceError = path.join(sourceRoot, "scripts", "release-evidence", "staging-evidence-error.mjs");
  const sourceEvidenceRepository = path.join(sourceRoot, "scripts", "release-evidence", "staging-evidence-repository.mjs");
  const sourceEvidenceValidation = path.join(sourceRoot, "scripts", "release-evidence", "staging-evidence-validation.mjs");
  const sourceStrictJson = path.join(sourceRoot, "scripts", "release-evidence", "strict-json.mjs");
  const sourceRuntimeEnvironmentPolicy = path.join(sourceRoot, "scripts", "release-evidence", "staging-runtime-environment-policy.mjs");
  const sourceRuntimeTargets = path.join(sourceRoot, "scripts", "release-evidence", "staging-runtime-targets.mjs");
  const sourcePackage = path.join(sourceRoot, "package.json");
  const example = path.join(sourceRoot, "docs", "development", "delivery", "staging-evidence-record.example.json");
  const harnessRoot = path.join(sourceRoot, "docs", "temp", "release-evidence");
  let root = "";
  let verifier = "";
  let schema = "";
  let capture = "";
  let checker = "";
  let evidenceError = "";
  let evidenceRepository = "";
  let evidenceValidation = "";
  let strictJson = "";
  let runtimeEnvironmentPolicy = "";
  let runtimeTargets = "";
  let packageFile = "";
  let evidenceRoot = "";
  let headRevision = "";
  let testDirectory = "";
  let fallbackRuntimeResult = "";
  const runtimeResultByRecord = new Map<string, string>();

  function sha256(value: string) {
    return createHash("sha256").update(value, "utf8").digest("hex");
  }

  function hashPrivateBinding(label: string, value: string) {
    return sha256(JSON.stringify([
      "agent-ads-staging-private-binding-v1",
      label,
      value,
    ]));
  }

  function runtimeResultFor(record: FixtureRecord) {
    return {
      schemaVersion: 1,
      resultType: "AGENT_ADS_STAGING_RUNTIME_CONFIG_RESULT",
      status: "pass",
      observedAt: record.runtimeCheck.observedAt,
      source: { gitRevision: record.source.gitRevision },
      bindings: {
        vercelProjectIdentifierSha256: hashPrivateBinding(
          "vercel-project-identifier",
          record.target.vercelProjectIdentifier,
        ),
        vercelDeploymentIdentifierSha256: hashPrivateBinding(
          "vercel-deployment-identifier",
          record.target.vercelDeploymentIdentifier,
        ),
        vercelProjectLinkSha256: record.target.vercelProjectLinkSha256,
        supabaseProjectReferenceSha256: hashPrivateBinding(
          "supabase-project-reference",
          record.target.supabaseProjectReference,
        ),
        supabaseTargetFingerprintSha256: record.target.supabaseTargetFingerprintSha256,
      },
      counts: { failed: 0, passed: 50, skipped: 0, total: 50 },
    };
  }

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
    record.recovery.mode = "new-project-physical";
    const observedAt = new Date(Date.parse(record.recordedAt) - 60_000).toISOString();
    record.runtimeCheck.observedAt = observedAt;
    record.checks = record.checks.map((check) => ({
      ...check,
      status: "pass" as const,
      observedAt,
      evidenceRef: ["RECOVERY_SET", "RESTORE_DRILL"].includes(check.id)
        ? `restricted:staging/recovery/${record.recovery.manifestSha256}`
        : `restricted:staging/evidence/${check.id.toLowerCase()}`,
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
    const runtimeRaw = `${JSON.stringify(runtimeResultFor(record))}\n`;
    record.runtimeCheck.resultSha256 = sha256(runtimeRaw);
    record.runtimeCheck.resultRef = `restricted:staging/runtime/${record.runtimeCheck.resultSha256}`;
    const recordFile = writeRaw(name, `${JSON.stringify(record, null, 2)}\n`);
    const runtimeFile = writeRaw(`${name}.runtime.json`, runtimeRaw);
    runtimeResultByRecord.set(path.resolve(recordFile), runtimeFile);
    return recordFile;
  }

  function rewriteRuntimeResult(
    recordFile: string,
    mutate: (runtimeResult: FixtureRuntimeResult) => void,
    synchronizeDigest = true,
  ) {
    const runtimeFile = runtimeResultByRecord.get(path.resolve(recordFile));
    if (!runtimeFile) throw new Error("Runtime result fixture is missing.");
    const runtimeResult = JSON.parse(readFileSync(runtimeFile, "utf8")) as FixtureRuntimeResult;
    mutate(runtimeResult);
    const runtimeRaw = `${JSON.stringify(runtimeResult)}\n`;
    writeFileSync(runtimeFile, runtimeRaw, "utf8");
    if (synchronizeDigest) {
      const record = JSON.parse(readFileSync(recordFile, "utf8")) as FixtureRecord;
      record.runtimeCheck.resultSha256 = sha256(runtimeRaw);
      record.runtimeCheck.resultRef = `restricted:staging/runtime/${record.runtimeCheck.resultSha256}`;
      writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    }
    return runtimeFile;
  }

  function runVerifier(
    file: string,
    expectedRevision: string | null = headRevision,
    cwd = root,
    environment: NodeJS.ProcessEnv = process.env,
    runtimeResultFile = runtimeResultByRecord.get(path.resolve(file)) ?? fallbackRuntimeResult,
  ) {
    const args = [verifier, file];
    if (expectedRevision !== null) {
      args.push(
        "--expected-revision",
        expectedRevision,
        "--runtime-result",
        runtimeResultFile,
      );
    }
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
    capture = path.join(root, "scripts", "release-evidence", "capture-staging-runtime-result.mjs");
    checker = path.join(root, "scripts", "release-evidence", "check-staging-runtime-config.mjs");
    evidenceError = path.join(root, "scripts", "release-evidence", "staging-evidence-error.mjs");
    evidenceRepository = path.join(root, "scripts", "release-evidence", "staging-evidence-repository.mjs");
    evidenceValidation = path.join(root, "scripts", "release-evidence", "staging-evidence-validation.mjs");
    strictJson = path.join(root, "scripts", "release-evidence", "strict-json.mjs");
    runtimeEnvironmentPolicy = path.join(root, "scripts", "release-evidence", "staging-runtime-environment-policy.mjs");
    runtimeTargets = path.join(root, "scripts", "release-evidence", "staging-runtime-targets.mjs");
    packageFile = path.join(root, "package.json");
    evidenceRoot = path.join(root, "docs", "temp", "release-evidence");
    mkdirSync(path.dirname(verifier), { recursive: true });
    copyFileSync(sourceVerifier, verifier);
    copyFileSync(sourceSchema, schema);
    copyFileSync(sourceCapture, capture);
    copyFileSync(sourceChecker, checker);
    copyFileSync(sourceEvidenceError, evidenceError);
    copyFileSync(sourceEvidenceRepository, evidenceRepository);
    copyFileSync(sourceEvidenceValidation, evidenceValidation);
    copyFileSync(sourceStrictJson, strictJson);
    copyFileSync(sourceRuntimeEnvironmentPolicy, runtimeEnvironmentPolicy);
    copyFileSync(sourceRuntimeTargets, runtimeTargets);
    copyFileSync(sourcePackage, packageFile);
    writeFileSync(
      path.join(root, ".gitignore"),
      "docs/temp/release-evidence/\n.vercel/\n",
      "utf8",
    );

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
    expect(git(["add", ".gitignore", "package.json", "scripts/release-evidence", "prisma/migrations"]).status).toBe(0);
    expect(git(["-c", "commit.gpgSign=false", "commit", "-m", "verifier fixture"]).status).toBe(0);
    const headResult = git(["rev-parse", "--verify", "HEAD"]);
    expect(headResult.status).toBe(0);
    headRevision = headResult.stdout.trim();
    expect(headRevision).toMatch(/^[0-9a-f]{40}$/u);
    mkdirSync(evidenceRoot, { recursive: true });
    testDirectory = mkdtempSync(path.join(evidenceRoot, "verifier-test-"));
    const fallbackRecord = completeFixture();
    fallbackRuntimeResult = writeFixture("fallback-record.json", fallbackRecord)
      .replace(/fallback-record\.json$/u, "fallback-record.json.runtime.json");
  }, 20_000);

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    vi.resetConfig();
  });

  return {
    completeFixture,
    expectCode,
    freshFixture,
    outputOf,
    rewriteRuntimeResult,
    runVerifier,
    runtimeResultByRecord,
    sha256,
    writeFixture,
    writeRaw,
    get capture() { return capture; },
    get checker() { return checker; },
    get evidenceError() { return evidenceError; },
    get evidenceRepository() { return evidenceRepository; },
    get evidenceRoot() { return evidenceRoot; },
    get evidenceValidation() { return evidenceValidation; },
    get example() { return example; },
    get headRevision() { return headRevision; },
    get packageFile() { return packageFile; },
    get root() { return root; },
    get runtimeEnvironmentPolicy() { return runtimeEnvironmentPolicy; },
    get runtimeTargets() { return runtimeTargets; },
    get schema() { return schema; },
    get strictJson() { return strictJson; },
    get testDirectory() { return testDirectory; },
    get verifier() { return verifier; },
  };
}
