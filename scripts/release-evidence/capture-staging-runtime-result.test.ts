import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type RuntimeResult = {
  source: { gitRevision: string };
  bindings: {
    vercelProjectIdentifierSha256: string;
    vercelDeploymentIdentifierSha256: string;
    vercelProjectLinkSha256: string;
    supabaseProjectReferenceSha256: string;
    supabaseTargetFingerprintSha256: string;
  };
  counts: { failed: number; passed: number; skipped: number; total: number };
};

type CaptureModule = {
  createStagingRuntimeResult: (input: {
    binding: unknown;
    environment: Record<string, string | undefined>;
    gitRevision: string;
    observedAt: Date;
    projectLink: unknown;
    projectLinkRaw: string;
  }) => RuntimeResult;
};

const root = process.cwd();
const scriptsRoot = path.join(root, "scripts", "release-evidence");
const capturePath = path.join(scriptsRoot, "capture-staging-runtime-result.mjs");
const captureModule = import(pathToFileURL(capturePath).href) as Promise<CaptureModule>;
const projectRef = "abcdefghijklmnopqrst";
const otherProjectRef = "zyxwvutsrqponmlkjihg";
const projectIdentifier = "prj_syntheticproject";
const deploymentIdentifier = "dpl_syntheticdeployment";
const gitRevision = "a".repeat(40);
const poolerHost = "aws-0-us-east-1.pooler.supabase.com";
const databasePassword = "synthetic-database-password";
const publishableKey = ["sb", "publishable", "p".repeat(32)].join("_");
const secretKey = ["sb", "secret", "s".repeat(32)].join("_");

function encodedSecret(byte: number) {
  return Buffer.alloc(32, byte).toString("base64url");
}

function databaseUrl(principal: string, ref: string, connectionLimit: number) {
  return `postgresql://${principal}.${ref}:${databasePassword}@${poolerHost}:6543/postgres?pgbouncer=true&connection_limit=${connectionLimit}&pool_timeout=10&sslmode=require&sslaccept=strict&sslcert=prod-ca-2021.crt`;
}

function validEnvironment(ref = projectRef): Record<string, string | undefined> {
  return {
    ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS: "",
    ACCOUNT_CONNECTIONS_ENABLED: "false",
    ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH: "true",
    DATABASE_URL: databaseUrl("app_runtime_login", ref, 4),
    EMAIL_DELIVERY_MODE: "disabled",
    IDEMPOTENCY_HMAC_KEY: encodedSecret(4),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    OAUTH_STATE_HMAC_KEY: encodedSecret(2),
    RATE_LIMIT_HMAC_KEY: encodedSecret(3),
    SECRET_BROKER_BACKEND: "supabase-vault",
    SECRET_BROKER_DATABASE_URL: databaseUrl("app_secret_broker_login", ref, 2),
    SECRET_BROKER_KEY_VERSION: "staging-v1",
    SECRET_FINGERPRINT_KEY: encodedSecret(1),
    SUPABASE_SECRET_KEY: secretKey,
    SUPABASE_STORAGE_BUCKET: "onboarding-assets-staging",
    SUPABASE_URL: `https://${ref}.supabase.co/`,
  };
}

function binding(revision = gitRevision) {
  return {
    schemaVersion: 1,
    bindingType: "AGENT_ADS_STAGING_RUNTIME_BINDING",
    source: { gitRevision: revision },
    vercel: { projectIdentifier, deploymentIdentifier },
  };
}

function projectLink(projectId = projectIdentifier) {
  return { orgId: "team_synthetic", projectId };
}

