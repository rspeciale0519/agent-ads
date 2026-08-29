import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { checkStagingRuntimeConfig } from "./check-staging-runtime-config.mjs";
import {
  containsPercentDecodedSecretMaterial,
  containsSecretMaterial,
  stagingRuntimeResultSchema,
} from "./staging-record-schema.mjs";
import { parseStrictJson, StrictJsonError } from "./strict-json.mjs";

const CAPTURE_FILE = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = realpathSync(path.resolve(path.dirname(CAPTURE_FILE), "..", ".."));
const PRIVATE_EVIDENCE_ROOT = path.join(REPOSITORY_ROOT, "docs", "temp", "release-evidence");
const PROJECT_LINK_PATH = path.join(REPOSITORY_ROOT, ".vercel", "project.json");
const MAX_PRIVATE_INPUT_BYTES = 32 * 1024;
const MAX_PROJECT_LINK_BYTES = 16 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const bindingSchema = z.object({
  schemaVersion: z.literal(1),
  bindingType: z.literal("AGENT_ADS_STAGING_RUNTIME_BINDING"),
  source: z.object({
    gitRevision: z.string().regex(SHA_PATTERN),
  }).strict(),
  vercel: z.object({
    projectIdentifier: z.string().min(8).max(200).regex(/^prj_[A-Za-z0-9]+$/u),
    deploymentIdentifier: z.string().min(8).max(200).regex(/^dpl_[A-Za-z0-9]+$/u),
  }).strict(),
}).strict();
const projectLinkSchema = z.object({
  orgId: z.string().min(1).max(200),
  projectId: z.string().min(8).max(200).regex(/^prj_[A-Za-z0-9]+$/u),
}).passthrough();

const gitEnvironment = Object.freeze(Object.assign(
  Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^GIT_/iu.test(key)),
  ),
  {
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : os.devNull,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  },
));

class RuntimeCaptureError extends Error {
  constructor(code) {
    super(code);
    this.name = "RuntimeCaptureError";
    this.code = code;
  }
}

