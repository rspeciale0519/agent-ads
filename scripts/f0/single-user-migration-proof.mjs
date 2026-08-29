import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSingleUserGuardSql,
  buildSingleUserInventorySql,
  resolveSingleUserContext,
  runSingleUserSql,
  runSingleUserSqlExpectFailure,
} from "./single-user-safety.mjs";
import { upgradeScenarios } from "./upgrade-fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveSingleUserContext(root);

function withoutPsqlCommands(sql) {
  return sql.split(/\r?\n/u).filter((line) => !line.trimStart().startsWith("\\")).join("\n");
}

function runSql(label, database, sql, options) {
  runSingleUserSql(context, label, database, sql, options);
}

function runSqlExpectFailure(label, database, sql, expectedMessage, options) {
  runSingleUserSqlExpectFailure(context, label, database, sql, expectedMessage, options);
}

const disposableClusterGuard = buildSingleUserGuardSql(context.root, context.marker, "verify");

runSql(
  "Disposable cluster guard",
  "postgres",
  disposableClusterGuard,
  { trustedCatalogs: true },
);
runSql(
  "Disposable template1 guard",
  "template1",
  buildSingleUserInventorySql(context.root, "template1"),
  { trustedCatalogs: true },
);
runSql("Disposable database creation", "postgres", "CREATE DATABASE agent_ads_f0 TEMPLATE template1;\n");

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
runSql("Upgrade template creation", "postgres", `CREATE DATABASE ${upgradeTemplate} TEMPLATE template1;\n`);
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
