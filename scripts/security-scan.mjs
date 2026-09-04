import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const ignored = new Set([".git", "node_modules", "archive", ".agents", ".codex", ".openai"]);
const textExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".md", ".sql", ".css", ".html", ".env", ".example"]);
const patterns = [
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]{40,}-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/i],
  ["JWT", /\beyJ[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\.[a-zA-Z0-9_-]{12,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ["Stripe live key", /\bsk_live_[A-Za-z0-9]{20,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9._-]{24,}\b/],
  ["Resend API key", /\bre_[A-Za-z0-9_-]{16,}\b/],
];
const databaseCredentialPattern = /\bpostgres(?:ql)?:\/\/[^/\s:@]+:([^@\s/]+)@/giu;
const safeSyntheticDatabasePasswords = new Set([
  "password",
  "secret",
  "synthetic",
  "synthetic-password",
  "${databasePassword}",
  "${secretSentinel}",
]);

export function findCredentialPatternLabels(text) {
  const labels = patterns.flatMap(([label, pattern]) => pattern.test(text) ? [label] : []);
  for (const match of text.matchAll(databaseCredentialPattern)) {
    const password = match[1];
    if (
      !safeSyntheticDatabasePasswords.has(password)
      && !/^safe%[0-9a-f]{2}secret$/iu.test(password)
    ) {
      labels.push("database URL credential");
      break;
    }
  }
  return labels;
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    if (entry.name.startsWith(".env") && entry.name !== ".env.example") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(fullPath));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()) || entry.name.startsWith(".env")) files.push(fullPath);
  }
  return files;
}

export async function runSecurityScan() {
  const findings = [];
  for (const file of await filesIn(root)) {
    const stat = await readFile(file);
    if (stat.length > 8 * 1024 * 1024) continue;
    const text = stat.toString("utf8");
    for (const label of findCredentialPatternLabels(text)) {
      findings.push(`${path.relative(root, file)}: ${label}`);
    }
  }

  const onboardingClient = await readFile(path.join(root, "app", "onboarding", "OnboardingForm.tsx"), "utf8");
  const onboardingSchema = await readFile(path.join(root, "lib", "onboarding-schema.ts"), "utf8");
  if (/localStorage\.setItem\([^,]+,\s*JSON\.stringify/u.test(onboardingClient)) {
    findings.push("app/onboarding/OnboardingForm.tsx: onboarding payload persisted in browser storage");
  }
  if (!onboardingClient.includes("/api/onboarding/draft") || !onboardingClient.includes("localStorage.removeItem(storageKey)")) {
    findings.push("app/onboarding/OnboardingForm.tsx: secure server draft migration invariant missing");
  }
  if (!onboardingSchema.includes("findSecretPattern") || !onboardingSchema.includes("isUnsafeCredentialDocumentName")) {
    findings.push("lib/onboarding-schema.ts: onboarding secret-containment boundary missing");
  }

  if (findings.length) {
    console.error("Secret scan failed:");
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log("Secret scan passed: no high-confidence credential material found.");
  }
}

const invokedPath = process.argv[1];
const invokedDirectly = typeof invokedPath === "string"
  && pathToFileURL(path.resolve(invokedPath)).href === import.meta.url;
if (invokedDirectly) await runSecurityScan();
