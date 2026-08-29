import { describe, expect, it } from "vitest";
import {
  copyFileSync,
  mkdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createVerifierHarness } from "./verify-staging-record.test-harness";

const harness = createVerifierHarness();
const { expectCode, runVerifier, writeRaw } = harness;

function copyVerifierTrustAnchors(fakeRoot: string) {
  const fakeScripts = path.join(fakeRoot, "scripts", "release-evidence");
  mkdirSync(fakeScripts, { recursive: true });
  copyFileSync(harness.verifier, path.join(fakeScripts, "verify-staging-record.mjs"));
  copyFileSync(harness.schema, path.join(fakeScripts, "staging-record-schema.mjs"));
  copyFileSync(harness.capture, path.join(fakeScripts, "capture-staging-runtime-result.mjs"));
  copyFileSync(harness.checker, path.join(fakeScripts, "check-staging-runtime-config.mjs"));
  copyFileSync(harness.evidenceError, path.join(fakeScripts, "staging-evidence-error.mjs"));
  copyFileSync(harness.evidenceRepository, path.join(fakeScripts, "staging-evidence-repository.mjs"));
  copyFileSync(harness.evidenceValidation, path.join(fakeScripts, "staging-evidence-validation.mjs"));
  copyFileSync(harness.runtimeEnvironmentPolicy, path.join(fakeScripts, "staging-runtime-environment-policy.mjs"));
  copyFileSync(harness.runtimeTargets, path.join(fakeScripts, "staging-runtime-targets.mjs"));
  copyFileSync(harness.strictJson, path.join(fakeScripts, "strict-json.mjs"));
  copyFileSync(harness.packageFile, path.join(fakeRoot, "package.json"));
  return fakeScripts;
}

function gitIn(fakeRoot: string, args: string[]) {
  return spawnSync("git", args, {
    cwd: fakeRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}

function initializeFixtureRepository(fakeRoot: string) {
  expect(gitIn(fakeRoot, ["init"]).status).toBe(0);
  expect(gitIn(fakeRoot, ["config", "user.name", "Verifier Test"]).status).toBe(0);
  expect(gitIn(fakeRoot, ["config", "user.email", "verifier@example.invalid"]).status).toBe(0);
  expect(gitIn(fakeRoot, ["config", "core.autocrlf", "false"]).status).toBe(0);
}

describe("staging evidence verifier repository boundaries", () => {
  it("rejects symlinks and oversized evidence files", () => {
    const linkTarget = path.join(harness.testDirectory, "link-target");
    const linkPath = path.join(harness.testDirectory, "linked-record.json");
    mkdirSync(linkTarget);
    symlinkSync(linkTarget, linkPath, "junction");
    expectCode(runVerifier(linkPath), "STAGING_EVIDENCE_PATH_NOT_ALLOWED");

    const oversized = writeRaw("oversized.json", "x".repeat((128 * 1024) + 1));
    expectCode(runVerifier(oversized), "STAGING_EVIDENCE_FILE_TOO_LARGE");
  });

  it("requires the actual evidence path to be ignored", () => {
    const fakeRoot = path.join(harness.testDirectory, "unignored-repository");
    const fakeScripts = copyVerifierTrustAnchors(fakeRoot);
    const fakeEvidenceRoot = path.join(fakeRoot, "docs", "temp", "release-evidence");
    mkdirSync(fakeEvidenceRoot, { recursive: true });
    writeFileSync(path.join(fakeRoot, ".gitignore"), "", "utf8");

    initializeFixtureRepository(fakeRoot);
    expect(gitIn(fakeRoot, ["add", ".gitignore", "package.json", "scripts/release-evidence"]).status).toBe(0);
    expect(gitIn(fakeRoot, ["-c", "commit.gpgSign=false", "commit", "-m", "test head"]).status).toBe(0);
    const fakeHead = gitIn(fakeRoot, ["rev-parse", "--verify", "HEAD"]).stdout.trim();
    const fakeRecord = path.join(fakeEvidenceRoot, "record.json");
    const fakeRuntime = path.join(fakeEvidenceRoot, "runtime.json");
    writeFileSync(fakeRecord, "{}\n", "utf8");
    writeFileSync(fakeRuntime, "{}\n", "utf8");

    const result = spawnSync(
      process.execPath,
      [
        path.join(fakeScripts, "verify-staging-record.mjs"),
        fakeRecord,
        "--expected-revision",
        fakeHead,
        "--runtime-result",
        fakeRuntime,
      ],
      { cwd: harness.root, encoding: "utf8", windowsHide: true },
    );
    expectCode(result, "STAGING_EVIDENCE_PATH_NOT_IGNORED");
  });

  it("rejects force-tracked private evidence", () => {
    const fakeRoot = path.join(harness.testDirectory, "tracked-evidence-repository");
    const fakeScripts = copyVerifierTrustAnchors(fakeRoot);
    const fakeEvidenceRoot = path.join(fakeRoot, "docs", "temp", "release-evidence");
    mkdirSync(fakeEvidenceRoot, { recursive: true });
    writeFileSync(path.join(fakeRoot, ".gitignore"), "docs/temp/release-evidence/\n", "utf8");
    const fakeRecord = path.join(fakeEvidenceRoot, "record.json");
    const fakeRuntime = path.join(fakeEvidenceRoot, "runtime.json");
    writeFileSync(fakeRecord, "{}\n", "utf8");
    writeFileSync(fakeRuntime, "{}\n", "utf8");

    initializeFixtureRepository(fakeRoot);
    expect(gitIn(fakeRoot, ["add", ".gitignore", "package.json", "scripts/release-evidence"]).status).toBe(0);
    expect(gitIn(fakeRoot, ["add", "--force", "docs/temp/release-evidence/record.json"]).status).toBe(0);
    expect(gitIn(fakeRoot, ["-c", "commit.gpgSign=false", "commit", "-m", "tracked evidence fixture"]).status).toBe(0);
    const fakeHead = gitIn(fakeRoot, ["rev-parse", "--verify", "HEAD"]).stdout.trim();

    const result = spawnSync(
      process.execPath,
      [
        path.join(fakeScripts, "verify-staging-record.mjs"),
        fakeRecord,
        "--expected-revision",
        fakeHead,
        "--runtime-result",
        fakeRuntime,
      ],
      { cwd: harness.root, encoding: "utf8", windowsHide: true },
    );
    expectCode(result, "STAGING_EVIDENCE_PATH_TRACKED");
  });
});
