import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { upgradeScenarios } from "./upgrade-fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const allowedRoot = `${realpathSync(path.join(root, "docs", "temp"))}${path.sep}`;
const dataDirectory = process.env.F0_POSTGRES_DATA_DIR;
const postgres = process.env.POSTGRES_BIN;
const marker = process.env.F0_DISPOSABLE_MARKER;
const markerPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

if (process.env.F0_ALLOW_DISPOSABLE_DATABASE !== "1") {
  throw new Error("F0_ALLOW_DISPOSABLE_DATABASE=1 is required for this destructive disposable-database proof.");
}
if (!dataDirectory || !postgres) throw new Error("F0_POSTGRES_DATA_DIR and POSTGRES_BIN are required.");
if (!marker || !markerPattern.test(marker)) {
  throw new Error("F0_DISPOSABLE_MARKER must be a canonical lowercase UUIDv4.");
}

const resolvedDataDirectory = realpathSync(dataDirectory);
if (!resolvedDataDirectory.startsWith(allowedRoot)) {
  throw new Error("F0_POSTGRES_DATA_DIR must be inside this project's docs/temp directory.");
}
const resolvedPostgres = realpathSync(postgres);
if (!/^postgres(?:\.exe)?$/iu.test(path.basename(resolvedPostgres))) {
  throw new Error("POSTGRES_BIN must resolve to the PostgreSQL postgres executable.");
}

function withoutPsqlCommands(sql) {
  return sql.split(/\r?\n/u).filter((line) => !line.trimStart().startsWith("\\")).join("\n");
}

function sqlResult(database, sql) {
  const compactSql = `${sql.split(/\r?\n/u).filter((line) => line.trim().length > 0).join("\n")}\n\n`;
  return spawnSync(resolvedPostgres, ["--single", "-j", "-D", resolvedDataDirectory, database], {
    cwd: root,
    encoding: "utf8",
    input: compactSql,
    maxBuffer: 50 * 1024 * 1024,
  });
}

function runSql(label, database, sql) {
  const result = sqlResult(database, sql);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.error || result.status !== 0 || /(?:ERROR|FATAL):/u.test(output)) {
    process.stderr.write(output);
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed.`);
  }
}

function runSqlExpectFailure(label, database, sql, expectedMessage) {
  const result = sqlResult(database, sql);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (!result.error && result.status === 0 && !/(?:ERROR|FATAL):/u.test(output)) {
    throw new Error(`${label} unexpectedly succeeded.`);
  }
  if (!output.includes(expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} did not fail with the expected guard.`);
  }
}

const disposableClusterGuard = `
SELECT set_config('f0.expected_marker', '${marker}', false);

DO $verification$
DECLARE
  existing_comment text;
  unexpected_database text;
  unexpected_extension text;
  unexpected_relation text;
  unexpected_role text;
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'F0 single-user guard has an unexpected database name';
  END IF;

  SELECT datname INTO unexpected_database
  FROM pg_database
  WHERE NOT datistemplate
    AND datallowconn
    AND datname <> 'postgres'
  ORDER BY datname
  LIMIT 1;
  IF unexpected_database IS NOT NULL THEN
    RAISE EXCEPTION 'F0 single-user guard found an unexpected user database';
  END IF;

  SELECT rolname INTO unexpected_role
  FROM pg_roles
  WHERE rolname !~ '^pg_'
    AND rolname <> current_user
  ORDER BY rolname
  LIMIT 1;
  IF unexpected_role IS NOT NULL THEN
    RAISE EXCEPTION 'F0 single-user guard found an unexpected user role';
  END IF;

  SELECT namespace.nspname || '.' || relation.relname INTO unexpected_relation
  FROM pg_class AS relation
  JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
  WHERE relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
    AND namespace.nspname NOT IN ('pg_catalog', 'information_schema')
    AND namespace.nspname !~ '^pg_toast'
  ORDER BY namespace.nspname, relation.relname
  LIMIT 1;
  IF unexpected_relation IS NOT NULL THEN
    RAISE EXCEPTION 'F0 single-user guard found an unexpected user relation';
  END IF;

  SELECT extname INTO unexpected_extension
  FROM pg_extension
  WHERE extname <> 'plpgsql'
  ORDER BY extname
  LIMIT 1;
  IF unexpected_extension IS NOT NULL THEN
    RAISE EXCEPTION 'F0 single-user guard found an unexpected extension';
  END IF;

  SELECT shobj_description(oid, 'pg_database') INTO existing_comment
  FROM pg_database
  WHERE datname = current_database();
  IF existing_comment IS NOT NULL
     AND existing_comment <> 'default administrative connection database'
     AND existing_comment IS DISTINCT FROM
       'agent_ads_f0_single_user_disposable:' || current_setting('f0.expected_marker') THEN
    RAISE EXCEPTION 'F0 single-user guard found an unexpected database marker';
  END IF;

  EXECUTE format(
    'COMMENT ON DATABASE %I IS %L',
    current_database(),
    'agent_ads_f0_single_user_disposable:' || current_setting('f0.expected_marker')
  );
END
$verification$;

DO $marker_verification$
DECLARE
  database_comment text;
BEGIN
  SELECT shobj_description(oid, 'pg_database') INTO database_comment
  FROM pg_database
  WHERE datname = current_database();
  IF database_comment IS DISTINCT FROM
     'agent_ads_f0_single_user_disposable:' || current_setting('f0.expected_marker') THEN
    RAISE EXCEPTION 'F0 single-user guard could not verify its database marker';
  END IF;
END
$marker_verification$;
`;

