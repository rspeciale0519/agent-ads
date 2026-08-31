import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type ProcessResult = {
  status: number | null;
  signal?: string | null;
  error?: Error;
  stdout?: string;
  stderr?: string;
};
type PostgresErrorModule = {
  matchesPrimaryPostgresError: (result: ProcessResult, expectedMessage: string) => boolean;
};

async function matcherModule() {
  return await import(pathToFileURL(path.join(process.cwd(), "scripts", "f0", "postgres-error.mjs")).href) as PostgresErrorModule;
}

const expected = "ACCOUNT_CONNECTIONS_RATE_LIMIT_DEFINER_CONTRACT_INVALID";
const prefix = "2026-08-30 18:23:38.058 EDT [59668]";
const result = (stderr: string, overrides: Partial<ProcessResult> = {}): ProcessResult => ({
  status: 3, signal: null, stdout: "", stderr, ...overrides,
});

describe("F0 primary PostgreSQL error matching", () => {
  it.each([
    `ERROR:  ${expected}\n`,
    `${prefix} ERROR:  ${expected}\n`,
    `psql:scripts/f0/verify-disposable.sql:50: ERROR:  ${expected}\n`,
    `psql:C:/synthetic path/verify-disposable.sql:50: ERROR:  ${expected}\r\n`,
  ])("accepts an exact primary error with a supported prefix: %s", async (stderr) => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(stderr), expected)).toBe(true);
  });

  it("accepts a single-user SQL error even when the backend exits zero", async () => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(`${prefix} ERROR:  ${expected}\n`, { status: 0 }), expected)).toBe(true);
  });

  it("allows an ordinary warning before the primary error", async () => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(`WARNING:  there is already a transaction in progress\nERROR:  ${expected}\n`), expected)).toBe(true);
  });

  it("rejects an unrelated error whose echoed SQL contains the expected guard", async () => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    const stderr = `${prefix} ERROR:  unrelated SQL failure\n${prefix} STATEMENT:  BEGIN;\n\tRAISE EXCEPTION '${expected}';\n`;
    expect(match(result(stderr), expected)).toBe(false);
  });

  it("accepts a complete primary message followed by separate diagnostic fields", async () => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(`ERROR:  ${expected}\nDETAIL:  additional detail\nCONTEXT:  inline block\n`), expected)).toBe(true);
    expect(match(result(`${prefix} ERROR:  ${expected}\n${prefix} STATEMENT:  BEGIN;\n\tSQL body\n`), expected)).toBe(true);
  });

  it.each(["\tadditional primary-message text", "additional primary-message text", "\nadditional primary-message text"])(
    "rejects a multiline primary-message suffix: %s", async (continuation) => {
      const { matchesPrimaryPostgresError: match } = await matcherModule();
      expect(match(result(`ERROR:  ${expected}\n${continuation}\n`), expected)).toBe(false);
    },
  );

  it.each(["WARNING", "NOTICE", "INFO", "LOG", "DETAIL", "HINT", "CONTEXT", "STATEMENT", "QUERY"])(
    "does not accept the guard in %s text", async (severity) => {
      const { matchesPrimaryPostgresError: match } = await matcherModule();
      expect(match(result(`${severity}:  ${expected}\n`), expected)).toBe(false);
    },
  );

  it.each([
    `CONTEXT:  SQL statement\nERROR:  ${expected}\n`,
    `${prefix} STATEMENT:  SELECT\n\tERROR:  ${expected}\n`,
    `LINE 1: ERROR:  ${expected}\n`,
    `RAISE EXCEPTION '${expected}';\n`,
    `\tERROR:  ${expected}\n`,
    `unknown-prefix ERROR:  other failure\nERROR:  ${expected}\n`,
    `psql: error: connection failed\nERROR:  ${expected}\n`,
    `psql:<stdin>:7: error: earlier failure\nERROR:  ${expected}\n`,
    `psql:C:/synthetic path/input.sql:7: error: earlier failure\nERROR:  ${expected}\n`,
  ])("rejects context, SQL, and unsupported diagnostic prefixes: %s", async (stderr) => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(stderr), expected)).toBe(false);
  });

  it.each(["ERROR", "FATAL", "PANIC"])("does not skip an earlier %s failure", async (severity) => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(`${prefix} ${severity}:  earlier failure\n${prefix} ERROR:  ${expected}\n`), expected)).toBe(false);
  });

  it("uses stderr only, not echoed or reordered stdout", async () => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result("", { stdout: `ERROR:  ${expected}\n` }), expected)).toBe(false);
    expect(match(result(`ERROR:  ${expected}\n`, { stdout: "ERROR:  echoed SQL only\n" }), expected)).toBe(true);
  });

  it.each([
    { error: new Error("spawn failed") },
    { error: new Error("output capture failed"), status: 0 },
    { signal: "SIGTERM", status: null },
    { signal: "SIGKILL", status: 3 },
    { status: null },
    { status: -1 },
    { status: Number.NaN },
  ])("rejects process failures even with the expected error: %o", async (overrides) => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    expect(match(result(`ERROR:  ${expected}\n`, overrides), expected)).toBe(false);
  });

  it("requires exact message equality, not a prefix, suffix, or regular expression", async () => {
    const { matchesPrimaryPostgresError: match } = await matcherModule();
    for (const message of [`prefix ${expected}`, `${expected} suffix`, `${expected} `]) {
      expect(match(result(`ERROR:  ${message}\n`), expected)).toBe(false);
    }
    expect(match(result("ERROR:  guard [v1]. (safe)\n"), "guard [v1]. (safe)")).toBe(true);
    expect(match(result(`ERROR:  ${expected}\n`), "")).toBe(false);
    expect(match(result(`ERROR:  ${expected}\n`), `${expected}\n`)).toBe(false);
  });

  it("wires every SQL expected-failure consumer to the shared matcher", () => {
    for (const file of ["single-user-safety.mjs", "upgrade-proof.mjs", "disposable-guard-proof.mjs", "disposable-mark-guard-proof.mjs"]) {
      const source = readFileSync(path.join(process.cwd(), "scripts", "f0", file), "utf8");
      expect(source).toContain('from "./postgres-error.mjs"');
      expect(source).toContain("matchesPrimaryPostgresError(result, expectedMessage)");
      expect(source).not.toContain("output.includes(expectedMessage)");
    }
  });

  it("uses complete existing UUID guard messages without changing the guards", async () => {
    const fixtures = await import(pathToFileURL(path.join(process.cwd(), "scripts", "f0", "upgrade-fixtures.mjs")).href) as {
      upgradeScenarios: { expectedFailure?: string }[];
    };
    const migration = readFileSync(path.join(process.cwd(), "prisma", "migrations", "20260810120100_credential_reference_uuid", "migration.sql"), "utf8");
    const messages = new Set([...migration.matchAll(/RAISE EXCEPTION '([^']+)'/gu)].map((match) => match[1]));
    const expectedMessages = fixtures.upgradeScenarios.flatMap((scenario) => scenario.expectedFailure ? [scenario.expectedFailure] : []);
    expect(expectedMessages).toHaveLength(5);
    for (const message of expectedMessages) expect(messages.has(message)).toBe(true);
  });
});
