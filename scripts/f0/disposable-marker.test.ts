import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  rmdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "scripts", "f0");
const mark = readFileSync(path.join(root, "mark-disposable.sql"), "utf8");
const verify = readFileSync(path.join(root, "verify-disposable.sql"), "utf8");
const clusterGuard = readFileSync(path.join(root, "disposable-cluster-guard.sql"), "utf8");
const networkSafety = readFileSync(path.join(root, "network-safety.mjs"), "utf8");
const upgrade = readFileSync(path.join(root, "upgrade-proof.mjs"), "utf8");
const freshProof = readFileSync(path.join(root, "fresh-migration-proof.mjs"), "utf8");
const markGuardProof = readFileSync(path.join(root, "disposable-mark-guard-proof.mjs"), "utf8");
const singleUserMarker = readFileSync(path.join(root, "single-user-mark-disposable.mjs"), "utf8");
const singleUserProofPath = path.join(root, "single-user-migration-proof.mjs");
const singleUserProof = readFileSync(singleUserProofPath, "utf8");
const singleUserSafety = readFileSync(path.join(root, "single-user-safety.mjs"), "utf8");
const validMarker = "f0000000-0000-4000-8000-000000000001";
const networkProofPaths = [
  "disposable-guard-proof.mjs",
  "disposable-mark-guard-proof.mjs",
  "fresh-migration-proof.mjs",
  "network-mark-disposable.mjs",
  "upgrade-proof.mjs",
].map((name) => path.join(root, name));
const networkProofSources = networkProofPaths.map((proofPath) => readFileSync(proofPath, "utf8"));
type EnvironmentOverrides = Record<string, string | undefined>;

function isolatedEnvironment(overrides: EnvironmentOverrides = {}): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment.F0_ALLOW_DISPOSABLE_DATABASE;
  delete environment.F0_DATABASE_URL;
  delete environment.F0_POSTGRES_DATA_DIR;
  delete environment.F0_DISPOSABLE_MARKER;
  delete environment.PSQL_BIN;
  delete environment.POSTGRES_BIN;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete environment[key];
    else environment[key] = value;
  }
  return environment;
}

function makeFakePostgresDirectory(prefix: string) {
  const directory = mkdtempSync(path.join(process.cwd(), "docs", "temp", prefix));
  writeFileSync(path.join(directory, "PG_VERSION"), "17\n", "utf8");
  mkdirSync(path.join(directory, "pg_wal"));
  mkdirSync(path.join(directory, "pg_tblspc"));
  return directory;
}

function runSingleUserGuard(overrides: EnvironmentOverrides = {}) {
  return spawnSync(process.execPath, [singleUserProofPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: isolatedEnvironment(overrides),
  });
}

function guardOutput(result: ReturnType<typeof runSingleUserGuard>) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

