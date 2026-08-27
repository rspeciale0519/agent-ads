import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "app");
const libRoot = path.join(root, "lib");
const mutationExport = /export async function (POST|PATCH|PUT|DELETE)\b/;
const clientMutation = /\b(?:fetch|mutationFetch)\([\s\S]*?method:\s*["'`](?:POST|PATCH|PUT|DELETE)["'`]/;
const exemptions = new Map([
  ["app/api/internal/account-connections/maintenance/route.ts", ["maintenanceRequestAuthorized", "runAccountConnectionsMaintenance"]],
  ["app/api/onboarding/draft/route.ts", ["onboardingDraftSchema", "ON CONFLICT (id) DO UPDATE", "applicant_id = EXCLUDED.applicant_id"]],
  ["app/api/onboarding/submit/route.ts", ["input.submissionId", "idempotencyKey: `onboarding-"]],
  ["app/api/onboarding/upload-url/route.ts", ["attachmentId", "storagePath"]],
  ["app/api/v1/organization-invitations/accept/route.ts", ["mutationMetadata(request)", "acceptOrganizationInvitation"]],
  ["app/api/v1/security/step-up/challenge/route.ts", ["getAssuranceStatus", "requireSameOrigin"]],
  ["app/api/v1/connections/[id]/secret/route.ts", ["PROVIDER_SECRET_ROUTE_DISABLED", "requireSameOrigin"]],
]);

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const findings = [];
const files = await filesIn(appRoot);
for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const text = await readFile(file, "utf8");
  if (relative.endsWith("/route.ts") && mutationExport.test(text)) {
    if (!relative.startsWith("app/api/internal/") && !text.includes("requireSameOrigin")) {
      findings.push(`${relative}: missing same-origin and mutation-header boundary`);
    }
    const exemption = exemptions.get(relative);
    if (exemption) {
      for (const fragment of exemption) if (!text.includes(fragment)) findings.push(`${relative}: missing exemption invariant ${fragment}`);
    } else if (!text.includes("runIdempotentMutation")) {
      findings.push(`${relative}: missing durable idempotency boundary`);
    }
  }
  if (/\.(?:ts|tsx)$/.test(relative) && clientMutation.test(text) && text.includes("/api/") && !text.includes("mutationFetch")) {
    findings.push(`${relative}: browser mutation does not retain mutation identity headers across unknown outcomes`);
  }
}

for (const file of await filesIn(libRoot)) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (!/\.(?:ts|tsx)$/.test(relative) || relative.endsWith(".test.ts")) continue;
  const source = await readFile(file, "utf8");
  if (source.includes("withTenantFinalizationContext")
    && relative !== "lib/api/idempotency.ts"
    && relative !== "lib/auth/organization-context.ts") {
    findings.push(`${relative}: deactivation-tolerant tenant context is restricted to terminal idempotency bookkeeping`);
  }
}

if (findings.length) {
  console.error("Mutation contract audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log("Mutation contract audit passed: browser mutations carry correlation/idempotency headers and state-changing routes have durable or explicit domain-level replay protection.");
}
