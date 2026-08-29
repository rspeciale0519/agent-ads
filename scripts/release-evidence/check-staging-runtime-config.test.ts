import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  checkerModule,
  checkerPath,
  codeForRequiredName,
  databaseQuery,
  databaseUrl,
  encodedSecret,
  otherProjectRef,
  poolerHost,
  projectRef,
  publishableKey,
  requiredVariables,
  root,
  secretKey,
  secretSentinel,
  strongSecretNames,
  validEnvironment,
  withChange,
} from "./check-staging-runtime-config.test-helpers";

describe("staging runtime configuration checker", () => {
  it("keeps the public module exports stable", async () => {
    const checker = await checkerModule;

    expect(Object.keys(checker).sort()).toEqual([
      "UNRESOLVED_TARGET_FINGERPRINT_SHA256",
      "checkStagingRuntimeConfig",
    ]);
    expect(checker.UNRESOLVED_TARGET_FINGERPRINT_SHA256).toMatch(/^[0-9a-f]{64}$/u);
  }, 20_000);

  it("accepts the disabled core staging configuration", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const result = checkStagingRuntimeConfig(validEnvironment());

    expect(result.codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);
    expect(result.targetFingerprintSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.counts.failed).toBe(0);
    expect(result.counts.skipped).toBe(0);
    expect(result.counts.passed).toBe(result.counts.total);
    expect(Object.keys(result)).toEqual(["codes", "targetFingerprintSha256", "counts"]);
  });

  it("requires every approved core variable without reporting a value", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;

    for (const name of requiredVariables) {
      const environment = validEnvironment();
      delete environment[name];
      const serialized = JSON.stringify(checkStagingRuntimeConfig(environment));
      expect(serialized).toContain(codeForRequiredName(name));
      expect(serialized).not.toContain(secretSentinel);
      expect(serialized).not.toContain(projectRef);
    }
  });

  it("keeps the fingerprint stable when approved secrets change", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const first = checkStagingRuntimeConfig(validEnvironment());
    const changed = validEnvironment();
    changed.SUPABASE_SECRET_KEY = ["sb", "secret", "z".repeat(32)].join("_");
    changed.SECRET_FINGERPRINT_KEY = encodedSecret(9);
    const second = checkStagingRuntimeConfig(changed);

    expect(second.codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);
    expect(second.targetFingerprintSha256).toBe(first.targetFingerprintSha256);
    const otherTarget = checkStagingRuntimeConfig(validEnvironment(otherProjectRef));
    expect(otherTarget.targetFingerprintSha256).not.toBe(first.targetFingerprintSha256);
  });

  it("requires current Supabase publishable and secret key types", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;

    const invalidKeys = [
      "legacy-jwt-value",
      [["eyJ", "legacy"].join(""), "a".repeat(16), "b".repeat(16)].join("."),
      ["sb", "publishable", ""].join("_"),
      ["sb", "secret", ""].join("_"),
      "malformed key with spaces",
    ];
    for (const invalidKey of invalidKeys) {
      const invalid = checkStagingRuntimeConfig(withChange((environment) => {
        environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = invalidKey;
        environment.SUPABASE_SECRET_KEY = invalidKey;
      }));
      expect(invalid.codes).toContain(
        "STAGING_RUNTIME_CONFIG_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_INVALID",
      );
      expect(invalid.codes).toContain("STAGING_RUNTIME_CONFIG_SUPABASE_SECRET_KEY_INVALID");
      expect(JSON.stringify(invalid)).not.toContain(invalidKey);
    }

    const swappedKeys = checkStagingRuntimeConfig(withChange((environment) => {
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = secretKey;
      environment.SUPABASE_SECRET_KEY = publishableKey;
    }));
    expect(swappedKeys.codes).toContain(
      "STAGING_RUNTIME_CONFIG_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_INVALID",
    );
    expect(swappedKeys.codes).toContain("STAGING_RUNTIME_CONFIG_SUPABASE_SECRET_KEY_INVALID");
  });

  it("requires strong and distinct keyed-hash secrets", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;

    for (const name of strongSecretNames) {
      const weak = checkStagingRuntimeConfig(withChange((environment) => {
        environment[name] = encodedSecret(8, 31);
      }));
      expect(weak.codes).toContain(`STAGING_RUNTIME_CONFIG_${name}_STRENGTH_INVALID`);

      const strong = validEnvironment();
      strong[name] = encodedSecret(8, 32);
      const otherNames = strongSecretNames.filter((candidate) => candidate !== name);
      otherNames.forEach((candidate, index) => {
        strong[candidate] = encodedSecret(index + 20);
      });
      expect(checkStagingRuntimeConfig(strong).codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);
    }

    for (let left = 0; left < strongSecretNames.length; left += 1) {
      for (let right = left + 1; right < strongSecretNames.length; right += 1) {
        const duplicate = checkStagingRuntimeConfig(withChange((environment) => {
          environment[strongSecretNames[right]] = environment[strongSecretNames[left]];
        }));
        expect(duplicate.codes).toContain("STAGING_RUNTIME_CONFIG_HMAC_KEYS_NOT_DISTINCT");
      }
    }
  });

  it("requires one consistent Supabase and database target", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;

    const splitSupabase = checkStagingRuntimeConfig(withChange((environment) => {
      environment.SUPABASE_URL = `https://${otherProjectRef}.supabase.co`;
    }));
    expect(splitSupabase.codes).toContain("STAGING_RUNTIME_CONFIG_SUPABASE_TARGET_MISMATCH");
    expect(splitSupabase.codes).toContain("STAGING_RUNTIME_CONFIG_SUPABASE_DATABASE_TARGET_MISMATCH");

    const splitDatabase = checkStagingRuntimeConfig(withChange((environment) => {
      environment.SECRET_BROKER_DATABASE_URL = databaseUrl("app_secret_broker_login", otherProjectRef);
    }));
    expect(splitDatabase.codes).toContain("STAGING_RUNTIME_CONFIG_DATABASE_TARGET_MISMATCH");
    expect(splitDatabase.codes).toContain("STAGING_RUNTIME_CONFIG_SUPABASE_DATABASE_TARGET_MISMATCH");
  });

  it("validates an optional deployed-runtime target fingerprint", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const first = checkStagingRuntimeConfig(validEnvironment());
    const bound = validEnvironment();
    bound.STAGING_RUNTIME_TARGET_FINGERPRINT = first.targetFingerprintSha256;
    expect(checkStagingRuntimeConfig(bound).codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);

    bound.STAGING_RUNTIME_TARGET_FINGERPRINT = "f".repeat(64);
    expect(checkStagingRuntimeConfig(bound).codes).toContain(
      "STAGING_RUNTIME_CONFIG_STAGING_RUNTIME_TARGET_FINGERPRINT_INVALID",
    );
  });

  it("requires the exact database names and login principals", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;

    const privilegedRuntime = checkStagingRuntimeConfig(withChange((environment) => {
      environment.DATABASE_URL = databaseUrl("postgres", projectRef, 6543, databaseQuery(4));
    }));
    expect(privilegedRuntime.codes).toContain(
      "STAGING_RUNTIME_CONFIG_DATABASE_URL_PRINCIPAL_INVALID",
    );

    const arbitraryBroker = checkStagingRuntimeConfig(withChange((environment) => {
      environment.SECRET_BROKER_DATABASE_URL = databaseUrl("another_broker_login");
    }));
    expect(arbitraryBroker.codes).toContain(
      "STAGING_RUNTIME_CONFIG_SECRET_BROKER_DATABASE_URL_PRINCIPAL_INVALID",
    );

    const swapped = checkStagingRuntimeConfig(withChange((environment) => {
      environment.DATABASE_URL = databaseUrl(
        "app_secret_broker_login",
        projectRef,
        6543,
        databaseQuery(4),
      );
      environment.SECRET_BROKER_DATABASE_URL = databaseUrl(
        "app_runtime_login",
        projectRef,
        6543,
        databaseQuery(2),
      );
    }));
    expect(swapped.codes).toContain("STAGING_RUNTIME_CONFIG_DATABASE_URL_PRINCIPAL_INVALID");
    expect(swapped.codes).toContain(
      "STAGING_RUNTIME_CONFIG_SECRET_BROKER_DATABASE_URL_PRINCIPAL_INVALID",
    );

    const wrongDatabase = checkStagingRuntimeConfig(withChange((environment) => {
      environment.DATABASE_URL = databaseUrl(
        "app_runtime_login",
        projectRef,
        6543,
        databaseQuery(4),
        "template1",
      );
    }));
    expect(wrongDatabase.codes).toContain(
      "STAGING_RUNTIME_CONFIG_DATABASE_URL_DATABASE_NAME_INVALID",
    );
  });

  it("requires Supavisor transaction pooling", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;

    const wrongPort = checkStagingRuntimeConfig(withChange((environment) => {
      environment.DATABASE_URL = databaseUrl("app_runtime_login", projectRef, 5432);
    }));
    expect(wrongPort.codes).toContain("STAGING_RUNTIME_CONFIG_DATABASE_URL_PORT_INVALID");

    const noPgbouncer = checkStagingRuntimeConfig(withChange((environment) => {
      environment.SECRET_BROKER_DATABASE_URL = databaseUrl(
        "app_secret_broker_login",
        projectRef,
        6543,
        "connection_limit=2&pool_timeout=10&sslmode=require&sslaccept=strict",
      );
    }));
    expect(noPgbouncer.codes).toContain(
      "STAGING_RUNTIME_CONFIG_SECRET_BROKER_DATABASE_URL_PGBOUNCER_REQUIRED",
    );

    const sharedPrincipal = checkStagingRuntimeConfig(withChange((environment) => {
      environment.SECRET_BROKER_DATABASE_URL = databaseUrl("app_runtime_login");
    }));
    expect(sharedPrincipal.codes).toContain(
      "STAGING_RUNTIME_CONFIG_DATABASE_PRINCIPALS_NOT_DISTINCT",
    );
  });

  it("requires strict encrypted Supavisor query parameters", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const unsafeQueries = [
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_TLS_INVALID",
        query: "pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=disable&sslaccept=strict",
      },
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_QUERY_PARAMETER_FORBIDDEN",
        query: "pgbouncer=true&connection_limit=4&pool_timeout=10&sslaccept=strict",
      },
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_QUERY_PARAMETER_FORBIDDEN",
        query: "pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=require&sslmode=require&sslaccept=strict",
      },
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_TLS_INVALID",
        query: "pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=require&sslaccept=accept_invalid_certs",
      },
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_QUERY_PARAMETER_FORBIDDEN",
        query: "pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=require&sslaccept=strict&schema=public",
      },
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_CONNECTION_LIMIT_INVALID",
        query: "pgbouncer=true&connection_limit=2&pool_timeout=10&sslmode=require&sslaccept=strict",
      },
      {
        code: "STAGING_RUNTIME_CONFIG_DATABASE_URL_POOL_TIMEOUT_INVALID",
        query: "pgbouncer=true&connection_limit=4&pool_timeout=11&sslmode=require&sslaccept=strict",
      },
    ];

    for (const testCase of unsafeQueries) {
      const result = checkStagingRuntimeConfig(withChange((environment) => {
        environment.DATABASE_URL = databaseUrl(
          "app_runtime_login",
          projectRef,
          6543,
          testCase.query,
        );
      }));
      expect(result.codes).toContain(testCase.code);
    }

    const directHost = checkStagingRuntimeConfig(withChange((environment) => {
      environment.DATABASE_URL = `postgresql://app_runtime_login:${secretSentinel}@db.${projectRef}.supabase.co:6543/postgres?${databaseQuery(4)}`;
    }));
    expect(directHost.codes).toContain("STAGING_RUNTIME_CONFIG_DATABASE_URL_POOLER_TYPE_INVALID");

    const reordered = withChange((environment) => {
      environment.DATABASE_URL = databaseUrl(
        "app_runtime_login",
        projectRef,
        6543,
        "sslaccept=strict&pool_timeout=10&pgbouncer=true&sslmode=require&connection_limit=4",
      );
    });
    expect(checkStagingRuntimeConfig(reordered).codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);
  });

  it("requires exact disabled-operation values", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const cases = [
      {
        code: "STAGING_RUNTIME_CONFIG_ACCOUNT_CONNECTIONS_ENABLED_INVALID",
        environment: withChange((candidate) => { candidate.ACCOUNT_CONNECTIONS_ENABLED = "true"; }),
      },
      {
        code: "STAGING_RUNTIME_CONFIG_ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH_INVALID",
        environment: withChange((candidate) => { candidate.ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH = "false"; }),
      },
      {
        code: "STAGING_RUNTIME_CONFIG_ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS_NOT_BLANK",
        environment: withChange((candidate) => { candidate.ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS = " "; }),
      },
      {
        code: "STAGING_RUNTIME_CONFIG_EMAIL_DELIVERY_MODE_INVALID",
        environment: withChange((candidate) => { candidate.EMAIL_DELIVERY_MODE = "enabled"; }),
      },
    ];

    for (const testCase of cases) {
      expect(checkStagingRuntimeConfig(testCase.environment).codes).toContain(testCase.code);
    }
  });

  it("rejects every higher-risk variable category even when its value is blank", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const cases = [
      ["DIRECT_URL", "STAGING_RUNTIME_CONFIG_DIRECT_URL_FORBIDDEN"],
      ["APP_BOOTSTRAP_AUTH_SUBJECT", "STAGING_RUNTIME_CONFIG_APP_BOOTSTRAP_VARIABLE_FORBIDDEN"],
      ["GOOGLE_OAUTH_CLIENT_ID", "STAGING_RUNTIME_CONFIG_PROVIDER_CREDENTIAL_FORBIDDEN"],
      ["ACCOUNT_CONNECTIONS_GOOGLE_ENABLED", "STAGING_RUNTIME_CONFIG_PROVIDER_ENABLEMENT_FORBIDDEN"],
      ["ACCOUNT_CONNECTIONS_MOCK_PROVIDER", "STAGING_RUNTIME_CONFIG_MOCK_PROVIDER_FORBIDDEN"],
      ["ACCOUNT_CONNECTIONS_MAINTENANCE_TOKEN", "STAGING_RUNTIME_CONFIG_MAINTENANCE_CREDENTIAL_FORBIDDEN"],
      ["RESEND_API_KEY", "STAGING_RUNTIME_CONFIG_RESEND_VARIABLE_FORBIDDEN"],
      ["ONBOARDING_NOTIFICATION_EMAIL", "STAGING_RUNTIME_CONFIG_RESEND_VARIABLE_FORBIDDEN"],
      ["SUPABASE_SERVICE_ROLE_KEY", "STAGING_RUNTIME_CONFIG_SUPABASE_SERVICE_ROLE_KEY_FORBIDDEN"],
    ] as const;

    for (const [name, code] of cases) {
      const environment = validEnvironment();
      environment[name] = "";
      expect(checkStagingRuntimeConfig(environment).codes).toContain(code);
    }
  });

  it("rejects all unapproved application and credential variables", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    for (const name of [
      "POSTGRES_URL",
      "PGPASSWORD",
      "SUPABASE_DB_PASSWORD",
      "DATABASE_OWNER_URL",
      "VERCEL_TOKEN",
      "UNREVIEWED_APPLICATION_SETTING",
    ]) {
      const environment = validEnvironment();
      environment[name] = "";
      expect(checkStagingRuntimeConfig(environment).codes).toContain(
        "STAGING_RUNTIME_CONFIG_UNAPPROVED_VARIABLE",
      );
    }
  });

  it("allows only named nonsecret system and Vercel metadata variables", async () => {
    const { checkStagingRuntimeConfig } = await checkerModule;
    const environment = validEnvironment();
    Object.assign(environment, {
      PATH: "synthetic-path",
      SystemRoot: "synthetic-system-root",
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
    });
    expect(checkStagingRuntimeConfig(environment).codes).toEqual(["STAGING_RUNTIME_CONFIG_VALID"]);
  });

  it("writes only one safe JSON result and no diagnostic stream", () => {
    const environment: NodeJS.ProcessEnv = { NODE_ENV: "production" };
    for (const name of ["PATH", "PATHEXT", "SystemRoot", "TEMP", "TMP", "WINDIR"] as const) {
      if (process.env[name] !== undefined) environment[name] = process.env[name];
    }
    Object.assign(environment, validEnvironment());

    const run = spawnSync(process.execPath, [checkerPath], {
      cwd: root,
      encoding: "utf8",
      env: environment,
      windowsHide: true,
    });

    expect(run.status).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout.trim().split(/\r?\n/u)).toHaveLength(1);
    const serialized = run.stdout.trim();
    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized).not.toContain(secretSentinel);
    expect(serialized).not.toContain(projectRef);
    expect(serialized).not.toContain(poolerHost);
    expect(serialized).not.toContain("app_runtime_login");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("length");
  });
});