runSql("Disposable cluster guard", "postgres", disposableClusterGuard);
runSql("Disposable database creation", "postgres", "CREATE DATABASE agent_ads_f0;\n");

const bootstrap = withoutPsqlCommands(readFileSync(path.join(root, "scripts", "f0", "bootstrap.sql"), "utf8"));
runSql("F0 bootstrap", "agent_ads_f0", bootstrap);
runSql("Legacy onboarding schema", "agent_ads_f0", readFileSync(path.join(root, "supabase", "migrations", "20260806_onboarding_submissions.sql"), "utf8"));
runSql("Legacy onboarding authorization", "agent_ads_f0", readFileSync(path.join(root, "supabase", "migrations", "20260806_onboarding_auth.sql"), "utf8"));

const migrationRoot = path.join(root, "prisma", "migrations");
const migrationNames = readdirSync(migrationRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
for (const migrationName of migrationNames) {
  runSql(
    `Migration ${migrationName}`,
    "agent_ads_f0",
    readFileSync(path.join(migrationRoot, migrationName, "migration.sql"), "utf8"),
  );
}

const assertions = withoutPsqlCommands(readFileSync(path.join(root, "scripts", "f0", "assertions.sql"), "utf8"));
runSql("F0 assertions", "agent_ads_f0", assertions);

const upgradeTemplate = "agent_ads_f0_upgrade_template";
runSql("Upgrade template creation", "postgres", `CREATE DATABASE ${upgradeTemplate} TEMPLATE template0;\n`);
runSql("Upgrade template bootstrap", upgradeTemplate, bootstrap);
runSql(
  "Upgrade template base migration",
  upgradeTemplate,
  readFileSync(path.join(migrationRoot, "20260810120000_account_connections", "migration.sql"), "utf8"),
);
const repairMigration = readFileSync(path.join(migrationRoot, "20260810120100_credential_reference_uuid", "migration.sql"), "utf8");
for (const scenario of upgradeScenarios) {
  const scenarioDatabase = `agent_ads_f0_${scenario.name}`;
  runSql("Upgrade scenario database creation", "postgres", `CREATE DATABASE ${scenarioDatabase} TEMPLATE ${upgradeTemplate};\n`);
  runSql(`Upgrade fixture ${scenario.name}`, scenarioDatabase, scenario.fixture);
  if (scenario.expectedFailure) {
    runSqlExpectFailure(`Upgrade repair ${scenario.name}`, scenarioDatabase, repairMigration, scenario.expectedFailure);
  } else {
    runSql(`Upgrade repair ${scenario.name}`, scenarioDatabase, repairMigration);
  }
  if (scenario.postRepairMigration) {
    runSql(
      `Post-repair migration ${scenario.name}`,
      scenarioDatabase,
      readFileSync(path.join(migrationRoot, scenario.postRepairMigration, "migration.sql"), "utf8"),
    );
  }
  runSql(`Upgrade assertion ${scenario.name}`, scenarioDatabase, scenario.assertion);
}

console.log("F0 single-user migration proof passed: the full SQL chain and all UUID upgrade branches passed without a network socket. RLS behavior requires the networked CI proof.");
