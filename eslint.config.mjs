import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  // pnpm keeps Next's bundled plugins with their owner, not at the project root.
  resolvePluginsRelativeTo: dirname(require.resolve("eslint-config-next")),
});
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".pnpm-store/**",
      "archive/**",
      "node_modules/**",
      "scripts/gate0/generated/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
      // Private recovery artifacts and separate checkouts are not application inputs.
      "docs/temp/release-evidence/**",
      ".claude/worktrees/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