function fail(code) {
  throw new RuntimeCaptureError(code);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashPrivateRuntimeBinding(label, value) {
  return sha256(JSON.stringify([
    "agent-ads-staging-private-binding-v1",
    label,
    value,
  ]));
}

function isOutside(base, target) {
  const relative = path.relative(base, target);
  return path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`);
}

function runGit(args) {
  return spawnSync("git", ["-C", REPOSITORY_ROOT, ...args], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    env: gitEnvironment,
    windowsHide: true,
    maxBuffer: 64 * 1024,
  });
}

function requirePrivateIgnoredPath(candidate, mustExist) {
  const resolvedCandidate = path.resolve(REPOSITORY_ROOT, candidate);
  if (isOutside(PRIVATE_EVIDENCE_ROOT, resolvedCandidate)) {
    fail("STAGING_RUNTIME_RESULT_PATH_NOT_ALLOWED");
  }

  if (mustExist) {
    let stat;
    let resolved;
    try {
      stat = lstatSync(resolvedCandidate);
      resolved = realpathSync(resolvedCandidate);
    } catch {
      fail("STAGING_RUNTIME_RESULT_INPUT_UNREADABLE");
    }
    if (!stat.isFile() || stat.isSymbolicLink() || isOutside(PRIVATE_EVIDENCE_ROOT, resolved)) {
      fail("STAGING_RUNTIME_RESULT_PATH_NOT_ALLOWED");
    }
  } else {
    let parent;
    try {
      parent = realpathSync(path.dirname(resolvedCandidate));
    } catch {
      fail("STAGING_RUNTIME_RESULT_OUTPUT_PARENT_INVALID");
    }
    if (isOutside(PRIVATE_EVIDENCE_ROOT, parent)) {
      fail("STAGING_RUNTIME_RESULT_PATH_NOT_ALLOWED");
    }
  }

  const relative = path.relative(REPOSITORY_ROOT, resolvedCandidate).split(path.sep).join("/");
  const tracked = runGit(["ls-files", "--error-unmatch", "--", relative]);
  if (tracked.status === 0) fail("STAGING_RUNTIME_RESULT_PATH_TRACKED");
  if (tracked.status !== 1) fail("STAGING_RUNTIME_RESULT_REPOSITORY_INVALID");
  const ignored = runGit(["check-ignore", "--no-index", "--", relative]);
  if (ignored.status !== 0) fail("STAGING_RUNTIME_RESULT_PATH_NOT_IGNORED");
  return resolvedCandidate;
}

function readPrivateBinding(bindingPath) {
  const candidate = requirePrivateIgnoredPath(bindingPath, true);
  let raw;
  try {
    const stat = lstatSync(candidate);
    if (stat.size > MAX_PRIVATE_INPUT_BYTES) fail("STAGING_RUNTIME_RESULT_BINDING_TOO_LARGE");
    raw = readFileSync(candidate, "utf8");
  } catch (error) {
    if (error instanceof RuntimeCaptureError) throw error;
    fail("STAGING_RUNTIME_RESULT_INPUT_UNREADABLE");
  }
  if (containsSecretMaterial(raw) || containsPercentDecodedSecretMaterial(raw)) {
    fail("STAGING_RUNTIME_RESULT_BINDING_SECRET_MATERIAL");
  }
  let candidateBinding;
  try {
    candidateBinding = parseStrictJson(raw);
  } catch (error) {
    if (error instanceof StrictJsonError && error.code === "JSON_DUPLICATE_OBJECT_KEY") {
      fail("STAGING_RUNTIME_RESULT_BINDING_DUPLICATE_KEY");
    }
    fail("STAGING_RUNTIME_RESULT_BINDING_INVALID");
  }
  const parsed = bindingSchema.safeParse(candidateBinding);
  if (!parsed.success) fail("STAGING_RUNTIME_RESULT_BINDING_INVALID");
  return parsed.data;
}

function readProjectLink() {
  let stat;
  let resolved;
  let raw;
  try {
    stat = lstatSync(PROJECT_LINK_PATH);
    resolved = realpathSync(PROJECT_LINK_PATH);
    raw = readFileSync(resolved, "utf8");
  } catch {
    fail("STAGING_RUNTIME_RESULT_PROJECT_LINK_UNREADABLE");
  }
  const expectedRoot = path.join(REPOSITORY_ROOT, ".vercel");
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || stat.size > MAX_PROJECT_LINK_BYTES
    || isOutside(expectedRoot, resolved)
  ) fail("STAGING_RUNTIME_RESULT_PROJECT_LINK_INVALID");

  const relative = ".vercel/project.json";
  const tracked = runGit(["ls-files", "--error-unmatch", "--", relative]);
  if (tracked.status === 0) fail("STAGING_RUNTIME_RESULT_PROJECT_LINK_TRACKED");
  if (tracked.status !== 1) fail("STAGING_RUNTIME_RESULT_REPOSITORY_INVALID");
  if (runGit(["check-ignore", "--no-index", "--", relative]).status !== 0) {
    fail("STAGING_RUNTIME_RESULT_PROJECT_LINK_NOT_IGNORED");
  }

  let candidate;
  try {
    candidate = parseStrictJson(raw);
  } catch {
    fail("STAGING_RUNTIME_RESULT_PROJECT_LINK_INVALID");
  }
  const parsed = projectLinkSchema.safeParse(candidate);
  if (!parsed.success) fail("STAGING_RUNTIME_RESULT_PROJECT_LINK_INVALID");
  return { data: parsed.data, raw };
}

function resolveHeadRevision() {
  const head = runGit(["rev-parse", "--verify", "HEAD"]);
  const revision = head.status === 0 ? head.stdout.trim() : "";
  if (!SHA_PATTERN.test(revision)) fail("STAGING_RUNTIME_RESULT_HEAD_UNAVAILABLE");
  return revision;
}

function projectReferenceFromEnvironment(environment) {
  try {
    const parsed = new URL(environment.SUPABASE_URL);
    const match = /^([a-z0-9]{20})\.supabase\.co$/u.exec(parsed.hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function createStagingRuntimeResult({
  binding,
  environment,
  gitRevision,
  observedAt,
  projectLink,
  projectLinkRaw,
}) {
  const parsedBinding = bindingSchema.safeParse(binding);
  const parsedProjectLink = projectLinkSchema.safeParse(projectLink);
  if (!parsedBinding.success || !parsedProjectLink.success) {
    fail("STAGING_RUNTIME_RESULT_BINDING_INVALID");
  }
  if (parsedBinding.data.source.gitRevision !== gitRevision) {
    fail("STAGING_RUNTIME_RESULT_REVISION_MISMATCH");
  }
  if (parsedBinding.data.vercel.projectIdentifier !== parsedProjectLink.data.projectId) {
    fail("STAGING_RUNTIME_RESULT_PROJECT_MISMATCH");
  }

  const runtimeConfig = checkStagingRuntimeConfig(environment);
  if (
    runtimeConfig.codes.length !== 1
    || runtimeConfig.codes[0] !== "STAGING_RUNTIME_CONFIG_VALID"
    || runtimeConfig.counts.failed !== 0
    || runtimeConfig.counts.skipped !== 0
    || runtimeConfig.counts.passed !== runtimeConfig.counts.total
  ) fail("STAGING_RUNTIME_RESULT_CONFIG_INVALID");

  const projectReference = projectReferenceFromEnvironment(environment);
  if (!projectReference) fail("STAGING_RUNTIME_RESULT_TARGET_INVALID");
  const result = {
    schemaVersion: 1,
    resultType: "AGENT_ADS_STAGING_RUNTIME_CONFIG_RESULT",
    status: "pass",
    observedAt: observedAt.toISOString(),
    source: { gitRevision },
    bindings: {
      vercelProjectIdentifierSha256: hashPrivateRuntimeBinding(
        "vercel-project-identifier",
        parsedBinding.data.vercel.projectIdentifier,
      ),
      vercelDeploymentIdentifierSha256: hashPrivateRuntimeBinding(
        "vercel-deployment-identifier",
        parsedBinding.data.vercel.deploymentIdentifier,
      ),
      vercelProjectLinkSha256: sha256(projectLinkRaw),
      supabaseProjectReferenceSha256: hashPrivateRuntimeBinding(
        "supabase-project-reference",
        projectReference,
      ),
      supabaseTargetFingerprintSha256: runtimeConfig.targetFingerprintSha256,
    },
    counts: runtimeConfig.counts,
  };
  const parsedResult = stagingRuntimeResultSchema.safeParse(result);
  if (!parsedResult.success) fail("STAGING_RUNTIME_RESULT_INTERNAL_ERROR");
  return parsedResult.data;
}

function parseArguments(args) {
  if (
    args.length !== 4
    || args[0] !== "--binding-file"
    || args[2] !== "--result-file"
  ) fail("STAGING_RUNTIME_RESULT_ARGUMENT_INVALID");
  return { bindingPath: args[1], resultPath: args[3] };
}

function capture(args) {
  const { bindingPath, resultPath } = parseArguments(args);
  const binding = readPrivateBinding(bindingPath);
  const projectLink = readProjectLink();
  const result = createStagingRuntimeResult({
    binding,
    environment: process.env,
    gitRevision: resolveHeadRevision(),
    observedAt: new Date(),
    projectLink: projectLink.data,
    projectLinkRaw: projectLink.raw,
  });
  const outputPath = requirePrivateIgnoredPath(resultPath, false);
  try {
    writeFileSync(outputPath, `${JSON.stringify(result)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error?.code === "EEXIST") fail("STAGING_RUNTIME_RESULT_ALREADY_EXISTS");
    fail("STAGING_RUNTIME_RESULT_WRITE_FAILED");
  }
  return { code: "STAGING_RUNTIME_RESULT_WRITTEN" };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === CAPTURE_FILE) {
  try {
    process.stdout.write(`${JSON.stringify(capture(process.argv.slice(2)))}\n`);
  } catch (error) {
    const code = error instanceof RuntimeCaptureError
      ? error.code
      : "STAGING_RUNTIME_RESULT_INTERNAL_ERROR";
    process.stderr.write(`${JSON.stringify({ code })}\n`);
    process.exitCode = 1;
  }
}
