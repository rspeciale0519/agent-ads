import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  assertNetworkProofMutex,
  networkDatabaseEnvironment,
  networkProofRunningMarker,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
assertNetworkProofMutex(context);
const { databaseUrl, marker, psql, spawnEnvironment } = context;
const targetMarker = networkProofRunningMarker(marker, context.mutex.token);
const expectedDatabase = `f0_prisma_contract_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const psqlArgs = psqlBaseArguments({ quiet: true, tuplesOnly: true, noAlign: true });
const catalogSchema = z.object({
  columns: z.array(z.tuple([
    z.string(),
    z.string(),
    z.string(),
    z.string(),
    z.boolean(),
    z.string(),
    z.string(),
  ])),
  foreignKeys: z.array(z.tuple([
    z.string(),
    z.string(),
    z.string(),
    z.array(z.string()),
    z.string(),
    z.string(),
    z.array(z.string()),
    z.string(),
    z.string(),
    z.string(),
    z.boolean(),
    z.boolean(),
    z.boolean(),
  ])),
  indexes: z.array(z.tuple([
    z.string(),
    z.string(),
    z.string(),
    z.boolean(),
    z.boolean(),
    z.string(),
    z.string(),
  ])),
  tables: z.array(z.tuple([z.string(), z.string(), z.string()])),
});

const catalogSql = String.raw`
WITH managed_tables AS MATERIALIZED (
  SELECT relation.oid,
         namespace.nspname::text AS schema_name,
         relation.relname::text AS table_name,
         relation.relkind::text AS relation_kind
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
   WHERE namespace.nspname IN ('public', 'private')
     AND relation.relkind IN ('r', 'p')
     AND relation.relname <> '_prisma_migrations'
),
table_rows AS (
  SELECT schema_name,
         table_name,
         pg_catalog.jsonb_build_array(schema_name, table_name, relation_kind) AS row_value
    FROM managed_tables
),
column_rows AS (
  SELECT managed.schema_name,
         managed.table_name,
         attribute.attname::text AS column_name,
         pg_catalog.jsonb_build_array(
           managed.schema_name,
           managed.table_name,
           attribute.attname::text,
           CASE
             WHEN attribute.atttypid = 'pg_catalog.timestamp'::pg_catalog.regtype
             THEN pg_catalog.format(
               'timestamp(%s) without time zone',
               CASE WHEN attribute.atttypmod < 0 THEN 6 ELSE attribute.atttypmod END
             )
             WHEN attribute.atttypid = 'pg_catalog.timestamptz'::pg_catalog.regtype
             THEN pg_catalog.format(
               'timestamp(%s) with time zone',
               CASE WHEN attribute.atttypmod < 0 THEN 6 ELSE attribute.atttypmod END
             )
             ELSE pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
           END,
           attribute.attnotnull,
           attribute.attidentity::text,
           attribute.attgenerated::text
         ) AS row_value
    FROM managed_tables AS managed
    JOIN pg_catalog.pg_attribute AS attribute
      ON attribute.attrelid = managed.oid
     AND attribute.attnum > 0
     AND NOT attribute.attisdropped
),
index_rows AS (
  SELECT managed.schema_name,
         managed.table_name,
         index_relation.relname::text AS index_name,
         pg_catalog.jsonb_build_array(
           managed.schema_name,
           managed.table_name,
           index_relation.relname::text,
           index_entry.indisunique,
           index_entry.indisprimary,
           access_method.amname::text,
           pg_catalog.pg_get_indexdef(index_entry.indexrelid)
         ) AS row_value
    FROM managed_tables AS managed
    JOIN pg_catalog.pg_index AS index_entry
      ON index_entry.indrelid = managed.oid
    JOIN pg_catalog.pg_class AS index_relation
      ON index_relation.oid = index_entry.indexrelid
    JOIN pg_catalog.pg_am AS access_method
      ON access_method.oid = index_relation.relam
   WHERE index_entry.indisvalid
     AND index_entry.indisready
     AND index_entry.indislive
),
foreign_key_rows AS (
  SELECT source.schema_name,
         source.table_name,
         constraint_entry.conname::text AS constraint_name,
         pg_catalog.jsonb_build_array(
           source.schema_name,
           source.table_name,
           constraint_entry.conname::text,
           ARRAY(
             SELECT source_attribute.attname::text
               FROM unnest(constraint_entry.conkey) WITH ORDINALITY AS source_key(attnum, position)
               JOIN pg_catalog.pg_attribute AS source_attribute
                 ON source_attribute.attrelid = constraint_entry.conrelid
                AND source_attribute.attnum = source_key.attnum
              ORDER BY source_key.position
           ),
           target_namespace.nspname::text,
           target_relation.relname::text,
           ARRAY(
             SELECT target_attribute.attname::text
               FROM unnest(constraint_entry.confkey) WITH ORDINALITY AS target_key(attnum, position)
               JOIN pg_catalog.pg_attribute AS target_attribute
                 ON target_attribute.attrelid = constraint_entry.confrelid
                AND target_attribute.attnum = target_key.attnum
              ORDER BY target_key.position
           ),
           constraint_entry.confupdtype::text,
           constraint_entry.confdeltype::text,
           constraint_entry.confmatchtype::text,
           constraint_entry.condeferrable,
           constraint_entry.condeferred,
           constraint_entry.convalidated
         ) AS row_value
    FROM managed_tables AS source
    JOIN pg_catalog.pg_constraint AS constraint_entry
      ON constraint_entry.conrelid = source.oid
     AND constraint_entry.contype = 'f'
    JOIN pg_catalog.pg_class AS target_relation
      ON target_relation.oid = constraint_entry.confrelid
    JOIN pg_catalog.pg_namespace AS target_namespace
      ON target_namespace.oid = target_relation.relnamespace
)
SELECT pg_catalog.jsonb_build_object(
  'tables', COALESCE((
    SELECT pg_catalog.jsonb_agg(row_value ORDER BY schema_name, table_name)
      FROM table_rows
  ), '[]'::pg_catalog.jsonb),
  'columns', COALESCE((
    SELECT pg_catalog.jsonb_agg(row_value ORDER BY schema_name, table_name, column_name)
      FROM column_rows
  ), '[]'::pg_catalog.jsonb),
  'indexes', COALESCE((
    SELECT pg_catalog.jsonb_agg(row_value ORDER BY schema_name, table_name, index_name)
      FROM index_rows
  ), '[]'::pg_catalog.jsonb),
  'foreignKeys', COALESCE((
    SELECT pg_catalog.jsonb_agg(row_value ORDER BY schema_name, table_name, constraint_name)
      FROM foreign_key_rows
  ), '[]'::pg_catalog.jsonb)
)::text;
`;

function runPsql(label, databaseName, options = {}) {
  const environment = options.applyDefinition
    ? {
        ...networkDatabaseEnvironment(context, databaseName),
        PGOPTIONS: "-c search_path=public,pg_catalog,pg_temp",
      }
    : networkDatabaseEnvironment(context, databaseName, { trustedCatalogs: true });
  const result = spawnSync(psql, [
    ...psqlArgs,
    ...(options.command ? ["--command", options.command] : []),
  ], {
    cwd: root,
    encoding: "utf8",
    env: environment,
    input: options.input,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60_000,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    if (result.error) throw new Error(`${label} could not start: ${result.error.message}`);
    throw new Error(`${label} failed.`);
  }
  return result.stdout.trim();
}

function catalogRows(rows) {
  return new Set(rows.map((row) => JSON.stringify(row)));
}

function assertExactRows(label, expectedRows, actualRows) {
  const expected = catalogRows(expectedRows);
  const actual = catalogRows(actualRows);
  const missing = [...expected].filter((row) => !actual.has(row));
  const unexpected = [...actual].filter((row) => !expected.has(row));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(`${label} mismatch (missing=${missing.length}, unexpected=${unexpected.length}).`);
  }
}

function assertExpectedRows(label, expectedRows, actualRows) {
  const actual = catalogRows(actualRows);
  let missing = 0;
  for (const row of catalogRows(expectedRows)) {
    if (!actual.has(row)) missing += 1;
  }
  if (missing > 0) throw new Error(`${label} mismatch (missing=${missing}).`);
}

function readCatalog(databaseName) {
  const output = runPsql(`${databaseName} catalog query`, databaseName, { command: catalogSql });
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error(`${databaseName} catalog query returned invalid JSON.`);
  }
  const result = catalogSchema.safeParse(parsed);
  if (!result.success) throw new Error(`${databaseName} catalog query returned an invalid contract.`);
  return result.data;
}

const markerState = runPsql("Prisma catalog marker preflight", "agent_ads_f0", {
  command: `
