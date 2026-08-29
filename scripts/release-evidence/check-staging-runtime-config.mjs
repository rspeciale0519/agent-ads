import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  environmentSchema,
  hasConfiguredVariable,
  hasExactNonemptyValue,
  hasForbiddenName,
  isApprovedEnvironmentName,
  isProviderCredentialVariable,
  publishableKeySchema,
  REQUIRED_VARIABLES,
  secretKeySchema,
  STRONG_SECRET_VARIABLES,
  strongSecretSchema,
} from "./staging-runtime-environment-policy.mjs";
import {
  EXPECTED_BROKER_PRINCIPAL,
  EXPECTED_DATABASE_NAME,
  EXPECTED_RUNTIME_PRINCIPAL,
  parseDatabaseUrl,
  parseSupabaseUrl,
  sameDatabaseTarget,
  targetFingerprint,
  UNRESOLVED_TARGET_FINGERPRINT_SHA256,
} from "./staging-runtime-targets.mjs";

const CODE_PREFIX = "STAGING_RUNTIME_CONFIG";
const VALID_CODE = `${CODE_PREFIX}_VALID`;

export { UNRESOLVED_TARGET_FINGERPRINT_SHA256 };

function makeCollector() {
  const codes = [];
  const counts = {
    failed: 0,
    passed: 0,
    skipped: 0,
    total: 0,
  };

  function record(code, passed) {
    counts.total += 1;
    if (passed) {
      counts.passed += 1;
      return;
    }
    counts.failed += 1;
    codes.push(code);
  }

  function recordWhen(code, ready, passed) {
    counts.total += 1;
    if (!ready) {
      counts.skipped += 1;
      return;
    }
    if (passed) {
      counts.passed += 1;
      return;
    }
    counts.failed += 1;
    codes.push(code);
  }

  return { codes, counts, record, recordWhen };
}

