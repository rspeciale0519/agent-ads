const DATABASE_NAME = "agent_ads_gate0";
const KEY_VERSION = "gate0-local-v1";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]"]);
const POSTGRES_PROTOCOL_PATTERN = /^(?:postgres|postgresql):\/\//u;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SHA_256_PATTERN = /^[0-9a-f]{64}$/u;
const ROLE_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/u;
const FORBIDDEN_LOGIN_ROLES = new Set([
  "anon",
  "app_runtime",
  "app_secret_broker",
  "authenticated",
  "authenticator",
  "dashboard_user",
  "pgbouncer",
  "postgres",
  "service_role",
  "supabase_admin",
]);

const GATE0_ERROR_CODES = Object.freeze({
  ADMIN_POOLER_PORT_FORBIDDEN: "GATE0_ADMIN_POOLER_PORT_FORBIDDEN",
  ADMIN_ROLE_FORBIDDEN: "GATE0_ADMIN_ROLE_FORBIDDEN",
  FINGERPRINT_INVALID: "GATE0_FINGERPRINT_INVALID",
  KEY_VERSION_INVALID: "GATE0_KEY_VERSION_INVALID",
  MARKER_INVALID: "GATE0_MARKER_INVALID",
  MARKER_RUN_ID_COLLISION: "GATE0_MARKER_RUN_ID_COLLISION",
  OPT_IN_REQUIRED: "GATE0_OPT_IN_REQUIRED",
  POOLER_TARGET_MISMATCH: "GATE0_POOLER_TARGET_MISMATCH",
  ROLES_NOT_DISTINCT: "GATE0_ROLES_NOT_DISTINCT",
  ROLE_INVALID: "GATE0_ROLE_INVALID",
  RUN_ID_INVALID: "GATE0_RUN_ID_INVALID",
  TARGET_HOST_MISMATCH: "GATE0_TARGET_HOST_MISMATCH",
  URL_CREDENTIALS_INVALID: "GATE0_URL_CREDENTIALS_INVALID",
  URL_DATABASE_INVALID: "GATE0_URL_DATABASE_INVALID",
  URL_FRAGMENT_FORBIDDEN: "GATE0_URL_FRAGMENT_FORBIDDEN",
  URL_HOST_INVALID: "GATE0_URL_HOST_INVALID",
  URL_INVALID: "GATE0_URL_INVALID",
  URL_PORT_INVALID: "GATE0_URL_PORT_INVALID",
  URL_PROTOCOL_INVALID: "GATE0_URL_PROTOCOL_INVALID",
  URL_QUERY_INVALID: "GATE0_URL_QUERY_INVALID",
  URL_REQUIRED: "GATE0_URL_REQUIRED",
  URL_ROLE_MISMATCH: "GATE0_URL_ROLE_MISMATCH",
});

class Gate0SafetyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Gate0SafetyError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Gate0SafetyError(code, message);
}

function requireExactString(environment, name, code, requirement) {
  const value = environment?.[name];
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    fail(code, `${name} ${requirement}.`);
  }
  return value;
}

function parseRoleSyntaxPreflight(environment, name) {
  const role = requireExactString(
    environment,
    name,
    GATE0_ERROR_CODES.ROLE_INVALID,
    "must be a safe lowercase PostgreSQL login role",
  );
  if (
    !ROLE_PATTERN.test(role)
    || role.startsWith("pg_")
    || role.startsWith("supabase_")
    || FORBIDDEN_LOGIN_ROLES.has(role)
  ) {
    fail(
      GATE0_ERROR_CODES.ROLE_INVALID,
      `${name} must be a safe lowercase PostgreSQL login role.`,
    );
  }
  return role;
}

