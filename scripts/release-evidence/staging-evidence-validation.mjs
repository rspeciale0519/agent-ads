import { createHash } from "node:crypto";
import {
  containsPercentDecodedSecretMaterial,
  containsSecretMaterial,
  REQUIRED_STAGING_CHECK_IDS,
  STAGING_CHECK_CONTRACT,
  stagingEvidenceRecordSchema,
  stagingRuntimeResultSchema,
} from "./staging-record-schema.mjs";
import { hashPrivateRuntimeBinding } from "./capture-staging-runtime-result.mjs";
import { UNRESOLVED_TARGET_FINGERPRINT_SHA256 } from "./check-staging-runtime-config.mjs";
import { StrictJsonError, parseStrictJson } from "./strict-json.mjs";
import { fail } from "./staging-evidence-error.mjs";
import { requireMigrationDirectory } from "./staging-evidence-repository.mjs";

const MAX_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_OBSERVATION_AGE_MS = Object.freeze({
  CI_EXACT_COMMIT: 24 * HOUR_MS,
  DEPLOYMENT_RUNTIME_ATTESTATION: 24 * HOUR_MS,
  TARGET_FINGERPRINT: 24 * HOUR_MS,
  MIGRATION_HEAD: 24 * HOUR_MS,
  TENANT_ISOLATION_RLS: 24 * HOUR_MS,
  RUNTIME_ROLE: 24 * HOUR_MS,
  SECRET_BROKER_VAULT: 24 * HOUR_MS,
  SUPAVISOR_RUNTIME: 24 * HOUR_MS,
  DATABASE_SSL_ENFORCEMENT: 24 * HOUR_MS,
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
const ZERO_SHA = "0".repeat(40);

function parseJsonWithoutDuplicateKeys(raw) {
  try {
    return parseStrictJson(raw);
  } catch (error) {
    if (!(error instanceof StrictJsonError)) throw error;
    const code = error.code === "JSON_DUPLICATE_OBJECT_KEY"
      ? "STAGING_EVIDENCE_DUPLICATE_OBJECT_KEY"
      : "STAGING_EVIDENCE_JSON_INVALID";
    fail(code);
  }
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

export function parseRecord(raw) {
  const candidate = parseJsonWithoutDuplicateKeys(raw);
  if (containsSecretMaterial(raw) || decodedValueContainsSecret(candidate)) {
    fail("STAGING_EVIDENCE_SECRET_MATERIAL");
  }
  if (
    !candidate
    || typeof candidate !== "object"
    || Array.isArray(candidate)
    || candidate.schemaVersion !== 2
  ) {
    fail("STAGING_EVIDENCE_SCHEMA_UNSUPPORTED");
  }

  const parsed = stagingEvidenceRecordSchema.safeParse(candidate);
  if (!parsed.success) {
    const paths = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].slice(0, 20);
    fail("STAGING_EVIDENCE_SCHEMA_INVALID", paths);
  }
  return parsed.data;
}

export function parseRuntimeResult(raw) {
  const candidate = parseJsonWithoutDuplicateKeys(raw);
  if (containsSecretMaterial(raw) || decodedValueContainsSecret(candidate)) {
    fail("STAGING_EVIDENCE_RUNTIME_RESULT_SECRET_MATERIAL");
  }
  const parsed = stagingRuntimeResultSchema.safeParse(candidate);
  if (!parsed.success) {
    const paths = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].slice(0, 20);
    fail("STAGING_EVIDENCE_RUNTIME_RESULT_INVALID", paths);
  }
  return parsed.data;
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function valuesMatch(actual, expected) {
  return Array.isArray(expected)
    ? Array.isArray(actual)
      && actual.length === expected.length
      && actual.every((value, index) => value === expected[index])
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
  if (mismatchPaths.length > 0) {
    fail("STAGING_EVIDENCE_CHECK_CONTRACT_MISMATCH", mismatchPaths);
  }
}

function validateTimes(record, now) {
  const recordedAt = Date.parse(record.recordedAt);
  const validUntil = Date.parse(record.validUntil);
  if (now - recordedAt > MAX_RECORD_AGE_MS) {
    fail("STAGING_EVIDENCE_RECORDED_AT_STALE", ["recordedAt"]);
  }
  if (recordedAt - now > MAX_FUTURE_SKEW_MS) {
    fail("STAGING_EVIDENCE_RECORDED_AT_FUTURE", ["recordedAt"]);
  }
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
  if (futureObservations.length > 0) {
    fail("STAGING_EVIDENCE_OBSERVATION_FUTURE", futureObservations);
  }
  if (staleObservations.length > 0) {
    fail("STAGING_EVIDENCE_OBSERVATION_STALE", staleObservations);
  }
}

export function validateRuntimeBinding(record, runtimeResult, runtimeRaw, now) {
  const mismatchPaths = [];
  const expectedResultReference = `restricted:staging/runtime/${record.runtimeCheck.resultSha256}`;
  if (record.runtimeCheck.resultRef !== expectedResultReference) {
    mismatchPaths.push("runtimeCheck.resultRef");
  }
  if (sha256(runtimeRaw) !== record.runtimeCheck.resultSha256) {
    mismatchPaths.push("runtimeCheck.resultSha256");
  }
  if (runtimeResult.observedAt !== record.runtimeCheck.observedAt) {
    mismatchPaths.push("runtimeCheck.observedAt");
  }
  if (runtimeResult.source.gitRevision !== record.source.gitRevision) {
    mismatchPaths.push("source.gitRevision");
  }
  if (
    runtimeResult.bindings.vercelProjectIdentifierSha256
      !== hashPrivateRuntimeBinding(
        "vercel-project-identifier",
        record.target.vercelProjectIdentifier,
      )
  ) mismatchPaths.push("target.vercelProjectIdentifier");
  if (
    runtimeResult.bindings.vercelDeploymentIdentifierSha256
      !== hashPrivateRuntimeBinding(
        "vercel-deployment-identifier",
        record.target.vercelDeploymentIdentifier,
      )
  ) mismatchPaths.push("target.vercelDeploymentIdentifier");
  if (
    runtimeResult.bindings.vercelProjectLinkSha256
      !== record.target.vercelProjectLinkSha256
  ) mismatchPaths.push("target.vercelProjectLinkSha256");
  if (
    runtimeResult.bindings.supabaseProjectReferenceSha256
      !== hashPrivateRuntimeBinding(
        "supabase-project-reference",
        record.target.supabaseProjectReference,
      )
  ) mismatchPaths.push("target.supabaseProjectReference");
  if (
    runtimeResult.bindings.supabaseTargetFingerprintSha256
      !== record.target.supabaseTargetFingerprintSha256
  ) mismatchPaths.push("target.supabaseTargetFingerprintSha256");
  if (
    record.target.supabaseTargetFingerprintSha256
      === UNRESOLVED_TARGET_FINGERPRINT_SHA256
  ) mismatchPaths.push("target.supabaseTargetFingerprintSha256");

  const targetFingerprintCheck = record.checks.find(
    (check) => check.id === "TARGET_FINGERPRINT",
  );
  if (targetFingerprintCheck?.observedAt !== runtimeResult.observedAt) {
    mismatchPaths.push("checks.TARGET_FINGERPRINT.observedAt");
  }
  if (mismatchPaths.length > 0) {
    fail("STAGING_EVIDENCE_RUNTIME_BINDING_MISMATCH", mismatchPaths);
  }

  const observedAt = Date.parse(runtimeResult.observedAt);
  const recordedAt = Date.parse(record.recordedAt);
  if (observedAt > recordedAt || observedAt - now > MAX_FUTURE_SKEW_MS) {
    fail("STAGING_EVIDENCE_RUNTIME_RESULT_FUTURE", ["runtimeCheck.observedAt"]);
  }
  if (now - observedAt > MAX_OBSERVATION_AGE_MS.TARGET_FINGERPRINT) {
    fail("STAGING_EVIDENCE_RUNTIME_RESULT_STALE", ["runtimeCheck.observedAt"]);
  }
}

export function validateDeclarations(record, expectedRevision, now) {
  const indexesById = new Map();
  for (const [index, check] of record.checks.entries()) {
    const indexes = indexesById.get(check.id) ?? [];
    indexes.push(index);
    indexesById.set(check.id, indexes);
  }

  const duplicatePaths = [...indexesById.values()]
    .filter((indexes) => indexes.length > 1)
    .flatMap((indexes) => indexes.map((index) => `checks.${index}.id`));
  if (duplicatePaths.length > 0) {
    fail("STAGING_EVIDENCE_CHECK_DUPLICATE", duplicatePaths);
  }

  const missing = REQUIRED_STAGING_CHECK_IDS.filter((id) => !indexesById.has(id));
  if (missing.length > 0) {
    fail("STAGING_EVIDENCE_REQUIRED_CHECK_MISSING", missing.map((id) => `checks.${id}`));
  }

  validateCheckContracts(record);

  if (record.source.gitRevision === ZERO_SHA) {
    fail("STAGING_EVIDENCE_REVISION_INVALID", ["source.gitRevision"]);
  }
  if (record.source.gitRevision !== expectedRevision) {
    fail("STAGING_EVIDENCE_REVISION_MISMATCH", ["source.gitRevision"]);
  }
  if (record.target.expectedMigrationHead !== record.target.currentMigrationHead) {
    fail("STAGING_EVIDENCE_MIGRATION_MISMATCH", [
      "target.expectedMigrationHead",
      "target.currentMigrationHead",
    ]);
  }
  if (record.recovery.mode === "unselected") {
    fail("STAGING_EVIDENCE_RECOVERY_MODE_UNSELECTED", ["recovery.mode"]);
  }
  if (record.recovery.mode === "same-project-physical") {
    fail("STAGING_EVIDENCE_RECOVERY_MODE_INCIDENT_ONLY", ["recovery.mode"]);
  }
  if (record.recovery.mode === "logical") {
    fail("STAGING_EVIDENCE_RECOVERY_MODE_BLOCKED", ["recovery.mode"]);
  }
  const expectedRecoveryEvidence = `restricted:staging/recovery/${record.recovery.manifestSha256}`;
  const recoveryEvidenceMismatches = record.checks.flatMap((check, index) => (
    ["RECOVERY_SET", "RESTORE_DRILL"].includes(check.id)
      && check.evidenceRef !== expectedRecoveryEvidence
      ? [`checks.${index}.evidenceRef`]
      : []
  ));
  if (recoveryEvidenceMismatches.length > 0) {
    fail("STAGING_EVIDENCE_RECOVERY_BINDING_MISMATCH", recoveryEvidenceMismatches);
  }
  if (record.target.supavisorMode !== "transaction") {
    fail("STAGING_EVIDENCE_SUPAVISOR_MODE_INVALID", ["target.supavisorMode"]);
  }
  if (record.target.supavisorPort !== 6543) {
    fail("STAGING_EVIDENCE_SUPAVISOR_PORT_INVALID", ["target.supavisorPort"]);
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
  if (passingLimitations.length > 0) {
    fail("STAGING_EVIDENCE_PASS_WITH_LIMITATION", passingLimitations);
  }

  const unresolved = record.checks.flatMap((check, index) => (
    check.status === "pass" ? [] : [`checks.${index}.status`]
  ));
  if (unresolved.length > 0) fail("STAGING_EVIDENCE_CHECK_UNRESOLVED", unresolved);
}
