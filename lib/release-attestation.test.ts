import { describe, expect, it } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createReleaseAttestation,
  deriveRuntimeTargetFingerprint,
  hashPrivateReleaseBinding,
  ReleaseAttestationError,
} from "./release-attestation";

const projectReference = "abcdefghijklmnopqrst";
const targetEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${projectReference}.supabase.co`,
  SUPABASE_URL: `https://${projectReference}.supabase.co`,
  DATABASE_URL: `postgresql://app_runtime_login.${projectReference}:synthetic-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=require&sslaccept=strict&sslcert=prod-ca-2021.crt`,
  SECRET_BROKER_DATABASE_URL: `postgresql://app_secret_broker_login.${projectReference}:synthetic-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&pool_timeout=10&sslmode=require&sslaccept=strict&sslcert=prod-ca-2021.crt`,
};
const environment = {
  ...targetEnvironment,
  STAGING_RUNTIME_TARGET_FINGERPRINT:
    deriveRuntimeTargetFingerprint(targetEnvironment),
  VERCEL_DEPLOYMENT_ID: "dpl_syntheticdeployment",
  VERCEL_GIT_COMMIT_SHA: "b".repeat(40),
  VERCEL_PROJECT_ID: "prj_syntheticproject",
  VERCEL_TARGET_ENV: "production",
};
const captureModule = import(pathToFileURL(path.join(
  process.cwd(),
  "scripts",
  "release-evidence",
  "capture-staging-runtime-result.mjs",
)).href) as Promise<{
  hashPrivateRuntimeBinding: (label: string, value: string) => string;
}>;

describe("release attestation", () => {
  it("returns only domain-separated bindings", () => {
    const result = createReleaseAttestation(environment);
    expect(result.code).toBe("RELEASE_ATTESTATION_VALID");
    expect(result.bindings.gitRevisionSha256).toBe(
      hashPrivateReleaseBinding("git-revision", environment.VERCEL_GIT_COMMIT_SHA),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(environment.VERCEL_DEPLOYMENT_ID);
    expect(serialized).not.toContain(environment.VERCEL_GIT_COMMIT_SHA);
    expect(serialized).not.toContain(environment.VERCEL_PROJECT_ID);
    expect(serialized).not.toContain(projectReference);
    expect(serialized).not.toContain("pooler.supabase.com");
    expect(serialized).not.toContain("synthetic-password");
    expect(serialized).not.toContain("https://");
  });

  it("uses the same private-binding hashes as release evidence", async () => {
    const { hashPrivateRuntimeBinding } = await captureModule;
    expect(hashPrivateReleaseBinding(
      "vercel-project-identifier",
      environment.VERCEL_PROJECT_ID,
    )).toBe(hashPrivateRuntimeBinding(
      "vercel-project-identifier",
      environment.VERCEL_PROJECT_ID,
    ));
  });

  it("fails closed when one runtime binding is absent or invalid", () => {
    for (const name of Object.keys(environment)) {
      const candidate: Record<string, string | undefined> = { ...environment };
      delete candidate[name];
      expect(() => createReleaseAttestation(candidate)).toThrowError(
        new ReleaseAttestationError("RELEASE_ATTESTATION_NOT_CONFIGURED"),
      );
    }
    expect(() => createReleaseAttestation({
      ...environment,
      VERCEL_TARGET_ENV: "preview",
    })).toThrowError(new ReleaseAttestationError("RELEASE_ATTESTATION_NOT_CONFIGURED"));
  });

  it("rejects a stored fingerprint when the deployed target differs", () => {
    expect(() => createReleaseAttestation({
      ...environment,
      DATABASE_URL: environment.DATABASE_URL.replace(
        projectReference,
        "bcdefghijklmnopqrstu",
      ),
    })).toThrowError(new ReleaseAttestationError(
      "RELEASE_ATTESTATION_NOT_CONFIGURED",
    ));
  });
});