function rawUrlParts(rawUrl) {
  const schemeEnd = rawUrl.indexOf("://");
  const pathStart = rawUrl.indexOf("/", schemeEnd + 3);
  if (schemeEnd < 0 || pathStart < 0) return null;

  const authority = rawUrl.slice(schemeEnd + 3, pathStart);
  const lastAt = authority.lastIndexOf("@");
  if (lastAt <= 0 || lastAt === authority.length - 1) return null;

  const hostAndPort = authority.slice(lastAt + 1);
  const hostMatch = /^(127\.0\.0\.1|\[::1\])(?::(.*))?$/u.exec(hostAndPort);
  const queryStart = rawUrl.indexOf("?", pathStart);
  const fragmentStart = rawUrl.indexOf("#", pathStart);
  const pathEndCandidates = [queryStart, fragmentStart].filter((index) => index >= 0);
  const pathEnd = pathEndCandidates.length === 0 ? rawUrl.length : Math.min(...pathEndCandidates);
  const queryEnd = fragmentStart >= 0 ? fragmentStart : rawUrl.length;

  return {
    credentialsCanonical: authority.indexOf("@") === lastAt,
    hasQuery: queryStart >= 0,
    host: hostMatch?.[1],
    path: rawUrl.slice(pathStart, pathEnd),
    port: hostMatch?.[2],
    query: queryStart >= 0 ? rawUrl.slice(queryStart + 1, queryEnd) : "",
  };
}

function assertQuery(environmentName, rawQuery, hasQuery, expectedQuery) {
  const expectedEntries = Object.entries(expectedQuery);
  if (expectedEntries.length === 0) {
    if (hasQuery) {
      fail(
        GATE0_ERROR_CODES.URL_QUERY_INVALID,
        `${environmentName} must not contain query options.`,
      );
    }
    return;
  }

  if (!hasQuery || rawQuery === "" || !/^[a-z0-9_=&]+$/u.test(rawQuery)) {
    fail(
      GATE0_ERROR_CODES.URL_QUERY_INVALID,
      `${environmentName} must contain only the approved pooler query options.`,
    );
  }

  const actual = new Map();
  for (const pair of rawQuery.split("&")) {
    const parts = pair.split("=");
    if (parts.length !== 2 || parts[0] === "" || parts[1] === "" || actual.has(parts[0])) {
      fail(
        GATE0_ERROR_CODES.URL_QUERY_INVALID,
        `${environmentName} must contain each approved pooler query option once.`,
      );
    }
    actual.set(parts[0], parts[1]);
  }

  if (
    actual.size !== expectedEntries.length
    || expectedEntries.some(([name, value]) => actual.get(name) !== value)
  ) {
    fail(
      GATE0_ERROR_CODES.URL_QUERY_INVALID,
      `${environmentName} must contain the exact approved pooler query options.`,
    );
  }
}

