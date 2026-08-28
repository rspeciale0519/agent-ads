import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8"),
) as { scripts?: Record<string, string> };
const workflow = readFileSync(
  path.join(root, ".github", "workflows", "validate.yml"),
  "utf8",
);

describe("deployment build contract", () => {
  it("generates the Prisma client before the Next.js build", () => {
    expect(packageJson.scripts?.prebuild).toBe(
      "node node_modules/prisma/build/index.js generate",
    );
    expect(packageJson.scripts?.build).toBe("next build");
  });

  it("keeps the early CI generation step before type checking", () => {
    const generationIndex = workflow.indexOf(
      "node node_modules/prisma/build/index.js generate",
    );
    const typeCheckIndex = workflow.indexOf("pnpm run type-check");

    expect(generationIndex).toBeGreaterThanOrEqual(0);
    expect(generationIndex).toBeLessThan(typeCheckIndex);
  });
});
