import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { deriveRuntimeTargetFingerprint } from "../../../../lib/release-attestation";
import { GET } from "./route";

const managedNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "DATABASE_URL",
  "SECRET_BROKER_DATABASE_URL",
  "STAGING_RUNTIME_TARGET_FINGERPRINT",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_PROJECT_ID",
  "VERCEL_TARGET_ENV",
] as const;
const projectReference = "abcdefghijklmnopqrst";
const targetEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${projectReference}.supabase.co`,
  SUPABASE_URL: `https://${projectReference}.supabase.co`,
  DATABASE_URL: `postgresql://app_runtime_login.${projectReference}:synthetic-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=4&pool_timeout=10&sslmode=require&sslaccept=strict`,
  SECRET_BROKER_DATABASE_URL: `postgresql://app_secret_broker_login.${projectReference}:synthetic-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&pool_timeout=10&sslmode=require&sslaccept=strict`,
};
const originalEnvironment = Object.fromEntries(
  managedNames.map((name) => [name, process.env[name]]),
);

function setValidEnvironment() {
  Object.assign(process.env, targetEnvironment);
  process.env.STAGING_RUNTIME_TARGET_FINGERPRINT =
    deriveRuntimeTargetFingerprint(targetEnvironment);
  process.env.VERCEL_DEPLOYMENT_ID = "dpl_syntheticdeployment";
  process.env.VERCEL_GIT_COMMIT_SHA = "b".repeat(40);
  process.env.VERCEL_PROJECT_ID = "prj_syntheticproject";
  process.env.VERCEL_TARGET_ENV = "production";
}

beforeEach(setValidEnvironment);

afterAll(() => {
  for (const name of managedNames) {
    const value = originalEnvironment[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("release attestation route", () => {
  it("returns a no-store attestation without raw identifiers", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(body.code).toBe("RELEASE_ATTESTATION_VALID");

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("dpl_syntheticdeployment");
    expect(serialized).not.toContain("prj_syntheticproject");
    expect(serialized).not.toContain("b".repeat(40));
    expect(serialized).not.toContain(projectReference);
    expect(serialized).not.toContain("synthetic-password");
  });

  it("fails closed with no-store headers when configuration is missing", async () => {
    delete process.env.VERCEL_DEPLOYMENT_ID;

    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "RELEASE_ATTESTATION_UNAVAILABLE",
    });
  });

  it("fails closed when the deployed target does not match its fingerprint", async () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL?.replace(
      projectReference,
      "bcdefghijklmnopqrstu",
    );

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "RELEASE_ATTESTATION_UNAVAILABLE",
    });
  });
});
