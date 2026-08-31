import { z } from "zod";

const stagingCheckContract = {
  CI_EXACT_COMMIT: {
    requirementIds: ["OPS-006"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: ".github/workflows/validate.yml",
    testRef: "restricted:staging/test-plan/exact-commit-ci",
  },
  DEPLOYMENT_RUNTIME_ATTESTATION: {
    requirementIds: ["OPS-006", "SEC-003"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app/api/internal/release-attestation/route.ts",
    testRef: "restricted:staging/test-plan/deployment-runtime-attestation",
  },
  TARGET_FINGERPRINT: {
    requirementIds: ["OPS-006"],
    gate: "F0",
    ownerRole: "database-owner",
    implementationRef: "scripts/f0/disposable-cluster-guard.sql",
    testRef: "restricted:staging/test-plan/target-fingerprint",
  },
  MIGRATION_HEAD: {
    requirementIds: ["OPS-006"],
    gate: "F0",
    ownerRole: "database-owner",
    implementationRef: "prisma/migrations",
    testRef: "restricted:staging/test-plan/migration-head",
  },
  TENANT_ISOLATION_RLS: {
    requirementIds: ["SEC-003", "SEC-007"],
    gate: "F0",
    ownerRole: "security-owner",
    implementationRef: "scripts/f0/tenant-role-proof.sql",
    testRef: "restricted:staging/test-plan/tenant-isolation-rls",
  },
  RUNTIME_ROLE: {
    requirementIds: ["SEC-003", "SEC-011"],
    gate: "F0",
    ownerRole: "security-owner",
    implementationRef: "scripts/f0/tenant-role-proof.sql",
    testRef: "restricted:staging/test-plan/runtime-role",
  },
  SECRET_BROKER_VAULT: {
    requirementIds: ["SEC-001", "SEC-011"],
    gate: "F0",
    ownerRole: "security-owner",
    implementationRef: "lib/connections/secrets/secret-broker.ts",
    testRef: "restricted:staging/test-plan/secret-broker-vault",
  },
  SUPAVISOR_RUNTIME: {
    requirementIds: ["OPS-006"],
    gate: "STAGING",
    ownerRole: "database-owner",
    implementationRef: "lib/db/client.ts",
    testRef: "restricted:staging/test-plan/supavisor-runtime",
  },
  DATABASE_SSL_ENFORCEMENT: {
    requirementIds: ["OPS-006", "SEC-011"],
    gate: "STAGING",
    ownerRole: "database-owner",
    implementationRef: "docs/development/delivery/vercel-supabase-resend-deployment.md",
    testRef: "restricted:staging/test-plan/database-ssl-enforcement",
  },
  AUTH_SESSION_AAL2: {
    requirementIds: ["SEC-003"],
    gate: "STAGING",
    ownerRole: "security-owner",
    implementationRef: "lib/auth/assurance.ts",
    testRef: "restricted:staging/test-plan/auth-session-aal2",
  },
  STORAGE_PRIVATE_RECOVERY: {
    requirementIds: ["OPS-005", "SEC-005"],
    gate: "F1",
    ownerRole: "database-owner",
    implementationRef: "app/api/onboarding/upload-url/route.ts",
    testRef: "restricted:staging/test-plan/storage-private-recovery",
  },
  EMAIL_TEST_MODE: {
    requirementIds: ["ONB-013", "SEC-005"],
    gate: "STAGING",
    ownerRole: "security-owner",
    implementationRef: "lib/email-delivery-policy.ts",
    testRef: "restricted:staging/test-plan/email-test-mode",
  },
  EXTERNAL_OPERATIONS_DISABLED: {
    requirementIds: ["OPS-006", "PAID-004", "SEC-002"],
    gate: "STAGING",
    ownerRole: "security-owner",
    implementationRef: "docs/development/delivery/vercel-supabase-resend-deployment.md",
    testRef: "restricted:staging/test-plan/external-operations-disabled",
  },
  RECOVERY_SET: {
    requirementIds: ["OPS-005", "OPS-006"],
    gate: "F1",
    ownerRole: "database-owner",
    implementationRef: "docs/development/quality/account-connections-operations.md",
    testRef: "restricted:staging/test-plan/recovery-set",
  },
  RESTORE_DRILL: {
    requirementIds: ["OPS-005"],
    gate: "F1",
    ownerRole: "database-owner",
    implementationRef: "docs/development/quality/account-connections-operations.md",
    testRef: "restricted:staging/test-plan/restore-drill",
  },
  READ_ONLY_CONNECTOR_CANARY: {
    requirementIds: ["PAID-001", "PAID-004", "SEC-002"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "lib/connections/providers",
    testRef: "restricted:staging/test-plan/read-only-connector-canary",
  },
  BROWSER_DESKTOP: {
    requirementIds: ["UX-001", "UX-007"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app",
    testRef: "restricted:staging/test-plan/desktop-browser",
  },
  BROWSER_MOBILE: {
    requirementIds: ["UX-008"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app",
    testRef: "restricted:staging/test-plan/mobile-browser",
  },
  UI_STATES: {
    requirementIds: ["UX-001"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app",
    testRef: "restricted:staging/test-plan/ui-states",
  },
  ACCESSIBILITY: {
    requirementIds: ["UX-007"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app",
    testRef: "restricted:staging/test-plan/accessibility",
  },
  CONSOLE_ERRORS: {
    requirementIds: ["OPS-006"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app",
    testRef: "restricted:staging/test-plan/console-errors",
  },
  NETWORK_ERRORS: {
    requirementIds: ["OPS-006"],
    gate: "STAGING",
    ownerRole: "release-owner",
    implementationRef: "app",
    testRef: "restricted:staging/test-plan/network-errors",
  },
  SECURITY_HEADERS: {
    requirementIds: ["SEC-003", "SEC-007"],
    gate: "STAGING",
    ownerRole: "security-owner",
    implementationRef: "next.config.ts",
    testRef: "restricted:staging/test-plan/security-headers",
  },
  ROLLBACK: {
    requirementIds: ["OPS-005", "OPS-006"],
    gate: "STAGING",
    ownerRole: "rollback-owner",
    implementationRef: "docs/development/delivery/vercel-supabase-resend-deployment.md",
    testRef: "restricted:staging/test-plan/rollback",
  },
};

for (const contract of Object.values(stagingCheckContract)) {
  Object.freeze(contract.requirementIds);
  Object.freeze(contract);
}

export const STAGING_CHECK_CONTRACT = Object.freeze(stagingCheckContract);

export const REQUIRED_STAGING_CHECK_IDS = Object.freeze(Object.keys(STAGING_CHECK_CONTRACT));

const safeIdentifier = z.string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/u);
const safeCode = z.string()
  .min(1)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/u);
const ownerRole = z.string()
  .min(2)
  .max(80)
  .regex(/^[a-z][a-z0-9-]*$/u);
const utcTimestamp = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)) return false;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return false;
  const canonical = parsed.toISOString();
  return value === canonical || value === canonical.replace(".000Z", "Z");
});

const unsafeUrlCharacters = /[\u0000-\u001f\u007f\\]/u;
const encodedOctet = /%[0-9a-f]{2}/iu;

function decodePercentEncoding(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function hasUnsafeDecodedPath(pathname) {
  const decoded = decodePercentEncoding(pathname);
  if (decoded === null || unsafeUrlCharacters.test(decoded)) return true;
  if (encodedOctet.test(decoded)) return true;
  return decoded.split("/").some((segment) => segment === "." || segment === "..");
}

function isSafeHttpsUrl(value, originOnly = false) {
  if (unsafeUrlCharacters.test(value)) return false;
  try {
    const parsed = new URL(value);
    const canonicalValue = originOnly
      ? parsed.origin
      : (parsed.pathname === "/" ? [parsed.origin, parsed.href] : [parsed.href]);
    const isCanonical = Array.isArray(canonicalValue)
      ? canonicalValue.includes(value)
      : canonicalValue === value;
    return value.startsWith("https://")
      && parsed.protocol === "https:"
      && parsed.username === ""
      && parsed.password === ""
      && parsed.search === ""
      && parsed.hash === ""
      && isCanonical
      && !hasUnsafeDecodedPath(parsed.pathname);
  } catch {
    return false;
  }
}

function isVercelDeploymentOrigin(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname.endsWith(".vercel.app")
      && parsed.hostname !== "vercel.app";
  } catch {
    return false;
  }
}

const safeReference = z.string().min(1).max(512).refine((value) => {
  if (value.startsWith("https://")) return isSafeHttpsUrl(value);
  if (value.startsWith("restricted:")) {
    const restrictedPath = value.slice("restricted:".length);
    return /^[a-z0-9][a-z0-9._/-]*$/u.test(restrictedPath)
      && !restrictedPath.includes("..")
      && !restrictedPath.includes("//");
  }
  return /^(?:\.?[A-Za-z0-9_-][A-Za-z0-9._-]*)(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/u.test(value)
    && !value.includes("..");
});

const migrationHead = z.string().regex(/^\d{14}_[a-z0-9_]+$/u);
const sha256Digest = z.string().regex(/^[0-9a-f]{64}$/u);
const vercelProjectIdentifier = z.string()
  .min(8)
  .max(200)
  .regex(/^prj_[A-Za-z0-9]+$/u);
const vercelDeploymentIdentifier = z.string()
  .min(8)
  .max(200)
  .regex(/^dpl_[A-Za-z0-9]+$/u);
const supabaseProjectReference = z.string().regex(/^[a-z0-9]{20}$/u);

export const stagingRuntimeResultSchema = z.object({
  schemaVersion: z.literal(1),
  resultType: z.literal("AGENT_ADS_STAGING_RUNTIME_CONFIG_RESULT"),
  status: z.literal("pass"),
  observedAt: utcTimestamp,
  source: z.object({
    gitRevision: z.string().regex(/^[0-9a-f]{40}$/u),
  }).strict(),
  bindings: z.object({
    vercelProjectIdentifierSha256: sha256Digest,
    vercelDeploymentIdentifierSha256: sha256Digest,
    vercelProjectLinkSha256: sha256Digest,
    supabaseProjectReferenceSha256: sha256Digest,
    supabaseTargetFingerprintSha256: sha256Digest,
  }).strict(),
  counts: z.object({
    failed: z.literal(0),
    passed: z.number().int().positive(),
    skipped: z.literal(0),
    total: z.number().int().positive(),
  }).strict(),
}).strict().superRefine((result, context) => {
  if (result.counts.passed !== result.counts.total) {
    context.addIssue({
      code: "custom",
      message: "Runtime check counts do not match.",
      path: ["counts"],
    });
  }
});

const stagingCheckSchema = z.object({
  id: z.enum(REQUIRED_STAGING_CHECK_IDS),
  requirementIds: z.array(safeIdentifier).min(1).max(12),
  gate: z.enum(["F0", "F1", "STAGING"]),
  ownerRole,
  implementationRef: safeReference,
  testRef: safeReference,
  status: z.enum(["pass", "fail", "blocked", "not_run"]),
  observedAt: utcTimestamp.nullable(),
  evidenceRef: safeReference.nullable(),
  limitationCodes: z.array(safeCode).max(20),
}).strict();

export const stagingEvidenceRecordSchema = z.object({
  schemaVersion: z.literal(2),
  recordType: z.literal("AGENT_ADS_STAGING_EVIDENCE"),
  verificationScope: z.literal("DECLARED_RECORD_ONLY"),
  environment: z.literal("staging"),
  recordedAt: utcTimestamp,
  validUntil: utcTimestamp,
  source: z.object({
    gitRevision: z.string().regex(/^[0-9a-f]{40}$/u),
    artifactIdentifier: safeIdentifier,
  }).strict(),
  target: z.object({
    deploymentOrigin: z.string()
      .max(2048)
      .refine((value) => isSafeHttpsUrl(value, true))
      .refine(isVercelDeploymentOrigin),
    vercelProjectIdentifier,
    vercelDeploymentIdentifier,
    vercelProjectLinkSha256: sha256Digest,
    supabaseProjectReference,
    supabaseTargetFingerprintSha256: sha256Digest,
    postgresMajor: z.number().int().min(15).max(99),
    expectedMigrationHead: migrationHead,
    currentMigrationHead: migrationHead,
    supavisorMode: z.enum(["transaction", "session"]),
    supavisorPort: z.number().int().min(1).max(65535),
  }).strict(),
  runtimeCheck: z.object({
    observedAt: utcTimestamp,
    resultRef: safeReference,
    resultSha256: sha256Digest,
  }).strict(),
  safety: z.object({
    dataClass: z.literal("synthetic-only"),
    providerAccess: z.literal("mock-or-nonproduction"),
    providerMutations: z.literal("disabled"),
    customerMessages: z.literal("disabled"),
  }).strict(),
  recovery: z.object({
    mode: z.enum(["unselected", "same-project-physical", "new-project-physical", "logical"]),
    backupIdentifier: safeIdentifier,
    manifestRevision: safeIdentifier,
    manifestSha256: sha256Digest,
    rollbackArtifactIdentifier: safeIdentifier,
  }).strict(),
  approverRole: ownerRole,
  checks: z.array(stagingCheckSchema).min(1).max(REQUIRED_STAGING_CHECK_IDS.length),
}).strict();

const secretPatterns = [
  /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/iu,
  /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/u,
  /\bbearer\s+[a-zA-Z0-9._~+/=-]{16,}/iu,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/u,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/u,
  /\bsb_secret_[A-Za-z0-9._-]{8,}\b/u,
  /\bre_[A-Za-z0-9_-]{16,}\b/u,
  /\bsk_test_[A-Za-z0-9]{20,}\b/u,
  /\bsk_live_[A-Za-z0-9]{20,}\b/u,
  /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/u,
  /["']?(?:password|passwd|pwd|client[_ -]?secret|access[_ -]?token|refresh[_ -]?token|api[_ -]?key|authorization|cookie)["']?\s*[:=]/iu,
  /:\/\/[^/\s:@]+:[^@\s/]+@/u,
];

export function containsSecretMaterial(value) {
  return secretPatterns.some((pattern) => pattern.test(value));
}

export function containsPercentDecodedSecretMaterial(value) {
  const decoded = decodePercentEncoding(value);
  return decoded !== null && decoded !== value && containsSecretMaterial(decoded);
}