function parseGate0PostgresUrl(environmentName, rawUrl, options = {}) {
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    fail(GATE0_ERROR_CODES.URL_REQUIRED, `${environmentName} is required.`);
  }
  if (
    rawUrl !== rawUrl.trim()
    || /[\s\\\u007f]/u.test(rawUrl)
  ) {
    fail(GATE0_ERROR_CODES.URL_INVALID, `${environmentName} must be a canonical PostgreSQL URL.`);
  }
  if (!POSTGRES_PROTOCOL_PATTERN.test(rawUrl)) {
    fail(
      GATE0_ERROR_CODES.URL_PROTOCOL_INVALID,
      `${environmentName} must use the postgres or postgresql protocol.`,
    );
  }
  if (rawUrl.includes("#")) {
    fail(
      GATE0_ERROR_CODES.URL_FRAGMENT_FORBIDDEN,
      `${environmentName} must not contain a URL fragment.`,
    );
  }

  const parts = rawUrlParts(rawUrl);
  if (parts && !parts.host) {
    fail(
      GATE0_ERROR_CODES.URL_HOST_INVALID,
      `${environmentName} must use a canonical numeric loopback host.`,
    );
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail(GATE0_ERROR_CODES.URL_INVALID, `${environmentName} must be a valid PostgreSQL URL.`);
  }

  if (!parts || !parts.host || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    fail(
      GATE0_ERROR_CODES.URL_HOST_INVALID,
      `${environmentName} must use a canonical numeric loopback host.`,
    );
  }
  if (
    !parts.port
    || !/^[1-9][0-9]{0,4}$/u.test(parts.port)
    || parsed.port !== String(Number(parts.port))
  ) {
    fail(
      GATE0_ERROR_CODES.URL_PORT_INVALID,
      `${environmentName} must use an explicit canonical TCP port.`,
    );
  }
  const port = Number(parts.port);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    fail(
      GATE0_ERROR_CODES.URL_PORT_INVALID,
      `${environmentName} must use an explicit canonical TCP port.`,
    );
  }
  if (parts.path !== `/${DATABASE_NAME}` || parsed.pathname !== `/${DATABASE_NAME}`) {
    fail(
      GATE0_ERROR_CODES.URL_DATABASE_INVALID,
      `${environmentName} must use the exact ${DATABASE_NAME} database path.`,
    );
  }
  if (
    !parts.credentialsCanonical
    ||
    parsed.username === ""
    || parsed.password === ""
    || parsed.username.includes("%")
    || !ROLE_PATTERN.test(parsed.username)
  ) {
    fail(
      GATE0_ERROR_CODES.URL_CREDENTIALS_INVALID,
      `${environmentName} must contain canonical database login credentials.`,
    );
  }
  let decodedPassword;
  try {
    decodedPassword = decodeURIComponent(parsed.password);
  } catch {
    fail(
      GATE0_ERROR_CODES.URL_CREDENTIALS_INVALID,
      `${environmentName} must contain valid encoded database credentials.`,
    );
  }
  if (/[\u0000-\u001f\u007f]/u.test(decodedPassword)) {
    fail(
      GATE0_ERROR_CODES.URL_CREDENTIALS_INVALID,
      `${environmentName} must not contain control characters in database credentials.`,
    );
  }

  assertQuery(environmentName, parts.query, parts.hasQuery, options.expectedQuery ?? {});

  if (options.expectedRole && parsed.username !== options.expectedRole) {
    fail(
      GATE0_ERROR_CODES.URL_ROLE_MISMATCH,
      `${environmentName} login must match its configured login role.`,
    );
  }

  const connection = {
    database: DATABASE_NAME,
    host: parts.host,
    port,
    username: parsed.username,
  };
  Object.defineProperty(connection, "connectionString", {
    configurable: false,
    enumerable: false,
    value: rawUrl,
    writable: false,
  });
  return Object.freeze(connection);
}

