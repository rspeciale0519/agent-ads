import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  networkDatabaseEnvironment,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
const { databaseUrl, marker, psql } = context;
const psqlArgs = psqlBaseArguments();
const clusterGuard = readFileSync(
  path.join(root, "scripts", "f0", "disposable-cluster-guard.sql"),
  "utf8",
);
const verifyScript = path.join(root, "scripts", "f0", "verify-disposable.sql");

function safeOutput(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`.replaceAll(databaseUrl, "[REDACTED_DATABASE_URL]");
}

function runPsql(label, args, database = "agent_ads_f0", options = { trustedCatalogs: true }) {
  const result = spawnSync(psql, args, {
    cwd: root,
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, database, options),
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    process.stderr.write(safeOutput(result));
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed.`);
  }
}

function runSql(label, sql, database = "agent_ads_f0") {
  runPsql(
    label,
    [...psqlArgs, "--command", sql],
    database,
  );
}

function verifyGuard(label, selectedMarker = marker) {
  runPsql(label, [
    ...psqlArgs,
    "--set",
    `f0_marker=${selectedMarker}`,
    "--file",
    verifyScript,
  ]);
}

function verifyGuardFailure(label, expectedMessage, selectedMarker = marker) {
  const result = spawnSync(psql, [
    ...psqlArgs,
    "--set",
    `f0_marker=${selectedMarker}`,
    "--file",
    verifyScript,
  ], {
    cwd: root,
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = safeOutput(result);
  if (!result.error && result.status === 0) throw new Error(`${label} unexpectedly passed.`);
  if (!output.includes(expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} failed without the expected guard message.`);
  }
}

function verifySessionSpoofFailure(label, setupSql, expectedMessage) {
  const result = spawnSync(psql, psqlArgs, {
    cwd: root,
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
    input: `${setupSql}
SELECT pg_catalog.set_config('f0.expected_database', 'agent_ads_f0', false);
SELECT pg_catalog.set_config('f0.allowed_database', 'agent_ads_f0', false);
${clusterGuard}
`,
    maxBuffer: 10 * 1024 * 1024,
  });
  const output = safeOutput(result);
  if (!result.error && result.status === 0) throw new Error(`${label} unexpectedly passed.`);
  if (!output.includes(expectedMessage)) {
    process.stderr.write(output);
    throw new Error(`${label} failed without the expected guard message.`);
  }
}

const scenarios = [
  {
    name: "disabled database",
    setup: [
      {
        sql: "CREATE DATABASE f0_guard_hidden_database",
        cleanup: "DROP DATABASE f0_guard_hidden_database WITH (FORCE)",
      },
      {
        sql: "ALTER DATABASE f0_guard_hidden_database WITH ALLOW_CONNECTIONS false",
      },
    ],
    expected: "F0 disposable guard found an unexpected database",
  },
  {
    name: "database attributes",
    setup: [{
      sql: "ALTER DATABASE agent_ads_f0 CONNECTION LIMIT 2",
      cleanup: "ALTER DATABASE agent_ads_f0 CONNECTION LIMIT -1",
    }],
    expected: "F0 disposable guard found unexpected database attributes",
  },
  {
    name: "template1 schema",
    database: "template1",
    setup: [{
      sql: "CREATE SCHEMA f0_guard_unexpected_template_schema",
      cleanup: "DROP SCHEMA f0_guard_unexpected_template_schema CASCADE",
    }],
    expected: "F0 disposable guard found an unexpected schema",
  },
  {
    name: "role",
    setup: [{
      sql: "CREATE ROLE f0_guard_unexpected_role NOLOGIN",
      cleanup: "DROP ROLE f0_guard_unexpected_role",
    }],
    expected: "F0 disposable guard found an unexpected predefined role",
  },
  {
    name: "current role attributes",
    setup: [{
      sql: "ALTER ROLE CURRENT_USER NOBYPASSRLS",
      cleanup: "ALTER ROLE CURRENT_USER BYPASSRLS",
    }],
    expected: "F0 disposable guard found unexpected current-role attributes",
  },
  {
    name: "predefined role membership",
    setup: [{
      sql: "GRANT pg_read_all_data TO CURRENT_USER",
      cleanup: "REVOKE pg_read_all_data FROM CURRENT_USER",
    }],
    expected: "F0 disposable guard found an unexpected role membership",
  },
  {
    name: "schema",
    setup: [{
      sql: "CREATE SCHEMA f0_guard_unexpected_schema",
      cleanup: "DROP SCHEMA f0_guard_unexpected_schema CASCADE",
    }],
    expected: "F0 disposable guard found an unexpected schema",
  },
  {
    name: "relation",
    setup: [{
      sql: "CREATE TABLE public.f0_guard_unexpected_relation (id integer)",
      cleanup: "DROP TABLE public.f0_guard_unexpected_relation",
    }],
    expected: "F0 disposable guard found an unexpected relation",
  },
  {
    name: "routine",
    setup: [{
      sql: "CREATE FUNCTION public.f0_guard_unexpected_routine() RETURNS integer LANGUAGE sql AS $$ SELECT 1 $$",
      cleanup: "DROP FUNCTION public.f0_guard_unexpected_routine()",
    }],
    expected: "F0 disposable guard found an unexpected routine",
  },
  {
    name: "type",
    setup: [{
      sql: "CREATE TYPE public.f0_guard_unexpected_type AS ENUM ('value')",
      cleanup: "DROP TYPE public.f0_guard_unexpected_type",
    }],
    expected: "F0 disposable guard found an unexpected type",
  },
  {
    name: "built-in cast",
    setup: [{
      sql: "CREATE CAST (xid AS cid) WITHOUT FUNCTION",
      cleanup: "DROP CAST (xid AS cid)",
    }],
    expected: "F0 disposable guard found an unexpected cast",
  },
  {
    name: "access method",
    setup: [{
      sql: "CREATE ACCESS METHOD f0_guard_unexpected_am TYPE INDEX HANDLER bthandler",
      cleanup: "DROP ACCESS METHOD f0_guard_unexpected_am",
    }],
    expected: "F0 disposable guard found an unexpected access method",
  },
  {
    name: "public schema privilege",
    setup: [{
      sql: "GRANT CREATE ON SCHEMA public TO PUBLIC",
      cleanup: "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
    }],
    expected: "F0 disposable guard found unexpected public-schema ownership or privileges",
  },
  {
    name: "publication",
    setup: [{
      sql: "CREATE PUBLICATION f0_guard_unexpected_publication",
      cleanup: "DROP PUBLICATION f0_guard_unexpected_publication",
    }],
    expected: "F0 disposable guard found an unexpected publication",
  },
  {
    name: "foreign-data wrapper",
    setup: [{
      sql: "CREATE FOREIGN DATA WRAPPER f0_guard_unexpected_fdw NO HANDLER NO VALIDATOR",
      cleanup: "DROP FOREIGN DATA WRAPPER f0_guard_unexpected_fdw",
    }],
    expected: "F0 disposable guard found an unexpected foreign-data wrapper",
  },
  {
    name: "large object",
    setup: [{
      sql: "SELECT lo_create(987654321)",
      cleanup: "SELECT lo_unlink(987654321)",
    }],
    expected: "F0 disposable guard found an unexpected large object",
  },
  {
    name: "database role setting",
    setup: [{
      sql: "DO $$ BEGIN EXECUTE format('ALTER ROLE %I IN DATABASE %I SET statement_timeout = %L', current_user, current_database(), '1s'); END $$",
      cleanup: "DO $$ BEGIN EXECUTE format('ALTER ROLE %I IN DATABASE %I RESET statement_timeout', current_user, current_database()); END $$",
    }],
    expected: "F0 disposable guard found an unexpected database role setting",
  },
  {
    name: "startup search path",
    database: "postgres",
    setup: [
      {
        sql: "CREATE SCHEMA f0_guard_spoof; CREATE FUNCTION f0_guard_spoof.current_database() RETURNS name LANGUAGE sql IMMUTABLE AS $$ SELECT 'spoof'::name $$",
        cleanup: "DROP SCHEMA f0_guard_spoof CASCADE",
      },
      {
        sql: "ALTER DATABASE postgres SET search_path = f0_guard_spoof, pg_catalog",
        cleanup: "ALTER DATABASE postgres RESET search_path",
      },
    ],
    expected: "F0 disposable guard found an unexpected schema",
  },
  {
    name: "login event trigger",
    database: "postgres",
    setup: [
      {
        sql: "CREATE FUNCTION public.f0_guard_login_failure() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'F0 LOGIN TRIGGER FIRED'; END $$",
        cleanup: "DROP FUNCTION public.f0_guard_login_failure()",
      },
      {
        sql: "CREATE EVENT TRIGGER f0_guard_login_failure ON login EXECUTE FUNCTION public.f0_guard_login_failure()",
        cleanup: "DROP EVENT TRIGGER f0_guard_login_failure",
      },
    ],
    expected: "F0 disposable guard found unexpected database attributes",
  },
];

verifyGuard("Baseline disposable guard verification");
verifySessionSpoofFailure(
  "Temporary relation shadow verification",
  "CREATE TEMP TABLE pg_database AS SELECT * FROM pg_catalog.pg_database WITH NO DATA;",
  "F0 disposable guard found an unexpected relation",
);
verifySessionSpoofFailure(
  "Temporary type shadow verification",
  "CREATE TEMP TABLE f0_temp_schema_init (id integer); DROP TABLE f0_temp_schema_init; CREATE DOMAIN pg_temp.regrole AS text;",
  "F0 disposable guard found an unexpected type",
);
verifyGuardFailure(
  "Wrong disposable marker verification",
  "F0 proof target is missing its server-side disposable marker",
  "f0000000-0000-4000-8000-000000000002",
);

for (const scenario of scenarios) {
  const completedSteps = [];
  try {
    for (const step of scenario.setup) {
      runSql(`${scenario.name} setup`, step.sql, scenario.database);
      completedSteps.push(step);
    }
    verifyGuardFailure(`${scenario.name} guard`, scenario.expected);
  } finally {
    let cleanupFailure;
    for (const step of completedSteps.reverse()) {
      if (!step.cleanup) continue;
      try {
        runSql(`${scenario.name} cleanup`, step.cleanup, scenario.database);
      } catch (error) {
        cleanupFailure ??= error;
      }
    }
    if (cleanupFailure) throw cleanupFailure;
  }
}

// PostgreSQL clears stale dathasloginevt only during a normal login after the trigger is gone.
runPsql(
  "Login event-trigger state refresh",
  [...psqlArgs, "--command", "SELECT pg_catalog.current_database()"],
  "postgres",
  { trustedCatalogs: false },
);
verifyGuard("Post-scenario disposable guard verification");

console.log(`F0 disposable guard proof passed: ${scenarios.length} dirty-target cases and the wrong-marker case were rejected.`);