SELECT CASE
  WHEN pg_catalog.shobj_description(oid, 'pg_database') = '${targetMarker}'
   AND NOT EXISTS (
     SELECT 1 FROM pg_catalog.pg_database
      WHERE datname NOT IN ('postgres', 'template0', 'template1', 'agent_ads_f0')
   )
  THEN 'F0_PRISMA_CATALOG_TARGET_VALID'
  ELSE 'F0_PRISMA_CATALOG_TARGET_INVALID'
END
FROM pg_catalog.pg_database
WHERE datname = pg_catalog.current_database();
`,
});
if (markerState !== "F0_PRISMA_CATALOG_TARGET_VALID") {
  throw new Error("Prisma catalog proof requires the exact marked target without another database.");
}

const diffResult = spawnSync(process.execPath, [
  path.join(root, "node_modules", "prisma", "build", "index.js"),
  "migrate",
  "diff",
  "--from-empty",
  "--to-schema-datamodel",
  path.join(root, "prisma", "schema.prisma"),
  "--script",
], {
  cwd: root,
  encoding: "utf8",
  env: { ...spawnEnvironment, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
  maxBuffer: 10 * 1024 * 1024,
  timeout: 60_000,
  killSignal: "SIGKILL",
  windowsHide: true,
});
if (diffResult.error || diffResult.status !== 0 || !diffResult.stdout.includes("-- CreateTable")) {
  throw new Error("Prisma catalog definition generation failed.");
}

let expectedDatabaseCreationAttempted = false;
let proofError;
try {
  expectedDatabaseCreationAttempted = true;
  runPsql(
    "Prisma catalog database creation",
    "agent_ads_f0",
    { command: `CREATE DATABASE "${expectedDatabase}" TEMPLATE template1` },
  );
  runPsql("Prisma catalog definition application", expectedDatabase, {
    applyDefinition: true,
    input: diffResult.stdout,
  });

  const expected = readCatalog(expectedDatabase);
  const actual = readCatalog("agent_ads_f0");
  assertExactRows("Prisma-visible table contract", expected.tables, actual.tables);
  assertExactRows("Prisma-visible column contract", expected.columns, actual.columns);
  assertExpectedRows("Prisma-visible index contract", expected.indexes, actual.indexes);
  assertExpectedRows("Prisma-visible foreign-key contract", expected.foreignKeys, actual.foreignKeys);

  console.log(
    `Prisma application catalog proof passed: ${expected.tables.length} tables and ${expected.columns.length} columns match exactly; ${expected.indexes.length} Prisma-declared indexes and ${expected.foreignKeys.length} Prisma-declared foreign keys are present.`,
  );
} catch (error) {
  proofError = error;
}

const cleanupErrors = [];
if (expectedDatabaseCreationAttempted) {
  try {
    runPsql(
      "Prisma catalog database cleanup",
      "agent_ads_f0",
      { command: `DROP DATABASE IF EXISTS "${expectedDatabase}" WITH (FORCE)` },
    );
  } catch (error) {
    cleanupErrors.push(error);
  }
  try {
    const absence = runPsql("Prisma catalog cleanup verification", "agent_ads_f0", {
      command: `
SELECT CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_database WHERE datname = '${expectedDatabase}'
  ) THEN 'F0_PRISMA_CATALOG_DATABASE_GONE'
  ELSE 'F0_PRISMA_CATALOG_DATABASE_REMAINS'
END;
`,
    });
    if (absence !== "F0_PRISMA_CATALOG_DATABASE_GONE") {
      throw new Error("Prisma catalog proof database remained after cleanup.");
    }
  } catch (error) {
    cleanupErrors.push(error);
  }
}

if (proofError && cleanupErrors.length > 0) {
  throw new AggregateError(
    [proofError, ...cleanupErrors],
    "Prisma catalog proof and cleanup both failed.",
  );
}
if (proofError) throw proofError;
if (cleanupErrors.length === 1) throw cleanupErrors[0];
if (cleanupErrors.length > 1) {
  throw new AggregateError(cleanupErrors, "Prisma catalog proof cleanup failed.");
}
