import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { matchesPrimaryPostgresError } from "./postgres-error.mjs";

const markerPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const markerPrefix = "agent_ads_f0_single_user_disposable:";

export function isStrictPathDescendant(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative.length > 0
    && relative !== ".."
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

function assertInternalLinks(dataDirectory, currentDirectory = dataDirectory) {
  for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
    const candidate = path.join(currentDirectory, entry.name);
    const stats = lstatSync(candidate);
    if (stats.isSymbolicLink()) {
      const resolvedTarget = realpathSync(candidate);
      if (!isStrictPathDescendant(dataDirectory, resolvedTarget)) {
        throw new Error("F0_POSTGRES_DATA_DIR contains a link that resolves outside its data directory.");
      }
      continue;
    }
    if (stats.isDirectory()) assertInternalLinks(dataDirectory, candidate);
    else if (stats.nlink !== 1) {
      throw new Error("F0_POSTGRES_DATA_DIR contains a hard-linked file.");
    }
  }
}

export function resolveSingleUserContext(root, environment = process.env) {
  if (environment.F0_ALLOW_DISPOSABLE_DATABASE !== "1") {
    throw new Error("F0_ALLOW_DISPOSABLE_DATABASE=1 is required for this destructive disposable-database proof.");
  }

  const dataDirectory = environment.F0_POSTGRES_DATA_DIR;
  const postgres = environment.POSTGRES_BIN;
  const marker = environment.F0_DISPOSABLE_MARKER;
  if (!dataDirectory || !postgres) throw new Error("F0_POSTGRES_DATA_DIR and POSTGRES_BIN are required.");
  if (!marker || !markerPattern.test(marker)) {
    throw new Error("F0_DISPOSABLE_MARKER must be a canonical lowercase UUIDv4.");
  }

  const resolvedRoot = realpathSync(root);
  const resolvedTempRoot = realpathSync(path.join(root, "docs", "temp"));
  if (!isStrictPathDescendant(resolvedRoot, resolvedTempRoot)) {
    throw new Error("This project's docs/temp directory must resolve inside the repository.");
  }

  const resolvedDataDirectory = realpathSync(dataDirectory);
  if (!isStrictPathDescendant(resolvedTempRoot, resolvedDataDirectory)) {
    throw new Error("F0_POSTGRES_DATA_DIR must resolve inside this project's docs/temp directory.");
  }
  const dataVersion = readFileSync(path.join(resolvedDataDirectory, "PG_VERSION"), "utf8").trim();
  if (dataVersion !== "17") {
    throw new Error("F0_POSTGRES_DATA_DIR must contain a PostgreSQL 17 data directory.");
  }

  const resolvedWalDirectory = realpathSync(path.join(resolvedDataDirectory, "pg_wal"));
  if (!isStrictPathDescendant(resolvedDataDirectory, resolvedWalDirectory)) {
    throw new Error("F0_POSTGRES_DATA_DIR must keep pg_wal inside its data directory.");
  }
  if (readdirSync(path.join(resolvedDataDirectory, "pg_tblspc")).length !== 0) {
    throw new Error("F0_POSTGRES_DATA_DIR must have an empty pg_tblspc directory.");
  }
  assertInternalLinks(resolvedDataDirectory);

  const resolvedPostgres = realpathSync(postgres);
  if (!/^postgres(?:\.exe)?$/iu.test(path.basename(resolvedPostgres))) {
    throw new Error("POSTGRES_BIN must resolve to the PostgreSQL postgres executable.");
  }

  const versionResult = spawnSync(resolvedPostgres, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const versionOutput = `${versionResult.stdout || ""}\n${versionResult.stderr || ""}`.trim();
  if (versionResult.error || versionResult.status !== 0 || !/^postgres \(PostgreSQL\) 17(?:\.|\s|$)/u.test(versionOutput)) {
    throw new Error("POSTGRES_BIN must identify itself as a PostgreSQL 17 server executable.");
  }

  const configuredDirectoryResult = spawnSync(
    resolvedPostgres,
    ["-D", resolvedDataDirectory, "-C", "data_directory"],
    { encoding: "utf8", windowsHide: true },
  );
  const configuredDirectory = `${configuredDirectoryResult.stdout || ""}`.trim();
  if (configuredDirectoryResult.error || configuredDirectoryResult.status !== 0 || configuredDirectory === "") {
    throw new Error("POSTGRES_BIN could not verify the configured PostgreSQL data directory.");
  }
  const configuredPath = path.isAbsolute(configuredDirectory)
    ? configuredDirectory
    : path.resolve(resolvedDataDirectory, configuredDirectory);
  if (realpathSync(configuredPath) !== resolvedDataDirectory) {
    throw new Error("PostgreSQL data_directory must resolve to F0_POSTGRES_DATA_DIR.");
  }

  return {
    marker,
    resolvedDataDirectory,
    resolvedPostgres,
    root: resolvedRoot,
  };
}

export function buildSingleUserInventorySql(root, expectedDatabase, allowedDatabase = "") {
  if (!new Set(["postgres", "template1"]).has(expectedDatabase)) {
    throw new Error("Single-user inventory requires an approved source database.");
  }
  if (allowedDatabase !== "" && allowedDatabase !== "agent_ads_f0") {
    throw new Error("Single-user inventory received an unsafe allowed database.");
  }

  const clusterGuard = readFileSync(path.join(root, "scripts", "f0", "disposable-cluster-guard.sql"), "utf8");
  return `
SET search_path = pg_catalog, pg_temp;
SELECT pg_catalog.set_config('f0.expected_database', '${expectedDatabase}', false);
SELECT pg_catalog.set_config('f0.allowed_database', '${allowedDatabase}', false);
${clusterGuard}
`;
}

export function buildSingleUserGuardSql(root, marker, markerMode) {
  if (!markerPattern.test(marker)) throw new Error("A canonical lowercase UUIDv4 marker is required.");
  if (markerMode !== "write" && markerMode !== "verify") {
    throw new Error("Single-user marker mode must be write or verify.");
  }

  const markerCheck = markerMode === "write" ? `
DO $marker_write$
DECLARE
  existing_comment text;
BEGIN
  SELECT shobj_description(oid, 'pg_database') INTO existing_comment
  FROM pg_database
  WHERE datname = current_database();

  IF existing_comment IS NOT NULL
     AND existing_comment <> 'default administrative connection database'
     AND existing_comment IS DISTINCT FROM '${markerPrefix}${marker}' THEN
    RAISE EXCEPTION 'F0 single-user marker found an unexpected database comment';
  END IF;

  EXECUTE format(
    'COMMENT ON DATABASE %I IS %L',
    current_database(),
    '${markerPrefix}${marker}'
  );
END
$marker_write$;
` : `
DO $marker_verification$
DECLARE
  database_comment text;
BEGIN
  SELECT shobj_description(oid, 'pg_database') INTO database_comment
  FROM pg_database
  WHERE datname = current_database();

  IF database_comment IS DISTINCT FROM '${markerPrefix}${marker}' THEN
    RAISE EXCEPTION 'F0 single-user proof target is missing its prior disposable marker';
  END IF;
END
$marker_verification$;
`;

  return `${buildSingleUserInventorySql(root, "postgres")}${markerCheck}`;
}

export function singleUserSqlResult(context, database, sql, options = {}) {
  const compactSql = `${sql.split(/\r?\n/u).filter((line) => line.trim().length > 0).join("\n")}\n\n`;
  const postgresArguments = [
    "--single",
    "-j",
    "-D",
    context.resolvedDataDirectory,
    "-c",
    `data_directory=${context.resolvedDataDirectory}`,
    "-c",
    "event_triggers=false",
    "-c",
    "lc_messages=C",
  ];
  if (options.trustedCatalogs === true) {
    postgresArguments.push("-c", "search_path=pg_catalog,pg_temp");
  }
  postgresArguments.push(database);
  return spawnSync(
    context.resolvedPostgres,
    postgresArguments,
    {
      cwd: context.root,
      encoding: "utf8",
      input: compactSql,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
    },
  );
}

export function postgresOutputHasError(output) {
  return /(?:ERROR|FATAL|PANIC):/u.test(output);
}

export function runSingleUserSql(context, label, database, sql, options) {
  const result = singleUserSqlResult(context, database, sql, options);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error || result.status !== 0 || postgresOutputHasError(output)) {
    process.stderr.write(output);
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed.`);
  }
}

export function runSingleUserSqlExpectFailure(
  context,
  label,
  database,
  sql,
  expectedMessage,
  options,
) {
  const result = singleUserSqlResult(context, database, sql, options);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (!result.error && result.status === 0 && !postgresOutputHasError(output)) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }
  if (!matchesPrimaryPostgresError(result, expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} did not fail with the expected guard.`);
  }
}
