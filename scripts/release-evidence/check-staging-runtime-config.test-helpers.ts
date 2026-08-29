import path from "node:path";
import { pathToFileURL } from "node:url";

type CheckCounts = {
  failed: number;
  passed: number;
  skipped: number;
  total: number;
};

type CheckResult = {
  codes: readonly string[];
  targetFingerprintSha256: string;
  counts: CheckCounts;
};

type CheckerModule = {
  UNRESOLVED_TARGET_FINGERPRINT_SHA256: string;
  checkStagingRuntimeConfig: (
    environment: Record<string, string | undefined>,
  ) => CheckResult;
};

export const root = process.cwd();
export const checkerPath = path.join(
  root,
  "scripts",
  "release-evidence",
  "check-staging-runtime-config.mjs",
);
export const checkerModule = import(pathToFileURL(checkerPath).href) as Promise<CheckerModule>;
export const projectRef = "abcdefghijklmnopqrst";
export const otherProjectRef = "zyxwvutsrqponmlkjihg";
export const poolerHost = "aws-0-us-east-1.pooler.supabase.com";
export const secretSentinel = "staging-runtime-secret-do-not-log";
export const publishableKey = ["sb", "publishable", "p".repeat(32)].join("_");
export const secretKey = ["sb", "secret", "s".repeat(32)].join("_");
export const strongSecretNames = [
  "SECRET_FINGERPRINT_KEY",
  "OAUTH_STATE_HMAC_KEY",
  "RATE_LIMIT_HMAC_KEY",
  "IDEMPOTENCY_HMAC_KEY",
] as const;

export const requiredVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_STORAGE_BUCKET",
  "DATABASE_URL",
  "SECRET_BROKER_BACKEND",
  "SECRET_BROKER_KEY_VERSION",
  "SECRET_BROKER_DATABASE_URL",
  "SECRET_FINGERPRINT_KEY",
  "OAUTH_STATE_HMAC_KEY",
  "RATE_LIMIT_HMAC_KEY",
  "IDEMPOTENCY_HMAC_KEY",
] as const;

export function databaseUrl(
  principal: string,
  ref = projectRef,
  port = 6543,
  query = databaseQuery(principal === "app_runtime_login" ? 4 : 2),
  database = "postgres",
) {
  return `postgresql://${principal}.${ref}:${secretSentinel}@${poolerHost}:${port}/${database}?${query}`;
}

export function databaseQuery(connectionLimit: number) {
  return [
    "pgbouncer=true",
    `connection_limit=${connectionLimit}`,
    "pool_timeout=10",
    "sslmode=require",
    "sslaccept=strict",
  ].join("&");
}

export function encodedSecret(byte: number, length = 32) {
  return Buffer.alloc(length, byte).toString("base64url");
}

export function validEnvironment(ref = projectRef): Record<string, string | undefined> {
  return {
    ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS: "",
    ACCOUNT_CONNECTIONS_ENABLED: "false",
    ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH: "true",
    DATABASE_URL: databaseUrl("app_runtime_login", ref),
    EMAIL_DELIVERY_MODE: "disabled",
    IDEMPOTENCY_HMAC_KEY: encodedSecret(4),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    OAUTH_STATE_HMAC_KEY: encodedSecret(2),
    RATE_LIMIT_HMAC_KEY: encodedSecret(3),
    SECRET_BROKER_BACKEND: "supabase-vault",
    SECRET_BROKER_DATABASE_URL: databaseUrl("app_secret_broker_login", ref),
    SECRET_BROKER_KEY_VERSION: "staging-v1",
    SECRET_FINGERPRINT_KEY: encodedSecret(1),
    SUPABASE_SECRET_KEY: secretKey,
    SUPABASE_STORAGE_BUCKET: "onboarding-assets-staging",
    SUPABASE_URL: `https://${ref}.supabase.co/`,
  };
}

export function withChange(
  mutate: (environment: Record<string, string | undefined>) => void,
) {
  const environment = validEnvironment();
  mutate(environment);
  return environment;
}

export function codeForRequiredName(name: string) {
  return `STAGING_RUNTIME_CONFIG_${name}_REQUIRED`;
}
