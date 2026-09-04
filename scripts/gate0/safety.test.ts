import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type Gate0SafetyFailure = Error & { code?: string };
type Gate0Connection = {
  connectionString: string;
  database: string;
  host: string;
  port: number;
  username: string;
};
type Gate0Context = {
  admin: Gate0Connection;
  broker: Gate0Connection;
  brokerRole: string;
  database: string;
  fingerprint: string;
  keyVersion: string;
  liveTargetVerified: false;
  marker: string;
  runId: string;
  runtime: Gate0Connection;
  runtimeRole: string;
  validationScope: "ENVIRONMENT_ONLY";
};
type Gate0SafetyModule = {
  parseGate0SafetyEnvironment: (environment: Record<string, string | undefined>) => Gate0Context;
};

const safetyModuleUrl = pathToFileURL(
  path.join(process.cwd(), "scripts", "gate0", "safety.mjs"),
).href;
const safetyModule = import(safetyModuleUrl) as Promise<Gate0SafetyModule>;

const marker = "f0000000-0000-4000-8000-000000000001";
const runId = "a0000000-0000-4000-9000-000000000002";
const secretSentinel = "gate0-secret-do-not-leak";

function validEnvironment(): Record<string, string | undefined> {
  return {
    DATABASE_URL: `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=4&pool_timeout=10`,
    GATE0_ADMIN_DATABASE_URL: `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0`,
    GATE0_ALLOW_DISPOSABLE_DATABASE: "1",
    GATE0_BROKER_LOGIN_ROLE: "gate0_app_secret_broker_login",
    GATE0_DISPOSABLE_MARKER: marker,
    GATE0_RUN_ID: runId,
    GATE0_RUNTIME_LOGIN_ROLE: "gate0_app_runtime_login",
    GATE0_TARGET_FINGERPRINT_SHA256: "a".repeat(64),
    SECRET_BROKER_DATABASE_URL: `postgresql://gate0_app_secret_broker_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`,
    SECRET_BROKER_KEY_VERSION: "gate0-local-v1",
  };
}

function changed(
  mutate: (environment: Record<string, string | undefined>) => void,
): Record<string, string | undefined> {
  const environment = validEnvironment();
  mutate(environment);
  return environment;
}

async function expectRejectedBeforeConnector(
  environment: Record<string, string | undefined>,
  expectedCode: string,
) {
  const { parseGate0SafetyEnvironment } = await safetyModule;
  let connectorCalls = 0;
  let failure: Gate0SafetyFailure | undefined;
  const simulatedConnector = () => {
    connectorCalls += 1;
  };

  try {
    parseGate0SafetyEnvironment(environment);
    simulatedConnector();
  } catch (error) {
    failure = error as Gate0SafetyFailure;
  }

  expect(connectorCalls).toBe(0);
  expect(failure).toBeInstanceOf(Error);
  expect(failure?.code).toBe(expectedCode);
  expect(failure?.message).not.toContain(secretSentinel);
  expect(failure?.message).not.toContain("postgresql://");
}