function recordDatabaseTargetChecks(
  collector,
  variableName,
  target,
  expectedPrincipal,
  expectedConnectionLimit,
) {
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_POOLER_TYPE_INVALID`,
    target !== null,
    target?.poolerType === "supavisor",
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_PORT_INVALID`,
    target !== null,
    target?.port === 6543,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_DATABASE_NAME_INVALID`,
    target !== null,
    target?.database === EXPECTED_DATABASE_NAME,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_PRINCIPAL_INVALID`,
    target !== null,
    target?.principal === expectedPrincipal,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_QUERY_PARAMETER_FORBIDDEN`,
    target !== null,
    target?.queryParametersApproved === true,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_PGBOUNCER_REQUIRED`,
    target !== null,
    target?.pgbouncer === true,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_CONNECTION_LIMIT_INVALID`,
    target !== null,
    target?.connectionLimit === expectedConnectionLimit,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_POOL_TIMEOUT_INVALID`,
    target !== null,
    target?.poolTimeout === 10,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_${variableName}_TLS_INVALID`,
    target !== null,
    target?.tls === true,
  );
}

export function checkStagingRuntimeConfig(environment = process.env) {
  const collector = makeCollector();
  const environmentInput = environment !== null && typeof environment === "object"
    ? Object.fromEntries(Object.entries(environment))
    : environment;
  const parsedEnvironment = environmentSchema.safeParse(environmentInput);
  collector.record(`${CODE_PREFIX}_ENVIRONMENT_INVALID`, parsedEnvironment.success);
  const safeEnvironment = parsedEnvironment.success ? parsedEnvironment.data : {};
  collector.record(
    `${CODE_PREFIX}_UNAPPROVED_VARIABLE`,
    Object.keys(safeEnvironment).every(
      (name) => !hasConfiguredVariable(safeEnvironment, name) || isApprovedEnvironmentName(name),
    ),
  );

  for (const name of REQUIRED_VARIABLES) {
    collector.record(
      `${CODE_PREFIX}_${name}_REQUIRED`,
      hasExactNonemptyValue(safeEnvironment, name),
    );
  }

  collector.recordWhen(
    `${CODE_PREFIX}_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    publishableKeySchema.safeParse(
      safeEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ).success,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_SUPABASE_SECRET_KEY_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "SUPABASE_SECRET_KEY"),
    secretKeySchema.safeParse(safeEnvironment.SUPABASE_SECRET_KEY).success,
  );

  for (const name of STRONG_SECRET_VARIABLES) {
    collector.recordWhen(
      `${CODE_PREFIX}_${name}_STRENGTH_INVALID`,
      hasExactNonemptyValue(safeEnvironment, name),
      strongSecretSchema.safeParse(safeEnvironment[name]).success,
    );
  }
  const strongSecretsReady = STRONG_SECRET_VARIABLES.every(
    (name) => strongSecretSchema.safeParse(safeEnvironment[name]).success,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_HMAC_KEYS_NOT_DISTINCT`,
    strongSecretsReady,
    new Set(STRONG_SECRET_VARIABLES.map((name) => safeEnvironment[name])).size
      === STRONG_SECRET_VARIABLES.length,
  );

  collector.recordWhen(
    `${CODE_PREFIX}_SECRET_BROKER_BACKEND_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "SECRET_BROKER_BACKEND"),
    safeEnvironment.SECRET_BROKER_BACKEND === "supabase-vault",
  );
  collector.record(
    `${CODE_PREFIX}_ACCOUNT_CONNECTIONS_ENABLED_INVALID`,
    safeEnvironment.ACCOUNT_CONNECTIONS_ENABLED === "false",
  );
  collector.record(
    `${CODE_PREFIX}_ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH_INVALID`,
    safeEnvironment.ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH === "true",
  );
  collector.record(
    `${CODE_PREFIX}_ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS_NOT_BLANK`,
    safeEnvironment.ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS === undefined
      || safeEnvironment.ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS === "",
  );
  collector.record(
    `${CODE_PREFIX}_EMAIL_DELIVERY_MODE_INVALID`,
    safeEnvironment.EMAIL_DELIVERY_MODE === "disabled",
  );

  const publicTarget = parseSupabaseUrl(safeEnvironment.NEXT_PUBLIC_SUPABASE_URL);
  const serverTarget = parseSupabaseUrl(safeEnvironment.SUPABASE_URL);
  const runtimeTarget = parseDatabaseUrl(safeEnvironment.DATABASE_URL);
  const brokerTarget = parseDatabaseUrl(safeEnvironment.SECRET_BROKER_DATABASE_URL);
  const resolvedTargetFingerprint = targetFingerprint(
    publicTarget,
    serverTarget,
    runtimeTarget,
    brokerTarget,
  );
  if (hasConfiguredVariable(safeEnvironment, "STAGING_RUNTIME_TARGET_FINGERPRINT")) {
    collector.record(
      `${CODE_PREFIX}_STAGING_RUNTIME_TARGET_FINGERPRINT_INVALID`,
      /^[0-9a-f]{64}$/u.test(safeEnvironment.STAGING_RUNTIME_TARGET_FINGERPRINT ?? "")
        && safeEnvironment.STAGING_RUNTIME_TARGET_FINGERPRINT === resolvedTargetFingerprint
        && resolvedTargetFingerprint !== UNRESOLVED_TARGET_FINGERPRINT_SHA256,
    );
  }

  collector.recordWhen(
    `${CODE_PREFIX}_NEXT_PUBLIC_SUPABASE_URL_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "NEXT_PUBLIC_SUPABASE_URL"),
    publicTarget !== null,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_SUPABASE_URL_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "SUPABASE_URL"),
    serverTarget !== null,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_DATABASE_URL_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "DATABASE_URL"),
    runtimeTarget !== null,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_SECRET_BROKER_DATABASE_URL_INVALID`,
    hasExactNonemptyValue(safeEnvironment, "SECRET_BROKER_DATABASE_URL"),
    brokerTarget !== null,
  );
  recordDatabaseTargetChecks(
    collector,
    "DATABASE_URL",
    runtimeTarget,
    EXPECTED_RUNTIME_PRINCIPAL,
    4,
  );
  recordDatabaseTargetChecks(
    collector,
    "SECRET_BROKER_DATABASE_URL",
    brokerTarget,
    EXPECTED_BROKER_PRINCIPAL,
    2,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_SUPABASE_TARGET_MISMATCH`,
    Boolean(publicTarget && serverTarget),
    publicTarget?.projectRef === serverTarget?.projectRef,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_DATABASE_TARGET_MISMATCH`,
    Boolean(runtimeTarget && brokerTarget),
    runtimeTarget && brokerTarget ? sameDatabaseTarget(runtimeTarget, brokerTarget) : false,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_DATABASE_PRINCIPALS_NOT_DISTINCT`,
    Boolean(runtimeTarget && brokerTarget),
    runtimeTarget?.principal !== brokerTarget?.principal,
  );
  collector.recordWhen(
    `${CODE_PREFIX}_SUPABASE_DATABASE_TARGET_MISMATCH`,
    Boolean(serverTarget && runtimeTarget && brokerTarget),
    serverTarget?.projectRef === runtimeTarget?.projectRef
      && serverTarget?.projectRef === brokerTarget?.projectRef,
  );

  collector.record(
    `${CODE_PREFIX}_DIRECT_URL_FORBIDDEN`,
    !hasConfiguredVariable(safeEnvironment, "DIRECT_URL"),
  );
  collector.record(
    `${CODE_PREFIX}_APP_BOOTSTRAP_VARIABLE_FORBIDDEN`,
    !hasForbiddenName(safeEnvironment, (name) => name.startsWith("APP_BOOTSTRAP_")),
  );
  collector.record(
    `${CODE_PREFIX}_PROVIDER_CREDENTIAL_FORBIDDEN`,
    !hasForbiddenName(safeEnvironment, isProviderCredentialVariable),
  );
  collector.record(
    `${CODE_PREFIX}_PROVIDER_ENABLEMENT_FORBIDDEN`,
    !hasForbiddenName(
      safeEnvironment,
      (name) => /^ACCOUNT_CONNECTIONS_[A-Z0-9_]+_ENABLED$/u.test(name),
    ),
  );
  collector.record(
    `${CODE_PREFIX}_MOCK_PROVIDER_FORBIDDEN`,
    !hasConfiguredVariable(safeEnvironment, "ACCOUNT_CONNECTIONS_MOCK_PROVIDER"),
  );
  collector.record(
    `${CODE_PREFIX}_MAINTENANCE_CREDENTIAL_FORBIDDEN`,
    !hasConfiguredVariable(safeEnvironment, "ACCOUNT_CONNECTIONS_MAINTENANCE_TOKEN"),
  );
  collector.record(
    `${CODE_PREFIX}_RESEND_VARIABLE_FORBIDDEN`,
    !hasForbiddenName(
      safeEnvironment,
      (name) => name.startsWith("RESEND_") || name === "ONBOARDING_NOTIFICATION_EMAIL",
    ),
  );
  collector.record(
    `${CODE_PREFIX}_SUPABASE_SERVICE_ROLE_KEY_FORBIDDEN`,
    !hasConfiguredVariable(safeEnvironment, "SUPABASE_SERVICE_ROLE_KEY"),
  );

  const codes = collector.codes.length === 0
    ? [VALID_CODE]
    : [...collector.codes].sort();
  return Object.freeze({
    codes: Object.freeze(codes),
    targetFingerprintSha256: resolvedTargetFingerprint,
    counts: Object.freeze({ ...collector.counts }),
  });
}

function internalFailureResult() {
  return {
    codes: [`${CODE_PREFIX}_INTERNAL_ERROR`],
    targetFingerprintSha256: UNRESOLVED_TARGET_FINGERPRINT_SHA256,
    counts: {
      failed: 1,
      passed: 0,
      skipped: 0,
      total: 1,
    },
  };
}

const invokedPath = process.argv[1];
const invokedDirectly = typeof invokedPath === "string"
  && pathToFileURL(resolve(invokedPath)).href === import.meta.url;

if (invokedDirectly) {
  let result;
  try {
    result = checkStagingRuntimeConfig(process.env);
  } catch {
    result = internalFailureResult();
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.codes.length === 1 && result.codes[0] === VALID_CODE ? 0 : 1;
}