describe("F0 disposable target marker", () => {
  it("uses database metadata without making Prisma see a non-empty schema", () => {
    expect(mark).toContain("COMMENT ON DATABASE");
    expect(mark).toContain("agent_ads_f0_disposable:");
    expect(mark).toContain("\\ir disposable-cluster-guard.sql");
    expect(mark).not.toContain("CREATE TABLE");
    expect(mark).not.toContain("CREATE SCHEMA");
  });

  it("verifies the same server-side database comment", () => {
    expect(verify).toContain("shobj_description(oid, 'pg_database')");
    expect(verify).toContain("agent_ads_f0_disposable:");
    expect(verify).toContain("\\ir disposable-cluster-guard.sql");
    expect(upgrade).toContain("shobj_description(oid, 'pg_database')");
    expect(upgrade).toContain("agent_ads_f0_disposable:${marker}");
  });

  it("rejects dirty cluster state through one shared catalog guard", () => {
    expect(clusterGuard).toContain("datname NOT IN ('postgres', 'template0', 'template1')");
    expect(clusterGuard).toContain("database_entry.datallowconn");
    expect(clusterGuard).toContain("aclexplode(database_entry.datacl)");
    expect(clusterGuard).toContain("database_entry.datdba <> current_user::regrole");
    expect(clusterGuard).toContain("FROM pg_tablespace");
    expect(clusterGuard).toContain("FROM expected_access_method");
    expect(clusterGuard).toContain("FULL JOIN pg_am AS access_method");
    expect(clusterGuard).toContain("FROM pg_authid AS role");
    expect(clusterGuard).toContain("FROM expected_membership");
    expect(clusterGuard).toContain("FROM pg_namespace");
    expect(clusterGuard).toContain("FROM pg_class AS relation");
    expect(clusterGuard).toContain("FROM pg_proc AS routine");
    expect(clusterGuard).toContain("FROM pg_type AS data_type");
    expect(clusterGuard).toContain("FROM pg_extension");
    expect(clusterGuard).toContain("FROM pg_publication");
    expect(clusterGuard).toContain("FROM pg_largeobject_metadata");
    expect(clusterGuard).toContain("FROM pg_db_role_setting");
    expect(clusterGuard).toContain("FROM pg_default_acl");
    expect(clusterGuard).toContain("FROM pg_parameter_acl");
    expect(clusterGuard).toContain("FROM pg_auth_members AS membership");
    expect(clusterGuard).toContain("FROM pg_replication_slots");
    expect(clusterGuard).toContain("FROM pg_prepared_xacts");
    expect(clusterGuard).toContain("nspowner = 'pg_database_owner'::regrole");
    expect(clusterGuard).toContain("data_cast.oid >= 16384");
    expect(clusterGuard).toContain("current_setting('server_version_num')");
  });

  it("inventories every mark-guard database before its first setup write", () => {
    const inventoryIndex = markGuardProof.indexOf(
      'for (const database of ["postgres", "template1", "agent_ads_f0"])',
    );
    const firstWriteIndex = markGuardProof.indexOf('runSql("Hidden database creation"');
    expect(markGuardProof).toContain("${clusterGuard}");
    expect(inventoryIndex).toBeGreaterThanOrEqual(0);
    expect(firstWriteIndex).toBeGreaterThan(inventoryIndex);
  });

  it("rejects URL routing overrides before any network command starts", () => {
    for (const proofPath of networkProofPaths) {
      const result = spawnSync(process.execPath, [proofPath], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: isolatedEnvironment({
          F0_ALLOW_DISPOSABLE_DATABASE: "1",
          F0_DATABASE_URL: "postgresql://f0:secret@127.0.0.1:1/agent_ads_f0?host=127.0.0.2&port=9",
          F0_DISPOSABLE_MARKER: validMarker,
        }),
      });
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain("and no query or fragment overrides");
      expect(`${result.stdout}\n${result.stderr}`).not.toContain("secret");
    }
  });

  it("passes validated PostgreSQL fields through the child environment", () => {
    expect(networkSafety).toContain("networkDatabaseEnvironment");
    expect(networkSafety).toContain("PGDATABASE: databaseName");
    expect(networkSafety).toContain("PGHOST: context.connection.host");
    expect(networkSafety).toContain("PGPASSWORD = context.connection.password");
    expect(networkSafety).toContain("-c event_triggers=false -c search_path=pg_catalog,pg_temp");
    expect(clusterGuard).toContain("SET search_path = pg_catalog, pg_temp");
    for (const source of networkProofSources) {
      expect(source).not.toContain("--dbname");
      expect(source).not.toContain("networkDatabaseUrl");
    }
  });

  it("forces C messages and rejects each PostgreSQL error severity", () => {
    expect(singleUserSafety).toContain('"lc_messages=C"');
    const safetyUrl = pathToFileURL(path.join(root, "single-user-safety.mjs")).href;
    const verification = [
      `import { postgresOutputHasError } from ${JSON.stringify(safetyUrl)};`,
      "const failures = ['ERROR: localized detail', 'FATAL: startup failed', 'PANIC: shutdown'];",
      "if (!failures.every(postgresOutputHasError)) process.exit(1);",
      "if (postgresOutputHasError('WARNING: expected notice')) process.exit(1);",
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", verification], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
  });

  it("rejects non-loopback authorities, unsupported protocols, and URL fragments", () => {
    for (const databaseUrl of [
      "postgresql://localhost/agent_ads_f0",
      "https://127.0.0.1/agent_ads_f0",
      "postgresql://127.0.0.1/agent_ads_f0#host=remote",
    ]) {
      const result = spawnSync(process.execPath, [networkProofPaths[0]], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: isolatedEnvironment({
          F0_ALLOW_DISPOSABLE_DATABASE: "1",
          F0_DATABASE_URL: databaseUrl,
          F0_DISPOSABLE_MARKER: validMarker,
        }),
      });
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain("and no query or fragment overrides");
    }
  });

  it("rejects a non-psql executable before any database command starts", () => {
    const result = spawnSync(process.execPath, [networkProofPaths[0]], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: isolatedEnvironment({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DATABASE_URL: "postgresql://f0:secret@127.0.0.1:1/agent_ads_f0",
        F0_DISPOSABLE_MARKER: validMarker,
        PSQL_BIN: process.execPath,
      }),
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "PSQL_BIN must resolve to the PostgreSQL psql executable",
    );
    expect(`${result.stdout}\n${result.stderr}`).not.toContain("secret");
  });

  it("records the simulated legacy baseline before migration deployment", () => {
    const baselineIndex = freshProof.indexOf("Prisma legacy baseline resolution");
    const deploymentIndex = freshProof.indexOf("Prisma migration deployment");
    expect(baselineIndex).toBeGreaterThanOrEqual(0);
    expect(baselineIndex).toBeLessThan(deploymentIndex);
    expect(freshProof).toContain('"--applied"');
    expect(freshProof).toContain('"00000000000000_legacy_baseline"');
  });

  it("requires a separate mark command before the single-user proof can write", () => {
    expect(singleUserMarker).toContain('buildSingleUserGuardSql(context.root, context.marker, "write")');
    expect(singleUserProof).toContain('buildSingleUserGuardSql(context.root, context.marker, "verify")');
    expect(singleUserSafety).toContain("F0 single-user proof target is missing its prior disposable marker");
    expect(singleUserSafety).toContain("agent_ads_f0_single_user_disposable:");
    expect(singleUserSafety).toContain("POSTGRES_BIN must identify itself as a PostgreSQL 17 server executable");
    expect(singleUserMarker).toContain('buildSingleUserInventorySql(context.root, "template1")');
    expect(singleUserProof).toContain('buildSingleUserInventorySql(context.root, "template1")');
    expect(singleUserProof).toContain("CREATE DATABASE agent_ads_f0 TEMPLATE template1");
    expect(singleUserProof).not.toContain("TEMPLATE template0");
    expect(upgrade).not.toContain('template = "template0"');

    const guardIndex = singleUserProof.indexOf('"Disposable cluster guard"');
    const databaseWriteIndex = singleUserProof.indexOf('runSql("Disposable database creation"');
    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeLessThan(databaseWriteIndex);
  });

  it("rejects missing destructive-proof approval before target validation", () => {
    const result = runSingleUserGuard();
    expect(result.status).not.toBe(0);
    expect(guardOutput(result)).toContain("F0_ALLOW_DISPOSABLE_DATABASE=1 is required");
  });

  it("rejects a malformed disposable marker before database access", () => {
    const result = runSingleUserGuard({
      F0_ALLOW_DISPOSABLE_DATABASE: "1",
      F0_DISPOSABLE_MARKER: "not-a-marker",
      F0_POSTGRES_DATA_DIR: process.cwd(),
      POSTGRES_BIN: process.execPath,
    });
    expect(result.status).not.toBe(0);
    expect(guardOutput(result)).toContain("F0_DISPOSABLE_MARKER must be a canonical lowercase UUIDv4");
  });

  it("rejects a data directory outside this repository's docs/temp directory", () => {
    const result = runSingleUserGuard({
      F0_ALLOW_DISPOSABLE_DATABASE: "1",
      F0_DISPOSABLE_MARKER: validMarker,
      F0_POSTGRES_DATA_DIR: tmpdir(),
      POSTGRES_BIN: process.execPath,
    });
    expect(result.status).not.toBe(0);
    expect(guardOutput(result)).toContain("F0_POSTGRES_DATA_DIR must resolve inside this project's docs/temp directory");
  });

  it("rejects a junction inside docs/temp when its target is outside the repository", () => {
    const outsideDirectory = mkdtempSync(path.join(tmpdir(), "f0-outside-target-"));
    const junctionPath = path.join(process.cwd(), "docs", "temp", `f0-junction-${randomUUID()}`);
    try {
      symlinkSync(outsideDirectory, junctionPath, process.platform === "win32" ? "junction" : "dir");
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: junctionPath,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("F0_POSTGRES_DATA_DIR must resolve inside this project's docs/temp directory");
    } finally {
      rmSync(junctionPath, { force: true, recursive: true });
      rmdirSync(outsideDirectory);
    }
  });

  it("rejects a data directory from another PostgreSQL major version", () => {
    const disposableDirectory = mkdtempSync(path.join(process.cwd(), "docs", "temp", "f0-version-test-"));
    try {
      writeFileSync(path.join(disposableDirectory, "PG_VERSION"), "16\n", "utf8");
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("F0_POSTGRES_DATA_DIR must contain a PostgreSQL 17 data directory");
    } finally {
      rmSync(disposableDirectory, { force: true, recursive: true });
    }
  });

  it("rejects pg_wal when it resolves outside the disposable data directory", () => {
    const disposableDirectory = mkdtempSync(path.join(process.cwd(), "docs", "temp", "f0-wal-test-"));
    const outsideDirectory = mkdtempSync(path.join(tmpdir(), "f0-wal-outside-"));
    const walPath = path.join(disposableDirectory, "pg_wal");
    try {
      writeFileSync(path.join(disposableDirectory, "PG_VERSION"), "17\n", "utf8");
      mkdirSync(path.join(disposableDirectory, "pg_tblspc"));
      symlinkSync(outsideDirectory, walPath, process.platform === "win32" ? "junction" : "dir");
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("must keep pg_wal inside its data directory");
    } finally {
      rmSync(walPath, { force: true, recursive: true });
      rmSync(disposableDirectory, { force: true, recursive: true });
      rmSync(outsideDirectory, { force: true, recursive: true });
    }
  });

  it("rejects any configured tablespace path before starting PostgreSQL", () => {
    const disposableDirectory = makeFakePostgresDirectory("f0-tablespace-test-");
    try {
      writeFileSync(path.join(disposableDirectory, "pg_tblspc", "unexpected"), "unsafe", "utf8");
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("must have an empty pg_tblspc directory");
    } finally {
      rmSync(disposableDirectory, { force: true, recursive: true });
    }
  });

  it("rejects another nested link that resolves outside the data directory", () => {
    const disposableDirectory = makeFakePostgresDirectory("f0-link-test-");
    const outsideDirectory = mkdtempSync(path.join(tmpdir(), "f0-link-outside-"));
    const linkPath = path.join(disposableDirectory, "external_link");
    try {
      symlinkSync(outsideDirectory, linkPath, process.platform === "win32" ? "junction" : "dir");
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("contains a link that resolves outside its data directory");
    } finally {
      rmSync(linkPath, { force: true, recursive: true });
      rmSync(disposableDirectory, { force: true, recursive: true });
      rmSync(outsideDirectory, { force: true, recursive: true });
    }
  });

  it("rejects a hard-linked data file before starting PostgreSQL", () => {
    const disposableDirectory = makeFakePostgresDirectory("f0-hard-link-test-");
    const outsideDirectory = mkdtempSync(path.join(tmpdir(), "f0-hard-link-outside-"));
    const outsideFile = path.join(outsideDirectory, "shared-data");
    const linkedFile = path.join(disposableDirectory, "shared-data");
    try {
      writeFileSync(outsideFile, "unsafe", "utf8");
      linkSync(outsideFile, linkedFile);
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("contains a hard-linked file");
    } finally {
      rmSync(disposableDirectory, { force: true, recursive: true });
      rmSync(outsideDirectory, { force: true, recursive: true });
    }
  });

  it("rejects an executable that is not PostgreSQL", () => {
    const disposableDirectory = makeFakePostgresDirectory("f0-guard-test-");
    try {
      const result = runSingleUserGuard({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DISPOSABLE_MARKER: validMarker,
        F0_POSTGRES_DATA_DIR: disposableDirectory,
        POSTGRES_BIN: process.execPath,
      });
      expect(result.status).not.toBe(0);
      expect(guardOutput(result)).toContain("POSTGRES_BIN must resolve to the PostgreSQL postgres executable");
    } finally {
      rmSync(disposableDirectory, { force: true, recursive: true });
    }
  });
});
