import { createHash } from "node:crypto";
import { z } from "zod";
import {
  parseDatabaseUrl,
  parseSupabaseUrl,
  targetFingerprint,
  UNRESOLVED_TARGET_FINGERPRINT_SHA256,
} from "../scripts/release-evidence/staging-runtime-targets.mjs";

const runtimeTargetEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).max(2048),
  SUPABASE_URL: z.string().min(1).max(2048),
  DATABASE_URL: z.string().min(1).max(4096),
  SECRET_BROKER_DATABASE_URL: z.string().min(1).max(4096),
}).passthrough();

const attestationEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).max(2048),
  SUPABASE_URL: z.string().min(1).max(2048),
  DATABASE_URL: z.string().min(1).max(4096),
  SECRET_BROKER_DATABASE_URL: z.string().min(1).max(4096),
  STAGING_RUNTIME_TARGET_FINGERPRINT: z.string().regex(/^[0-9a-f]{64}$/u),
  VERCEL_DEPLOYMENT_ID: z.string().min(8).max(200).regex(/^dpl_[A-Za-z0-9]+$/u),
  VERCEL_GIT_COMMIT_SHA: z.string().regex(/^[0-9a-f]{40}$/u),
  VERCEL_PROJECT_ID: z.string().min(8).max(200).regex(/^prj_[A-Za-z0-9]+$/u),
  VERCEL_TARGET_ENV: z.literal("production"),
}).passthrough();

export function deriveRuntimeTargetFingerprint(
  environment: Record<string, string | undefined>,
) {
  const parsed = runtimeTargetEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new ReleaseAttestationError("RELEASE_ATTESTATION_NOT_CONFIGURED");
  }
  const fingerprint = targetFingerprint(
    parseSupabaseUrl(parsed.data.NEXT_PUBLIC_SUPABASE_URL),
    parseSupabaseUrl(parsed.data.SUPABASE_URL),
    parseDatabaseUrl(parsed.data.DATABASE_URL),
    parseDatabaseUrl(parsed.data.SECRET_BROKER_DATABASE_URL),
  );
  if (fingerprint === UNRESOLVED_TARGET_FINGERPRINT_SHA256) {
    throw new ReleaseAttestationError("RELEASE_ATTESTATION_NOT_CONFIGURED");
  }
  return fingerprint;
}

export function hashPrivateReleaseBinding(label: string, value: string) {
  return createHash("sha256").update(JSON.stringify([
    "agent-ads-staging-private-binding-v1",
    label,
    value,
  ]), "utf8").digest("hex");
}

export function createReleaseAttestation(
  environment: Record<string, string | undefined> = process.env,
) {
  const parsed = attestationEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new ReleaseAttestationError("RELEASE_ATTESTATION_NOT_CONFIGURED");
  }
  const runtimeTargetFingerprint = deriveRuntimeTargetFingerprint({
    NEXT_PUBLIC_SUPABASE_URL: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: parsed.data.SUPABASE_URL,
    DATABASE_URL: parsed.data.DATABASE_URL,
    SECRET_BROKER_DATABASE_URL: parsed.data.SECRET_BROKER_DATABASE_URL,
  });
  if (
    runtimeTargetFingerprint
      !== parsed.data.STAGING_RUNTIME_TARGET_FINGERPRINT
  ) {
    throw new ReleaseAttestationError("RELEASE_ATTESTATION_NOT_CONFIGURED");
  }
  return Object.freeze({
    schemaVersion: 1,
    code: "RELEASE_ATTESTATION_VALID",
    bindings: Object.freeze({
      gitRevisionSha256: hashPrivateReleaseBinding(
        "git-revision",
        parsed.data.VERCEL_GIT_COMMIT_SHA,
      ),
      vercelProjectIdentifierSha256: hashPrivateReleaseBinding(
        "vercel-project-identifier",
        parsed.data.VERCEL_PROJECT_ID,
      ),
      vercelDeploymentIdentifierSha256: hashPrivateReleaseBinding(
        "vercel-deployment-identifier",
        parsed.data.VERCEL_DEPLOYMENT_ID,
      ),
      supabaseTargetFingerprintSha256:
        runtimeTargetFingerprint,
      targetEnvironment: parsed.data.VERCEL_TARGET_ENV,
    }),
  });
}

export class ReleaseAttestationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "ReleaseAttestationError";
    this.code = code;
  }
}
