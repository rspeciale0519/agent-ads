import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const eslintCli = join(dirname(require.resolve("eslint/package.json")), "bin/eslint.js");

function lint(source: string) {
  // Use the real Node loader to exercise pnpm's isolated plugin resolution.
  return spawnSync(
    process.execPath,
    [eslintCli, "--stdin", "--stdin-filename", "app/lint-fixture.tsx", "--format", "json"],
    { cwd: projectRoot, input: source, encoding: "utf8", timeout: 30_000 },
  );
}

describe("repository ESLint configuration", () => {
  it("accepts a component with valid Hooks and dependencies", () => {
    const result = lint(`
      import { useEffect, useState } from "react";
      export default function Example({ onReady }: { onReady: () => void }) {
        const [value] = useState(0);
        useEffect(() => { onReady(); }, [onReady]);
        return <span>{value}</span>;
      }
    `);

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      expect.objectContaining({ errorCount: 0, warningCount: 0, messages: [] }),
    ]);
  }, 45_000);

  it("rejects conditional Hooks and reports missing effect dependencies", () => {
    const result = lint(`
      import { useEffect, useState } from "react";
      export default function Example({ enabled, onReady }: { enabled: boolean; onReady: () => void }) {
        useEffect(() => { onReady(); }, []);
        if (enabled) {
          const [value] = useState(0);
          return <span>{value}</span>;
        }
        return null;
      }
    `);

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual([
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ ruleId: "react-hooks/rules-of-hooks", severity: 2 }),
          expect.objectContaining({ ruleId: "react-hooks/exhaustive-deps", severity: 1 }),
        ]),
      }),
    ]);
  }, 45_000);
});
