import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REPOSITORY_ROOT,
  readApprovedRecord,
  requireTrustAnchorsMatchHead,
  resolveHeadRevision,
} from "./staging-evidence-repository.mjs";
import { fail, StagingEvidenceError } from "./staging-evidence-error.mjs";
import {
  parseRecord,
  parseRuntimeResult,
  validateDeclarations,
  validateRuntimeBinding,
} from "./staging-evidence-validation.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const ZERO_SHA = "0".repeat(40);
const VERIFIER_FILE = fileURLToPath(import.meta.url);

function parseArguments(args) {
  if (args.length === 0) fail("STAGING_EVIDENCE_PATH_REQUIRED");
  if (args.length < 3 || args[1] !== "--expected-revision") {
    fail("STAGING_EVIDENCE_REVISION_REQUIRED");
  }
  if (args.length !== 5 || args[3] !== "--runtime-result") {
    fail("STAGING_EVIDENCE_ARGUMENT_INVALID");
  }
  if (!SHA_PATTERN.test(args[2]) || args[2] === ZERO_SHA) fail("STAGING_EVIDENCE_REVISION_INVALID");
  if (path.resolve(REPOSITORY_ROOT, args[0]) === path.resolve(REPOSITORY_ROOT, args[4])) {
    fail("STAGING_EVIDENCE_RUNTIME_RESULT_PATH_INVALID");
  }
  return { recordPath: args[0], expectedRevision: args[2], runtimeResultPath: args[4] };
}

export function verifyStagingEvidenceFile(args) {
  const { recordPath, expectedRevision, runtimeResultPath } = parseArguments(args);
  const headRevision = resolveHeadRevision();
  if (expectedRevision !== headRevision) fail("STAGING_EVIDENCE_HEAD_MISMATCH");
  requireTrustAnchorsMatchHead();
  const record = parseRecord(readApprovedRecord(recordPath));
  const runtimeRaw = readApprovedRecord(runtimeResultPath);
  const runtimeResult = parseRuntimeResult(runtimeRaw);
  const now = Date.now();
  validateDeclarations(record, expectedRevision, now);
  validateRuntimeBinding(record, runtimeResult, runtimeRaw, now);
  return {
    code: "STAGING_EVIDENCE_RECORD_VALID",
    recordValid: true,
    declaredChecksComplete: true,
    runtimeConfigBindingVerified: true,
    deploymentAttestationVerified: false,
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
