import { describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  DAY_MS,
  createVerifierHarness,
  type FixtureCheck,
} from "./verify-staging-record.test-harness";

const harness = createVerifierHarness();
const {
  completeFixture,
  expectCode,
  freshFixture,
  runVerifier,
  writeFixture,
  writeRaw,
} = harness;

describe("staging evidence verifier record content", () => {
  it("restricts records to the private evidence directory and rejects traversal", () => {
    expectCode(runVerifier(harness.example), "STAGING_EVIDENCE_PATH_NOT_ALLOWED");
    const traversal = path.join(harness.evidenceRoot, "..", "escaped-record.json");
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
      "STAGING_EVIDENCE_RECOVERY_MODE_UNSELECTED",
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

  it("requires the staging origin to be a Vercel deployment origin", () => {
    const record = completeFixture();
    record.target.deploymentOrigin = "https://staging.example.invalid";
    expectCode(
      runVerifier(writeFixture("non-vercel-deployment-origin.json", record)),
      "STAGING_EVIDENCE_SCHEMA_INVALID",
    );
  });

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
  }, 60_000);

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
    const untrackedDirectory = path.join(harness.root, "prisma", "migrations", untrackedHead);
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

  it("rejects a record without a selected recovery mode", () => {
    const record = completeFixture();
    record.recovery.mode = "unselected";
    expectCode(
      runVerifier(writeFixture("unselected-recovery-mode.json", record)),
      "STAGING_EVIDENCE_RECOVERY_MODE_UNSELECTED",
    );
  });

  it("rejects incident-only and blocked recovery modes", () => {
    const incidentOnly = completeFixture();
    incidentOnly.recovery.mode = "same-project-physical";
    expectCode(
      runVerifier(writeFixture("incident-only-recovery-mode.json", incidentOnly)),
      "STAGING_EVIDENCE_RECOVERY_MODE_INCIDENT_ONLY",
    );

    const blocked = completeFixture();
    blocked.recovery.mode = "logical";
    expectCode(
      runVerifier(writeFixture("blocked-recovery-mode.json", blocked)),
      "STAGING_EVIDENCE_RECOVERY_MODE_BLOCKED",
    );
  });

  it("binds both recovery checks to one manifest digest", () => {
    const record = completeFixture();
    record.recovery.manifestSha256 = "9".repeat(64);
    expectCode(
      runVerifier(writeFixture("recovery-manifest-mismatch.json", record)),
      "STAGING_EVIDENCE_RECOVERY_BINDING_MISMATCH",
    );
  });

  it("requires Supavisor transaction mode on port 6543", () => {
    const sessionMode = completeFixture();
    sessionMode.target.supavisorMode = "session";
    expectCode(
      runVerifier(writeFixture("supavisor-session-mode.json", sessionMode)),
      "STAGING_EVIDENCE_SUPAVISOR_MODE_INVALID",
    );

    const wrongPort = completeFixture();
    wrongPort.target.supavisorPort = 5432;
    expectCode(
      runVerifier(writeFixture("supavisor-wrong-port.json", wrongPort)),
      "STAGING_EVIDENCE_SUPAVISOR_PORT_INVALID",
    );
  });

  it("rejects customer-specific and other unknown fields", () => {
    const record = Object.assign(completeFixture(), { customerName: "synthetic" });
    expectCode(
      runVerifier(writeFixture("unknown-field.json", record)),
      "STAGING_EVIDENCE_SCHEMA_INVALID",
    );
  });
});
