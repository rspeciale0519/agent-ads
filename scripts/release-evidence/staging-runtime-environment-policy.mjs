import { z } from "zod";

const SUPABASE_PUBLISHABLE_KEY_PATTERN = /^sb_publishable_[A-Za-z0-9_-]{20,}$/u;
const SUPABASE_SECRET_KEY_PATTERN = /^sb_secret_[A-Za-z0-9_-]{20,}$/u;

export const STRONG_SECRET_VARIABLES = Object.freeze([
  "SECRET_FINGERPRINT_KEY",
  "OAUTH_STATE_HMAC_KEY",
  "RATE_LIMIT_HMAC_KEY",
  "IDEMPOTENCY_HMAC_KEY",
]);

export const environmentSchema = z.record(
  z.string(),
  z.union([z.string(), z.undefined()]),
);
export const exactNonemptyStringSchema = z.string()
  .min(1)
  .refine((value) => value === value.trim());
export const publishableKeySchema = exactNonemptyStringSchema.regex(
  SUPABASE_PUBLISHABLE_KEY_PATTERN,
);
export const secretKeySchema = exactNonemptyStringSchema.regex(
  SUPABASE_SECRET_KEY_PATTERN,
);
export const strongSecretSchema = exactNonemptyStringSchema.refine(hasStrongEncodedSecret);

export const REQUIRED_VARIABLES = Object.freeze([
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
]);

const APPROVED_APPLICATION_VARIABLES = new Set([
  ...REQUIRED_VARIABLES,
  "ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS",
  "ACCOUNT_CONNECTIONS_ENABLED",
  "ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH",
  "EMAIL_DELIVERY_MODE",
  "STAGING_RUNTIME_TARGET_FINGERPRINT",
]);

const SAFE_SYSTEM_VARIABLES = new Set([
  "ALLUSERSPROFILE",
  "APPDATA",
  "CI",
  "COLORTERM",
  "COMMONPROGRAMFILES",
  "COMMONPROGRAMFILES(X86)",
  "COMMONPROGRAMW6432",
  "COMPUTERNAME",
  "COMSPEC",
  "DRIVERDATA",
  "FORCE_COLOR",
  "GPG_TTY",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "HOST",
  "HOSTNAME",
  "LANG",
  "LC_ALL",
  "LOCALAPPDATA",
  "LOGNAME",
  "LOGONSERVER",
  "NODE_ENV",
  "NO_COLOR",
  "NUMBER_OF_PROCESSORS",
  "OLDPWD",
  "ONEDRIVE",
  "OS",
  "PATH",
  "PATHEXT",
  "PROCESSOR_ARCHITECTURE",
  "PROCESSOR_IDENTIFIER",
  "PROCESSOR_LEVEL",
  "PROCESSOR_REVISION",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "PROGRAMW6432",
  "PROMPT",
  "PSMODULEPATH",
  "PUBLIC",
  "PWD",
  "SHELL",
  "SHLVL",
  "SSH_AGENT_PID",
  "SSH_AUTH_SOCK",
  "SYSTEMDRIVE",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "TZ",
  "USER",
  "USERDOMAIN",
  "USERDOMAIN_ROAMINGPROFILE",
  "USERNAME",
  "USERPROFILE",
  "VERCEL",
  "VERCEL_BRANCH_URL",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_ENV",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_REGION",
  "VERCEL_TARGET_ENV",
  "VERCEL_URL",
  "VISUAL",
  "WINDIR",
  "WT_PROFILE_ID",
  "WT_SESSION",
  "_",
]);

const SAFE_SYSTEM_VARIABLE_PATTERNS = Object.freeze([
  /^LC_[A-Z0-9_]+$/u,
  /^TERM_[A-Z0-9_]+$/u,
  /^XDG_[A-Z0-9_]+$/u,
  /^VERCEL_GIT_(?:PROVIDER|REPO_SLUG|REPO_OWNER|REPO_ID|COMMIT_REF|COMMIT_SHA|COMMIT_MESSAGE|COMMIT_AUTHOR_LOGIN|COMMIT_AUTHOR_NAME)$/u,
]);

const PROVIDER_CREDENTIAL_VARIABLES = new Set([
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "META_APP_ID",
  "META_APP_SECRET",
  "TIKTOK_APP_ID",
  "TIKTOK_CLIENT_KEY",
  "TIKTOK_CLIENT_SECRET",
]);

export function hasConfiguredVariable(environment, name) {
  return typeof environment[name] === "string";
}

export function hasExactNonemptyValue(environment, name) {
  return exactNonemptyStringSchema.safeParse(environment[name]).success;
}

function hasStrongEncodedSecret(value) {
  if (!exactNonemptyStringSchema.safeParse(value).success) return false;
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return false;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.length >= 32 && decoded.toString("base64url") === value;
  } catch {
    return false;
  }
}

export function isApprovedEnvironmentName(name) {
  if (APPROVED_APPLICATION_VARIABLES.has(name)) return true;
  const normalized = name.toUpperCase();
  return SAFE_SYSTEM_VARIABLES.has(normalized)
    || SAFE_SYSTEM_VARIABLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasForbiddenName(environment, predicate) {
  return Object.keys(environment).some(
    (name) => hasConfiguredVariable(environment, name) && predicate(name),
  );
}

export function isProviderCredentialVariable(name) {
  return PROVIDER_CREDENTIAL_VARIABLES.has(name);
}