export function parseGate0SafetyEnvironment(environment) {
  if (environment?.GATE0_ALLOW_DISPOSABLE_DATABASE !== "1") {
    fail(
      GATE0_ERROR_CODES.OPT_IN_REQUIRED,
      "GATE0_ALLOW_DISPOSABLE_DATABASE=1 is required.",
    );
  }

  const marker = requireExactString(
    environment,
    "GATE0_DISPOSABLE_MARKER",
    GATE0_ERROR_CODES.MARKER_INVALID,
    "must be a canonical lowercase UUIDv4",
  );
  if (!UUID_V4_PATTERN.test(marker)) {
    fail(
      GATE0_ERROR_CODES.MARKER_INVALID,
      "GATE0_DISPOSABLE_MARKER must be a canonical lowercase UUIDv4.",
    );
  }

  const runId = requireExactString(
    environment,
    "GATE0_RUN_ID",
    GATE0_ERROR_CODES.RUN_ID_INVALID,
    "must be a canonical lowercase UUIDv4",
  );
  if (!UUID_V4_PATTERN.test(runId)) {
    fail(
      GATE0_ERROR_CODES.RUN_ID_INVALID,
      "GATE0_RUN_ID must be a canonical lowercase UUIDv4.",
    );
  }
  if (runId === marker) {
    fail(
      GATE0_ERROR_CODES.MARKER_RUN_ID_COLLISION,
      "GATE0_RUN_ID must differ from GATE0_DISPOSABLE_MARKER.",
    );
  }

  const fingerprint = requireExactString(
    environment,
    "GATE0_TARGET_FINGERPRINT_SHA256",
    GATE0_ERROR_CODES.FINGERPRINT_INVALID,
    "must be a lowercase SHA-256 value",
  );
  if (!SHA_256_PATTERN.test(fingerprint)) {
    fail(
      GATE0_ERROR_CODES.FINGERPRINT_INVALID,
      "GATE0_TARGET_FINGERPRINT_SHA256 must contain 64 lowercase hexadecimal characters.",
    );
  }

  const runtimeRole = parseRoleSyntaxPreflight(environment, "GATE0_RUNTIME_LOGIN_ROLE");
  const brokerRole = parseRoleSyntaxPreflight(environment, "GATE0_BROKER_LOGIN_ROLE");
  if (runtimeRole === brokerRole) {
    fail(
      GATE0_ERROR_CODES.ROLES_NOT_DISTINCT,
      "GATE0_RUNTIME_LOGIN_ROLE and GATE0_BROKER_LOGIN_ROLE must differ.",
    );
  }

  if (environment?.SECRET_BROKER_KEY_VERSION !== KEY_VERSION) {
    fail(
      GATE0_ERROR_CODES.KEY_VERSION_INVALID,
      `SECRET_BROKER_KEY_VERSION must equal ${KEY_VERSION}.`,
    );
  }

  const admin = parseGate0PostgresUrl(
    "GATE0_ADMIN_DATABASE_URL",
    environment?.GATE0_ADMIN_DATABASE_URL,
  );
  const runtime = parseGate0PostgresUrl("DATABASE_URL", environment?.DATABASE_URL, {
    expectedQuery: {
      connection_limit: "4",
      pgbouncer: "true",
      pool_timeout: "10",
    },
    expectedRole: runtimeRole,
  });
  const broker = parseGate0PostgresUrl(
    "SECRET_BROKER_DATABASE_URL",
    environment?.SECRET_BROKER_DATABASE_URL,
    {
      expectedQuery: {
        connection_limit: "2",
        pgbouncer: "true",
        pool_timeout: "10",
      },
      expectedRole: brokerRole,
    },
  );

  if (admin.username === runtimeRole || admin.username === brokerRole) {
    fail(
      GATE0_ERROR_CODES.ADMIN_ROLE_FORBIDDEN,
      "GATE0_ADMIN_DATABASE_URL must not use an application login role.",
    );
  }
  if (admin.host !== runtime.host || admin.host !== broker.host) {
    fail(
      GATE0_ERROR_CODES.TARGET_HOST_MISMATCH,
      "All Gate 0 database URLs must use one exact canonical loopback host.",
    );
  }
  if (admin.port === runtime.port || admin.port === broker.port) {
    fail(
      GATE0_ERROR_CODES.ADMIN_POOLER_PORT_FORBIDDEN,
      "GATE0_ADMIN_DATABASE_URL must use a direct port that differs from pooler ports.",
    );
  }
  if (runtime.host !== broker.host || runtime.port !== broker.port) {
    fail(
      GATE0_ERROR_CODES.POOLER_TARGET_MISMATCH,
      "DATABASE_URL and SECRET_BROKER_DATABASE_URL must use one pooler target.",
    );
  }

  return Object.freeze({
    admin,
    broker,
    brokerRole,
    database: DATABASE_NAME,
    fingerprint,
    keyVersion: KEY_VERSION,
    liveTargetVerified: false,
    marker,
    runId,
    runtime,
    runtimeRole,
    validationScope: "ENVIRONMENT_ONLY",
  });
}
