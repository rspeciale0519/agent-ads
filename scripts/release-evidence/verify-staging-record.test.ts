import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createVerifierHarness,
  type FixtureRecord,
  type FixtureRuntimeResult,
} from "./verify-staging-record.test-harness";

const harness = createVerifierHarness();
const {
  completeFixture,
  expectCode,
  outputOf,
  rewriteRuntimeResult,
  runVerifier,
  writeFixture,
} = harness;

describe("staging evidence verifier runtime and trust bindings", () => {
  it("validates current-commit declarations without claiming external verification", () => {
    const record = completeFixture();
    const file = writeFixture("valid.json", record);
    const result = runVerifier(file, harness.headRevision, harness.testDirectory);

    expect(result.status).toBe(0);
    expect(outputOf(result)).toMatchObject({
      code: "STAGING_EVIDENCE_RECORD_VALID",
      recordValid: true,
      declaredChecksComplete: true,
      runtimeConfigBindingVerified: true,
      deploymentAttestationVerified: false,
      externalSystemsVerified: false,
    });
  });

  it("binds the runtime result reference to the verified result digest", () => {
    const recordFile = writeFixture("runtime-reference-mismatch.json", completeFixture());
    const record = JSON.parse(readFileSync(recordFile, "utf8")) as FixtureRecord;
    record.runtimeCheck.resultRef = "restricted:staging/runtime/wrong-result";
    writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");

    expectCode(
      runVerifier(recordFile),
      "STAGING_EVIDENCE_RUNTIME_BINDING_MISMATCH",
    );
    expect(outputOf(runVerifier(recordFile)).paths).toContain(
      "runtimeCheck.resultRef",
    );
  });

  it("binds every private runtime identity hash to the release record", () => {
    const mutations: Array<{
      mutate: (runtime: FixtureRuntimeResult) => void;
      path: string;
    }> = [
      {
        mutate: (runtime) => { runtime.source.gitRevision = "b".repeat(40); },
        path: "source.gitRevision",
      },
      {
        mutate: (runtime) => { runtime.bindings.vercelProjectIdentifierSha256 = "4".repeat(64); },
        path: "target.vercelProjectIdentifier",
      },
      {
        mutate: (runtime) => { runtime.bindings.vercelDeploymentIdentifierSha256 = "5".repeat(64); },
        path: "target.vercelDeploymentIdentifier",
      },
      {
        mutate: (runtime) => { runtime.bindings.vercelProjectLinkSha256 = "6".repeat(64); },
        path: "target.vercelProjectLinkSha256",
      },
      {
        mutate: (runtime) => { runtime.bindings.supabaseProjectReferenceSha256 = "7".repeat(64); },
        path: "target.supabaseProjectReference",
      },
      {
        mutate: (runtime) => { runtime.bindings.supabaseTargetFingerprintSha256 = "8".repeat(64); },
        path: "target.supabaseTargetFingerprintSha256",
      },
      {
        mutate: (runtime) => {
          runtime.observedAt = new Date(Date.parse(runtime.observedAt) - 1_000).toISOString();
        },
        path: "runtimeCheck.observedAt",
      },
    ];

    mutations.forEach((testCase, index) => {
      const file = writeFixture(`runtime-binding-mismatch-${index}.json`, completeFixture());
      rewriteRuntimeResult(file, testCase.mutate);
      const result = runVerifier(file);
      expectCode(result, "STAGING_EVIDENCE_RUNTIME_BINDING_MISMATCH");
      expect(outputOf(result).paths).toContain(testCase.path);
    });
  }, 40_000);

  it("requires the exact runtime-result bytes and strict pass shape", () => {
    const digestMismatch = writeFixture("runtime-digest-mismatch.json", completeFixture());
    rewriteRuntimeResult(
      digestMismatch,
      (runtime) => { runtime.counts.passed += 0; },
      false,
    );
    const runtimeFile = harness.runtimeResultByRecord.get(path.resolve(digestMismatch));
    if (!runtimeFile) throw new Error("Runtime result fixture is missing.");
    writeFileSync(runtimeFile, `${readFileSync(runtimeFile, "utf8")} `, "utf8");
    expectCode(
      runVerifier(digestMismatch),
      "STAGING_EVIDENCE_RUNTIME_BINDING_MISMATCH",
    );

    const failed = writeFixture("runtime-failed.json", completeFixture());
    rewriteRuntimeResult(failed, (runtime) => {
      runtime.counts.failed = 1;
      runtime.counts.passed -= 1;
    });
    expectCode(runVerifier(failed), "STAGING_EVIDENCE_RUNTIME_RESULT_INVALID");

    const skipped = writeFixture("runtime-skipped.json", completeFixture());
    rewriteRuntimeResult(skipped, (runtime) => {
      runtime.counts.skipped = 1;
      runtime.counts.passed -= 1;
    });
    expectCode(runVerifier(skipped), "STAGING_EVIDENCE_RUNTIME_RESULT_INVALID");

    const unknown = writeFixture("runtime-unknown-field.json", completeFixture());
    rewriteRuntimeResult(unknown, (runtime) => { runtime.unexpected = "synthetic"; });
    expectCode(runVerifier(unknown), "STAGING_EVIDENCE_RUNTIME_RESULT_INVALID");
  }, 30_000);

  it("rejects unsupported version 1 records", () => {
    const record = completeFixture();
    record.schemaVersion = 1;
    expectCode(
      runVerifier(writeFixture("version-one-record.json", record)),
      "STAGING_EVIDENCE_SCHEMA_UNSUPPORTED",
    );
  });

  it("applies private path and strict JSON checks to the runtime result", () => {
    const recordFile = writeFixture("runtime-path-record.json", completeFixture());
    expectCode(
      runVerifier(recordFile, harness.headRevision, harness.root, process.env, harness.example),
      "STAGING_EVIDENCE_PATH_NOT_ALLOWED",
    );
    expectCode(
      runVerifier(recordFile, harness.headRevision, harness.root, process.env, recordFile),
      "STAGING_EVIDENCE_RUNTIME_RESULT_PATH_INVALID",
    );

    const runtimeFile = harness.runtimeResultByRecord.get(path.resolve(recordFile));
    if (!runtimeFile) throw new Error("Runtime result fixture is missing.");
    const raw = readFileSync(runtimeFile, "utf8");
    const duplicate = raw.replace(
      '"status":"pass"',
      '"status":"pass","status":"pass"',
    );
    writeFileSync(runtimeFile, duplicate, "utf8");
    const record = JSON.parse(readFileSync(recordFile, "utf8")) as FixtureRecord;
    record.runtimeCheck.resultSha256 = harness.sha256(duplicate);
    writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    expectCode(
      runVerifier(recordFile),
      "STAGING_EVIDENCE_DUPLICATE_OBJECT_KEY",
    );
  });

  it("ignores hostile Git environment redirects", () => {
    const file = writeFixture("hostile-git-environment.json", completeFixture());
    const hostileEnvironment = {
      ...process.env,
      GIT_DIR: path.join(harness.testDirectory, "hostile-git-dir"),
      GIT_INDEX_FILE: path.join(harness.testDirectory, "hostile-index"),
      GIT_OBJECT_DIRECTORY: path.join(harness.testDirectory, "hostile-objects"),
      GIT_WORK_TREE: harness.testDirectory,
    };
    expectCode(
      runVerifier(file, harness.headRevision, harness.testDirectory, hostileEnvironment),
      "STAGING_EVIDENCE_RECORD_VALID",
    );
  });

  it("rejects dirty verifier trust anchors", () => {
    const anchors = [
      path.join(harness.root, ".gitignore"),
      harness.packageFile,
      harness.capture,
      harness.checker,
      harness.evidenceError,
      harness.evidenceRepository,
      harness.evidenceValidation,
      harness.runtimeEnvironmentPolicy,
      harness.runtimeTargets,
      harness.schema,
      harness.strictJson,
      harness.verifier,
    ];
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

    const otherRevision = harness.headRevision === "f".repeat(40) ? "e".repeat(40) : "f".repeat(40);
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
    mismatch.source.gitRevision = harness.headRevision === "a".repeat(40) ? "b".repeat(40) : "a".repeat(40);
    expectCode(
      runVerifier(writeFixture("record-revision-mismatch.json", mismatch)),
      "STAGING_EVIDENCE_REVISION_MISMATCH",
    );
  });
});