describe("Gate 0 safety parser", () => {
  it("exports only the environment preflight parser", async () => {
    expect(Object.keys(await safetyModule)).toEqual(["parseGate0SafetyEnvironment"]);
  });

  it("returns environment preflight data without claiming live target verification", async () => {
    const { parseGate0SafetyEnvironment } = await safetyModule;
    const context = parseGate0SafetyEnvironment(validEnvironment());

    expect(context.database).toBe("agent_ads_gate0");
    expect(context.runtime.username).toBe(context.runtimeRole);
    expect(context.broker.username).toBe(context.brokerRole);
    expect(context.admin.port).toBe(5432);
    expect(context.runtime.port).toBe(6543);
    expect(context.validationScope).toBe("ENVIRONMENT_ONLY");
    expect(context.liveTargetVerified).toBe(false);
    expect(Object.isFrozen(context)).toBe(true);
  });

  it("treats safe role syntax as preflight, not database privilege proof", async () => {
    const { parseGate0SafetyEnvironment } = await safetyModule;
    const environment = changed((candidate) => {
      candidate.GATE0_RUNTIME_LOGIN_ROLE = "gate0_runtime";
      candidate.GATE0_BROKER_LOGIN_ROLE = "gate0_broker";
      candidate.DATABASE_URL = `postgresql://gate0_runtime:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=4&pool_timeout=10`;
      candidate.SECRET_BROKER_DATABASE_URL = `postgresql://gate0_broker:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`;
    });

    const context = parseGate0SafetyEnvironment(environment);
    expect(context.runtimeRole).toBe("gate0_runtime");
    expect(context.brokerRole).toBe("gate0_broker");
    expect(context.validationScope).toBe("ENVIRONMENT_ONLY");
    expect(context.liveTargetVerified).toBe(false);
  });

  it("keeps every connection URL non-enumerable and immutable", async () => {
    const { parseGate0SafetyEnvironment } = await safetyModule;
    const context = parseGate0SafetyEnvironment(validEnvironment());

    for (const connection of [context.admin, context.runtime, context.broker]) {
      const descriptor = Object.getOwnPropertyDescriptor(connection, "connectionString");
      expect(descriptor).toEqual({
        configurable: false,
        enumerable: false,
        value: connection.connectionString,
        writable: false,
      });
      expect(connection.connectionString).toContain(secretSentinel);
      expect(Object.keys(connection)).not.toContain("connectionString");
    }
    expect(JSON.stringify(context)).not.toContain(secretSentinel);
  });

  it("accepts canonical IPv6 loopback URLs and query option reordering", async () => {
    const { parseGate0SafetyEnvironment } = await safetyModule;
    const environment = changed((candidate) => {
      candidate.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@[::1]:5432/agent_ads_gate0`;
      candidate.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@[::1]:6543/agent_ads_gate0?pool_timeout=10&pgbouncer=true&connection_limit=4`;
      candidate.SECRET_BROKER_DATABASE_URL = `postgresql://gate0_app_secret_broker_login:${secretSentinel}@[::1]:6543/agent_ads_gate0?connection_limit=2&pool_timeout=10&pgbouncer=true`;
    });

    const context = parseGate0SafetyEnvironment(environment);
    expect(context.admin.host).toBe("[::1]");
    expect(context.runtime.host).toBe("[::1]");
  });

  const invalidContracts: Array<{
    code: string;
    name: string;
    value: Record<string, string | undefined>;
  }> = [
    {
      code: "GATE0_OPT_IN_REQUIRED",
      name: "missing opt-in",
      value: changed((environment) => delete environment.GATE0_ALLOW_DISPOSABLE_DATABASE),
    },
    {
      code: "GATE0_OPT_IN_REQUIRED",
      name: "non-exact opt-in",
      value: changed((environment) => { environment.GATE0_ALLOW_DISPOSABLE_DATABASE = "true"; }),
    },
    {
      code: "GATE0_MARKER_INVALID",
      name: "uppercase marker",
      value: changed((environment) => { environment.GATE0_DISPOSABLE_MARKER = marker.toUpperCase(); }),
    },
    {
      code: "GATE0_MARKER_INVALID",
      name: "non-v4 marker",
      value: changed((environment) => { environment.GATE0_DISPOSABLE_MARKER = "f0000000-0000-3000-8000-000000000001"; }),
    },
    {
      code: "GATE0_RUN_ID_INVALID",
      name: "malformed run id",
      value: changed((environment) => { environment.GATE0_RUN_ID = "not-a-run-id"; }),
    },
    {
      code: "GATE0_MARKER_RUN_ID_COLLISION",
      name: "run id reused as marker",
      value: changed((environment) => { environment.GATE0_RUN_ID = marker; }),
    },
    {
      code: "GATE0_FINGERPRINT_INVALID",
      name: "short target fingerprint",
      value: changed((environment) => { environment.GATE0_TARGET_FINGERPRINT_SHA256 = "a".repeat(63); }),
    },
    {
      code: "GATE0_FINGERPRINT_INVALID",
      name: "uppercase target fingerprint",
      value: changed((environment) => { environment.GATE0_TARGET_FINGERPRINT_SHA256 = "A".repeat(64); }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "unsafe runtime role",
      value: changed((environment) => { environment.GATE0_RUNTIME_LOGIN_ROLE = "gate0-runtime-login"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "permission role used as login",
      value: changed((environment) => { environment.GATE0_RUNTIME_LOGIN_ROLE = "app_runtime"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "reserved role prefix",
      value: changed((environment) => { environment.GATE0_RUNTIME_LOGIN_ROLE = "pg_gate0_login"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "Supabase runtime role prefix",
      value: changed((environment) => { environment.GATE0_RUNTIME_LOGIN_ROLE = "supabase_gate0_login"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "PostgreSQL broker role prefix",
      value: changed((environment) => { environment.GATE0_BROKER_LOGIN_ROLE = "pg_gate0_broker"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "Supabase broker role prefix",
      value: changed((environment) => { environment.GATE0_BROKER_LOGIN_ROLE = "supabase_gate0_broker"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "stable broker permission role",
      value: changed((environment) => { environment.GATE0_BROKER_LOGIN_ROLE = "app_secret_broker"; }),
    },
    {
      code: "GATE0_ROLE_INVALID",
      name: "privileged runtime role",
      value: changed((environment) => { environment.GATE0_RUNTIME_LOGIN_ROLE = "postgres"; }),
    },
    {
      code: "GATE0_ROLES_NOT_DISTINCT",
      name: "duplicate login roles",
      value: changed((environment) => {
        environment.GATE0_BROKER_LOGIN_ROLE = "gate0_app_runtime_login";
      }),
    },
    {
      code: "GATE0_KEY_VERSION_INVALID",
      name: "unexpected broker key version",
      value: changed((environment) => { environment.SECRET_BROKER_KEY_VERSION = "production"; }),
    },
    {
      code: "GATE0_URL_REQUIRED",
      name: "missing admin URL",
      value: changed((environment) => delete environment.GATE0_ADMIN_DATABASE_URL),
    },
    {
      code: "GATE0_URL_INVALID",
      name: "URL with surrounding whitespace",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = ` postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_INVALID",
      name: "URL with an unencoded password space",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:unsafe password@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_PROTOCOL_INVALID",
      name: "unsupported URL protocol",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `https://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "localhost authority",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@localhost:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "short numeric loopback authority",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "integer IPv4 authority",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@2130706433:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "octal IPv4 authority",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@0177.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "hex IPv4 authority",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@0x7f000001:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "loopback authority with trailing dot",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1.:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "IPv4-mapped IPv6 authority",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@[::ffff:127.0.0.1]:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_HOST_INVALID",
      name: "encoded host delimiter",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1%3A5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_PORT_INVALID",
      name: "missing explicit port",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_PORT_INVALID",
      name: "non-canonical port",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:05432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_DATABASE_INVALID",
      name: "wrong database",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/postgres`; }),
    },
    {
      code: "GATE0_URL_DATABASE_INVALID",
      name: "encoded database path",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate%30`; }),
    },
    {
      code: "GATE0_URL_DATABASE_INVALID",
      name: "database path with trailing slash",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0/`; }),
    },
    {
      code: "GATE0_URL_FRAGMENT_FORBIDDEN",
      name: "URL fragment override",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0#host=remote`; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "missing password",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/agent_ads_gate0"; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "empty username",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "encoded NUL in password",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = "postgresql://postgres:safe%00secret@127.0.0.1:5432/agent_ads_gate0"; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "encoded LF in password",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = "postgresql://postgres:safe%0Asecret@127.0.0.1:5432/agent_ads_gate0"; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "encoded CR in password",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = "postgresql://postgres:safe%0Dsecret@127.0.0.1:5432/agent_ads_gate0"; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "encoded DEL in password",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = "postgresql://postgres:safe%7Fsecret@127.0.0.1:5432/agent_ads_gate0"; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "encoded admin username",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://post%67res:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "admin URL query option",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0?pgbouncer=true`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "admin URL empty query delimiter",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0?`; }),
    },
    {
      code: "GATE0_URL_CREDENTIALS_INVALID",
      name: "unencoded credential delimiter",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@extra@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "missing runtime pooler option",
      value: changed((environment) => { environment.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=4`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "extra runtime pooler option",
      value: changed((environment) => { environment.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=disable`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "duplicate runtime pooler option",
      value: changed((environment) => { environment.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&pgbouncer=true&connection_limit=4&pool_timeout=10`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "wrong runtime connection limit",
      value: changed((environment) => { environment.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`; }),
    },
    {
      code: "GATE0_URL_QUERY_INVALID",
      name: "encoded runtime query key",
      value: changed((environment) => { environment.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?%70gbouncer=true&connection_limit=4&pool_timeout=10`; }),
    },
    {
      code: "GATE0_URL_ROLE_MISMATCH",
      name: "runtime URL login mismatch",
      value: changed((environment) => { environment.DATABASE_URL = `postgresql://other_runtime_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=4&pool_timeout=10`; }),
    },
    {
      code: "GATE0_URL_ROLE_MISMATCH",
      name: "broker URL login mismatch",
      value: changed((environment) => { environment.SECRET_BROKER_DATABASE_URL = `postgresql://other_broker_login:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`; }),
    },
    {
      code: "GATE0_ADMIN_ROLE_FORBIDDEN",
      name: "application role used by admin URL",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@127.0.0.1:5432/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_ADMIN_POOLER_PORT_FORBIDDEN",
      name: "admin URL using pooler port",
      value: changed((environment) => { environment.GATE0_ADMIN_DATABASE_URL = `postgresql://postgres:${secretSentinel}@127.0.0.1:6543/agent_ads_gate0`; }),
    },
    {
      code: "GATE0_POOLER_TARGET_MISMATCH",
      name: "broker URL using another pooler port",
      value: changed((environment) => { environment.SECRET_BROKER_DATABASE_URL = `postgresql://gate0_app_secret_broker_login:${secretSentinel}@127.0.0.1:6544/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`; }),
    },
    {
      code: "GATE0_TARGET_HOST_MISMATCH",
      name: "admin and pooler URLs using split loopback hosts",
      value: changed((environment) => {
        environment.DATABASE_URL = `postgresql://gate0_app_runtime_login:${secretSentinel}@[::1]:6543/agent_ads_gate0?pgbouncer=true&connection_limit=4&pool_timeout=10`;
        environment.SECRET_BROKER_DATABASE_URL = `postgresql://gate0_app_secret_broker_login:${secretSentinel}@[::1]:6543/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`;
      }),
    },
    {
      code: "GATE0_TARGET_HOST_MISMATCH",
      name: "runtime and broker URLs using split loopback hosts",
      value: changed((environment) => {
        environment.SECRET_BROKER_DATABASE_URL = `postgresql://gate0_app_secret_broker_login:${secretSentinel}@[::1]:6543/agent_ads_gate0?pgbouncer=true&connection_limit=2&pool_timeout=10`;
      }),
    },
  ];

  for (const contract of invalidContracts) {
    it(`rejects ${contract.name} before the connector runs`, async () => {
      await expectRejectedBeforeConnector(contract.value, contract.code);
    });
  }
});