describe("staging runtime result capture", () => {
  it("creates only a bound, hashed, no-secret result", async () => {
    const { createStagingRuntimeResult } = await captureModule;
    const result = createStagingRuntimeResult({
      binding: binding(),
      environment: validEnvironment(),
      gitRevision,
      observedAt: new Date("2026-08-28T12:00:00.000Z"),
      projectLink: projectLink(),
      projectLinkRaw: `${JSON.stringify(projectLink())}\n`,
    });

    expect(result.source.gitRevision).toBe(gitRevision);
    expect(result.counts.failed).toBe(0);
    expect(result.counts.skipped).toBe(0);
    expect(result.counts.passed).toBe(result.counts.total);
    Object.values(result.bindings).forEach((digest) => {
      expect(digest).toMatch(/^[0-9a-f]{64}$/u);
    });
    const serialized = JSON.stringify(result);
    for (const privateValue of [
      projectIdentifier,
      deploymentIdentifier,
      projectRef,
      poolerHost,
      databasePassword,
      publishableKey,
      secretKey,
      "app_runtime_login",
    ]) expect(serialized).not.toContain(privateValue);
  }, 20_000);

  it("keeps identity hashes stable across secret rotation", async () => {
    const { createStagingRuntimeResult } = await captureModule;
    const input = {
      binding: binding(),
      gitRevision,
      observedAt: new Date("2026-08-28T12:00:00.000Z"),
      projectLink: projectLink(),
      projectLinkRaw: `${JSON.stringify(projectLink())}\n`,
    };
    const first = createStagingRuntimeResult({ ...input, environment: validEnvironment() });
    const rotated = validEnvironment();
    rotated.SUPABASE_SECRET_KEY = ["sb", "secret", "z".repeat(32)].join("_");
    rotated.SECRET_FINGERPRINT_KEY = encodedSecret(9);
    const second = createStagingRuntimeResult({ ...input, environment: rotated });
    expect(second.bindings).toEqual(first.bindings);

    const otherTarget = createStagingRuntimeResult({
      ...input,
      environment: validEnvironment(otherProjectRef),
    });
    expect(otherTarget.bindings.supabaseProjectReferenceSha256).not.toBe(
      first.bindings.supabaseProjectReferenceSha256,
    );
    expect(otherTarget.bindings.supabaseTargetFingerprintSha256).not.toBe(
      first.bindings.supabaseTargetFingerprintSha256,
    );
  });

  it("rejects Git and linked-project mismatches", async () => {
    const { createStagingRuntimeResult } = await captureModule;
    const common = {
      environment: validEnvironment(),
      gitRevision,
      observedAt: new Date("2026-08-28T12:00:00.000Z"),
      projectLinkRaw: `${JSON.stringify(projectLink())}\n`,
    };
    expect(() => createStagingRuntimeResult({
      ...common,
      binding: binding("b".repeat(40)),
      projectLink: projectLink(),
    })).toThrow("STAGING_RUNTIME_RESULT_REVISION_MISMATCH");
    expect(() => createStagingRuntimeResult({
      ...common,
      binding: binding(),
      projectLink: projectLink("prj_otherproject"),
    })).toThrow("STAGING_RUNTIME_RESULT_PROJECT_MISMATCH");
  });

  it("writes once and rejects duplicate-key bindings", () => {
    const harnessParent = path.join(root, "docs", "temp", "release-evidence");
    mkdirSync(harnessParent, { recursive: true });
    const harness = mkdtempSync(path.join(harnessParent, "capture-repository-"));
    try {
      const harnessScripts = path.join(harness, "scripts", "release-evidence");
      const privateRoot = path.join(harness, "docs", "temp", "release-evidence");
      mkdirSync(harnessScripts, { recursive: true });
      mkdirSync(privateRoot, { recursive: true });
      mkdirSync(path.join(harness, ".vercel"), { recursive: true });
      for (const name of [
        "capture-staging-runtime-result.mjs",
        "check-staging-runtime-config.mjs",
        "staging-runtime-environment-policy.mjs",
        "staging-runtime-targets.mjs",
        "staging-record-schema.mjs",
        "strict-json.mjs",
      ]) copyFileSync(path.join(scriptsRoot, name), path.join(harnessScripts, name));
      writeFileSync(
        path.join(harness, ".gitignore"),
        "docs/temp/release-evidence/\n.vercel/\n",
        "utf8",
      );

      const git = (args: string[]) => spawnSync("git", args, {
        cwd: harness,
        encoding: "utf8",
        windowsHide: true,
      });
      expect(git(["init"]).status).toBe(0);
      expect(git(["config", "user.name", "Capture Test"]).status).toBe(0);
      expect(git(["config", "user.email", "capture@example.invalid"]).status).toBe(0);
      expect(git(["config", "core.autocrlf", "false"]).status).toBe(0);
      expect(git(["add", ".gitignore", "scripts/release-evidence"]).status).toBe(0);
      expect(git(["-c", "commit.gpgSign=false", "commit", "-m", "capture fixture"]).status).toBe(0);
      const head = git(["rev-parse", "HEAD"]).stdout.trim();

      const harnessProject = projectLink();
      writeFileSync(
        path.join(harness, ".vercel", "project.json"),
        `${JSON.stringify(harnessProject)}\n`,
        "utf8",
      );
      const bindingFile = path.join(privateRoot, "binding.json");
      const resultFile = path.join(privateRoot, "result.json");
      writeFileSync(bindingFile, `${JSON.stringify(binding(head))}\n`, "utf8");

      const environment: NodeJS.ProcessEnv = { NODE_ENV: "production", ...validEnvironment() };
      for (const name of ["PATH", "PATHEXT", "SystemRoot", "TEMP", "TMP", "WINDIR"] as const) {
        if (process.env[name] !== undefined) environment[name] = process.env[name];
      }
      const run = (bindingPath: string, outputPath: string) => spawnSync(
        process.execPath,
        [
          path.join(harnessScripts, "capture-staging-runtime-result.mjs"),
          "--binding-file",
          bindingPath,
          "--result-file",
          outputPath,
        ],
        { cwd: harness, encoding: "utf8", env: environment, windowsHide: true },
      );

      const first = run(bindingFile, resultFile);
      expect(first.status).toBe(0);
      expect(first.stdout.trim()).toBe('{"code":"STAGING_RUNTIME_RESULT_WRITTEN"}');
      const rawResult = readFileSync(resultFile, "utf8");
      expect(rawResult).not.toContain(projectIdentifier);
      expect(rawResult).not.toContain(deploymentIdentifier);
      expect(run(bindingFile, resultFile).stderr).toContain(
        "STAGING_RUNTIME_RESULT_ALREADY_EXISTS",
      );

      const duplicateBinding = path.join(privateRoot, "duplicate-binding.json");
      const duplicateRaw = JSON.stringify(binding(head)).replace(
        `"projectIdentifier":"${projectIdentifier}"`,
        `"projectIdentifier":"${projectIdentifier}","projectIdentifier":"${projectIdentifier}"`,
      );
      writeFileSync(duplicateBinding, `${duplicateRaw}\n`, "utf8");
      const duplicateRun = run(duplicateBinding, path.join(privateRoot, "duplicate-result.json"));
      expect(duplicateRun.status).toBe(1);
      expect(duplicateRun.stderr).toContain("STAGING_RUNTIME_RESULT_BINDING_DUPLICATE_KEY");
      expect(duplicateRun.stderr).not.toContain(projectIdentifier);
    } finally {
      rmSync(harness, { recursive: true, force: true });
    }
  }, 30_000);
});
