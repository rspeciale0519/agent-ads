import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const auditModule = import(pathToFileURL(path.join(
  process.cwd(),
  "scripts",
  "mutation-contract-audit.mjs",
)).href) as Promise<{
  configuredInvariantFindings: (relative: string, source: string) => string[];
}>;

describe("mutation contract delegated invariants", () => {
  it("binds onboarding replay protection across the route and helper", async () => {
    const { configuredInvariantFindings } = await auditModule;
    const routePath = "app/api/onboarding/submit/route.ts";
    const helperPath = "lib/onboarding-notification.ts";
    const [routeSource, helperSource] = await Promise.all([
      readFile(path.join(process.cwd(), routePath), "utf8"),
      readFile(path.join(process.cwd(), helperPath), "utf8"),
    ]);

    expect(configuredInvariantFindings(routePath, routeSource)).toEqual([]);
    expect(configuredInvariantFindings(helperPath, helperSource)).toEqual([]);
  });

  it("detects removal of the delegated email idempotency key", async () => {
    const { configuredInvariantFindings } = await auditModule;
    const helperPath = "lib/onboarding-notification.ts";
    const source = await readFile(path.join(process.cwd(), helperPath), "utf8");
    const withoutIdempotencyKey = source.replace(
      "idempotencyKey: `onboarding-",
      "deliveryKey: `onboarding-",
    );

    expect(configuredInvariantFindings(helperPath, withoutIdempotencyKey)).toContain(
      `${helperPath}: missing configured invariant idempotencyKey: \`onboarding-`,
    );
  });
});
