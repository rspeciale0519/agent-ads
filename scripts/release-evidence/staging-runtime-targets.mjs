import { createHash } from "node:crypto";
import { exactNonemptyStringSchema } from "./staging-runtime-environment-policy.mjs";

const UNRESOLVED_TARGET = "staging-runtime-target-unresolved-v1";
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/u;
const SHARED_POOLER_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.pooler\.supabase\.com$/u;
const DIRECT_DATABASE_HOST_PATTERN = /^db\.([a-z0-9]{20})\.supabase\.co$/u;
export const EXPECTED_RUNTIME_PRINCIPAL = "app_runtime_login";
export const EXPECTED_BROKER_PRINCIPAL = "app_secret_broker_login";
export const EXPECTED_DATABASE_NAME = "postgres";
const REQUIRED_DATABASE_QUERY_NAMES = Object.freeze([
  "pgbouncer",
  "connection_limit",
  "pool_timeout",
  "sslmode",
  "sslaccept",
  "sslcert",
]);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export const UNRESOLVED_TARGET_FINGERPRINT_SHA256 = sha256(UNRESOLVED_TARGET);

function decodeUrlComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function parseBoundedPositiveInteger(value, maximum) {
  if (!/^[1-9][0-9]*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

export function parseSupabaseUrl(rawValue) {
  if (!exactNonemptyStringSchema.safeParse(rawValue).success) return null;

  try {
    const parsed = new URL(rawValue);
    const hostMatch = /^([a-z0-9]{20})\.supabase\.co$/u.exec(parsed.hostname);
    if (
      parsed.protocol !== "https:"
      || parsed.username !== ""
      || parsed.password !== ""
      || parsed.pathname !== "/"
      || parsed.search !== ""
      || parsed.hash !== ""
      || !hostMatch
    ) return null;

    return Object.freeze({
      host: parsed.hostname,
      projectRef: hostMatch[1],
    });
  } catch {
    return null;
  }
}

export function parseDatabaseUrl(rawValue) {
  if (!exactNonemptyStringSchema.safeParse(rawValue).success) return null;

  try {
    const parsed = new URL(rawValue);
    if (
      !["postgres:", "postgresql:"].includes(parsed.protocol)
      || parsed.username === ""
      || parsed.password === ""
      || parsed.hash !== ""
    ) return null;

    const username = decodeUrlComponent(parsed.username);
    const password = decodeUrlComponent(parsed.password);
    const database = decodeUrlComponent(parsed.pathname.slice(1));
    if (
      username === null
      || password === null
      || database === null
      || username === ""
      || password === ""
      || database === ""
      || database.includes("/")
      || database.includes("\\")
    ) return null;

    let poolerType;
    let principal;
    let projectRef;
    if (SHARED_POOLER_HOST_PATTERN.test(parsed.hostname)) {
      const separator = username.lastIndexOf(".");
      principal = separator > 0 ? username.slice(0, separator) : "";
      projectRef = separator > 0 ? username.slice(separator + 1) : "";
      poolerType = "supavisor";
      if (!PROJECT_REF_PATTERN.test(projectRef)) return null;
    } else {
      const directHostMatch = DIRECT_DATABASE_HOST_PATTERN.exec(parsed.hostname);
      if (!directHostMatch) return null;
      principal = username;
      projectRef = directHostMatch[1];
      poolerType = "direct";
    }

    if (principal === "") return null;
    const queryEntries = [...parsed.searchParams.entries()];
    const queryParametersApproved = !parsed.search.includes("%")
      && queryEntries.length === REQUIRED_DATABASE_QUERY_NAMES.length
      && REQUIRED_DATABASE_QUERY_NAMES.every(
        (name) => parsed.searchParams.getAll(name).length === 1,
      )
      && queryEntries.every(([name]) => REQUIRED_DATABASE_QUERY_NAMES.includes(name));

    const connectionLimit = parseBoundedPositiveInteger(
      parsed.searchParams.get("connection_limit") ?? "",
      10,
    );
    const poolTimeout = parseBoundedPositiveInteger(
      parsed.searchParams.get("pool_timeout") ?? "",
      30,
    );

    return Object.freeze({
      connectionLimit,
      database,
      host: parsed.hostname,
      pgbouncer: parsed.searchParams.getAll("pgbouncer").length === 1
        && parsed.searchParams.get("pgbouncer") === "true",
      poolerType,
      poolTimeout,
      port: parsed.port === "" ? null : Number(parsed.port),
      principal,
      projectRef,
      queryParametersApproved,
      tls: parsed.searchParams.getAll("sslmode").length === 1
        && parsed.searchParams.get("sslmode") === "require"
        && parsed.searchParams.getAll("sslaccept").length === 1
        && parsed.searchParams.get("sslaccept") === "strict"
        && parsed.searchParams.getAll("sslcert").length === 1
        && parsed.searchParams.get("sslcert") === "prod-ca-2021.crt",
    });
  } catch {
    return null;
  }
}

function databaseTargetApproved(target, expectedPrincipal, expectedConnectionLimit) {
  return Boolean(
    target
    && target.poolerType === "supavisor"
    && target.port === 6543
    && target.database === EXPECTED_DATABASE_NAME
    && target.principal === expectedPrincipal
    && target.queryParametersApproved
    && target.pgbouncer
    && target.connectionLimit === expectedConnectionLimit
    && target.poolTimeout === 10
    && target.tls,
  );
}

export function sameDatabaseTarget(left, right) {
  return left.host === right.host
    && left.port === right.port
    && left.database === right.database
    && left.projectRef === right.projectRef;
}

export function targetFingerprint(publicTarget, serverTarget, runtimeTarget, brokerTarget) {
  const targetsReady = Boolean(
    publicTarget
    && serverTarget
    && databaseTargetApproved(runtimeTarget, EXPECTED_RUNTIME_PRINCIPAL, 4)
    && databaseTargetApproved(brokerTarget, EXPECTED_BROKER_PRINCIPAL, 2),
  );
  const targetsMatch = targetsReady
    && publicTarget.projectRef === serverTarget.projectRef
    && sameDatabaseTarget(runtimeTarget, brokerTarget)
    && serverTarget.projectRef === runtimeTarget.projectRef;
  if (!targetsMatch) return UNRESOLVED_TARGET_FINGERPRINT_SHA256;

  return sha256(JSON.stringify([
    "staging-runtime-target-v1",
    serverTarget.host,
    runtimeTarget.host,
    runtimeTarget.port,
    runtimeTarget.database,
    runtimeTarget.projectRef,
  ]));
}
