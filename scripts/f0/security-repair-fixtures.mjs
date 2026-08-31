const limiter = "private.consume_rate_limit(text,integer,integer,uuid)";
const createSecret = "vault.create_secret(text,text,text,uuid)";
const updateSecret = "vault.update_secret(uuid,text,text,text,uuid)";
const fixtureOwner = "f0_security_repair_owner";

const driftSql = `
ALTER TABLE private.rate_limit_buckets NO FORCE ROW LEVEL SECURITY;
GRANT EXECUTE ON FUNCTION ${createSecret} TO service_role;
GRANT EXECUTE ON FUNCTION ${updateSecret} TO service_role;
`;

// Store only catalog state and one known synthetic row. No Vault function runs.
// Resolve role IDs at query time; stored views cannot contain regrole constants.
const snapshotViewSql = `
CREATE VIEW f0_security_repair.current_state AS
SELECT
  jsonb_build_object(
    'functions', (
      SELECT jsonb_agg(jsonb_build_object(
        'catalog', to_jsonb(p) - 'prosrc' - 'probin' - 'proacl',
        'source_hash', encode(sha256(convert_to(p.prosrc, 'UTF8')), 'hex'),
        'binary_hash', encode(sha256(convert_to(p.probin, 'UTF8')), 'hex'),
        'acl', CASE WHEN p.oid IN (to_regprocedure('${createSecret}'), to_regprocedure('${updateSecret}'))
          THEN NULL ELSE p.proacl::text END
      ) ORDER BY p.oid)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('private', 'vault')
    ),
    'limiter_table', (
      SELECT jsonb_build_array(c.oid, c.relowner, c.relkind, c.relrowsecurity, c.relacl::text)
      FROM pg_class c WHERE c.oid = 'private.rate_limit_buckets'::regclass
    ),
    'limiter_policies', (
      SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.oid), '[]'::jsonb)
      FROM pg_policy p WHERE p.polrelid = 'private.rate_limit_buckets'::regclass
    ),
    'vault_relations', (
      SELECT jsonb_agg(jsonb_build_array(c.oid, c.relowner, c.relkind, c.relacl::text,
        c.relrowsecurity, c.relforcerowsecurity, c.reloptions) ORDER BY c.oid)
      FROM pg_class c WHERE c.oid IN ('vault.secrets'::regclass, 'vault.decrypted_secrets'::regclass)
    ),
    'schemas', (
      SELECT jsonb_agg(jsonb_build_array(n.oid, n.nspowner, n.nspacl::text) ORDER BY n.oid)
      FROM pg_namespace n WHERE n.nspname IN ('private', 'vault')
    ),
    'other_vault_grants', (
      SELECT coalesce(jsonb_agg(jsonb_build_array(p.oid, a.grantor, a.grantee,
        a.privilege_type, a.is_grantable)
        ORDER BY p.oid, a.grantor, a.grantee, a.privilege_type), '[]'::jsonb)
      FROM pg_proc p CROSS JOIN LATERAL aclexplode(
        nullif(coalesce(p.proacl, acldefault('f', p.proowner)), '{}'::aclitem[])
      ) a
      WHERE p.oid IN (to_regprocedure('${createSecret}'), to_regprocedure('${updateSecret}'))
        AND a.grantee <> (SELECT oid FROM pg_roles WHERE rolname = 'service_role')
    ),
    'bucket', (
      SELECT to_jsonb(bucket) FROM private.rate_limit_buckets bucket WHERE key_hash = repeat('e', 64)
    )
  ) AS invariants,
  jsonb_build_object(
    'roles', (
      SELECT jsonb_agg(jsonb_build_array(r.oid, r.rolname, r.rolsuper, r.rolinherit,
        r.rolcreaterole, r.rolcreatedb, r.rolcanlogin, r.rolreplication, r.rolbypassrls,
        r.rolconnlimit, r.rolvaliduntil, r.rolconfig) ORDER BY r.oid) FROM pg_roles r
    ),
    'memberships', (
      SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.roleid, m.member, m.grantor), '[]'::jsonb)
      FROM pg_auth_members m
    )
  ) AS globals,
  jsonb_build_object(
    'force', (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'private.rate_limit_buckets'::regclass),
    'vault_acls', (
      SELECT jsonb_agg(jsonb_build_array(p.oid, p.proacl::text) ORDER BY p.oid)
      FROM pg_proc p WHERE p.oid IN (to_regprocedure('${createSecret}'), to_regprocedure('${updateSecret}'))
    )
  ) AS repair_state,
  (SELECT relowner FROM pg_class WHERE oid = 'private.rate_limit_buckets'::regclass) AS limiter_owner;
`;

const initialSql = `
CREATE SCHEMA f0_security_repair;
INSERT INTO private.rate_limit_buckets (
  key_hash, organization_id, window_started_at, hit_count, expires_at, updated_at
) VALUES (
  repeat('e', 64), NULL, '2040-01-01 00:00:00+00', 7, '2040-01-01 00:01:00+00', '2040-01-01 00:00:00+00'
);
${snapshotViewSql}
CREATE TABLE f0_security_repair.initial AS SELECT * FROM f0_security_repair.current_state;
DO $initial_contract$
BEGIN
  IF (SELECT count(*) FROM pg_proc WHERE oid IN (
    to_regprocedure('${limiter}'), to_regprocedure('${createSecret}'), to_regprocedure('${updateSecret}')
  )) <> 3 OR (SELECT rolinherit FROM pg_roles WHERE rolname = 'app_runtime') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'F0_SECURITY_REPAIR_SOURCE_CONTRACT_INVALID';
  END IF;
END
$initial_contract$;
`;

const preservedSql = `
DO $preserved$
DECLARE
  prior record;
  present record;
BEGIN
  SELECT * INTO STRICT prior FROM f0_security_repair.before_repair;
  SELECT * INTO STRICT present FROM f0_security_repair.current_state;
  IF present.invariants IS DISTINCT FROM prior.invariants OR present.globals IS DISTINCT FROM prior.globals
     OR present.limiter_owner IS DISTINCT FROM prior.limiter_owner THEN
    RAISE EXCEPTION 'F0_SECURITY_REPAIR_CHANGED_UNRELATED_STATE';
  END IF;
END
$preserved$;
`;

const repairedSql = `
${preservedSql}
DO $repaired$
BEGIN
  IF (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
      WHERE oid = 'private.rate_limit_buckets'::regclass) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'F0_SECURITY_REPAIR_FORCE_MISSING';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES ('${createSecret}'), ('${updateSecret}')) f(signature)
    CROSS JOIN (VALUES ('app_secret_broker'::name, true), ('service_role'::name, false),
      ('app_runtime'::name, false), ('anon'::name, false), ('authenticated'::name, false)) r(role_name, allowed)
    WHERE has_function_privilege(r.role_name, to_regprocedure(f.signature), 'EXECUTE') IS DISTINCT FROM r.allowed
  ) THEN
    RAISE EXCEPTION 'F0_SECURITY_REPAIR_EFFECTIVE_GRANTS_INVALID';
  END IF;
END
$repaired$;
`;

function sameStateSql(table, message) {
  if (!new Set(["before_repair", "after_first"]).has(table)) throw new Error("Unsafe repair snapshot table.");
  return `
DO $same_state$
DECLARE
  prior record;
  present record;
BEGIN
  SELECT * INTO STRICT prior FROM f0_security_repair.${table};
  SELECT * INTO STRICT present FROM f0_security_repair.current_state;
  IF to_jsonb(present) IS DISTINCT FROM to_jsonb(prior) THEN
    RAISE EXCEPTION '${message}';
  END IF;
END
$same_state$;
`;
}

const globalsRestoredSql = `
DO $globals_restored$
BEGIN
  IF (SELECT globals FROM f0_security_repair.current_state)
      IS DISTINCT FROM (SELECT globals FROM f0_security_repair.initial) THEN
    RAISE EXCEPTION 'F0_SECURITY_REPAIR_GLOBAL_METADATA_NOT_RESTORED';
  END IF;
END
$globals_restored$;
`;

const restoreOwnerSql = `
DO $restore_owner$
DECLARE
  original_owner name;
BEGIN
  SELECT r.rolname INTO STRICT original_owner FROM f0_security_repair.initial s
  JOIN pg_roles r ON r.oid = s.limiter_owner;
  EXECUTE format('ALTER TABLE private.rate_limit_buckets OWNER TO %I', original_owner);
  EXECUTE format('ALTER FUNCTION ${limiter} OWNER TO %I', original_owner);
END
$restore_owner$;
REVOKE USAGE ON SCHEMA private FROM ${fixtureOwner} RESTRICT;
DROP ROLE ${fixtureOwner};
`;

const bypassOwnerSql = `
CREATE ROLE ${fixtureOwner} NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
GRANT USAGE ON SCHEMA private TO ${fixtureOwner};
ALTER TABLE private.rate_limit_buckets OWNER TO ${fixtureOwner};
ALTER FUNCTION ${limiter} OWNER TO ${fixtureOwner};
`;

const scenarios = [
  { name: "clean", fixture: "" },
  { name: "drift", fixture: driftSql },
  { name: "bypass_owner", fixture: `${driftSql}${bypassOwnerSql}`, cleanup: restoreOwnerSql },
  {
    name: "invoker",
    fixture: `${driftSql}ALTER FUNCTION ${limiter} SECURITY INVOKER;`,
    expectedFailure: "ACCOUNT_CONNECTIONS_RATE_LIMIT_DEFINER_CONTRACT_INVALID",
  },
  {
    name: "missing_delete",
    fixture: `${driftSql}${bypassOwnerSql}
REVOKE DELETE ON TABLE private.rate_limit_buckets FROM ${fixtureOwner} RESTRICT;
DO $missing_delete_fixture$
BEGIN
  IF has_table_privilege('${fixtureOwner}', 'private.rate_limit_buckets', 'DELETE') IS DISTINCT FROM false
     OR has_table_privilege('${fixtureOwner}', 'private.rate_limit_buckets', 'SELECT') IS DISTINCT FROM true
     OR has_table_privilege('${fixtureOwner}', 'private.rate_limit_buckets', 'INSERT') IS DISTINCT FROM true
     OR has_table_privilege('${fixtureOwner}', 'private.rate_limit_buckets', 'UPDATE') IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'F0_SECURITY_REPAIR_MISSING_DELETE_FIXTURE_INVALID';
  END IF;
END
$missing_delete_fixture$;`,
    expectedFailure: "ACCOUNT_CONNECTIONS_RATE_LIMIT_DEFINER_CONTRACT_INVALID",
    cleanup: restoreOwnerSql,
  },
  {
    name: "public_execute",
    fixture: `${driftSql}GRANT EXECUTE ON FUNCTION ${updateSecret} TO PUBLIC;`,
    expectedFailure: "ACCOUNT_CONNECTIONS_VAULT_EXECUTE_REPAIR_FAILED",
  },
  {
    name: "missing_broker",
    fixture: `${driftSql}REVOKE EXECUTE ON FUNCTION ${updateSecret} FROM app_secret_broker RESTRICT;`,
    expectedFailure: "ACCOUNT_CONNECTIONS_BROKER_EXECUTE_CONTRACT_INVALID",
  },
  {
    name: "inherit",
    fixture: `${driftSql}ALTER ROLE app_runtime INHERIT;`,
    expectedFailure: "ACCOUNT_CONNECTIONS_PERMISSION_ROLE_CONTRACT_INVALID",
    cleanup: "ALTER ROLE app_runtime NOINHERIT;",
  },
];

function transaction(sql) {
  return `BEGIN;\nSET LOCAL search_path = pg_catalog;\nSET LOCAL lock_timeout = '1s';\nSET LOCAL statement_timeout = '15s';\n${sql}\nCOMMIT;\n`;
}

// This module has no connection or process entry point. Callbacks belong to the
// existing marked single-user runner or the mutex-protected network runner.
export function runSecurityRepairProof({ cloneDatabase, runSql, runSqlExpectFailure, repairMigration }) {
  if (![cloneDatabase, runSql, runSqlExpectFailure].every((callback) => typeof callback === "function")
      || typeof repairMigration !== "string" || !/^BEGIN;/u.test(repairMigration)
      || !/COMMIT;\s*$/u.test(repairMigration)) {
    throw new Error("Security repair proof requires guarded callbacks and the complete migration.");
  }
  for (const scenario of scenarios) {
    const database = `agent_ads_f0_security_${scenario.name}`;
    cloneDatabase(database);
    runSql(`Security repair baseline ${scenario.name}`, database, transaction(initialSql));
    let fixtureCommitted = false;
    const errors = [];
    try {
      runSql(`Security repair fixture ${scenario.name}`, database, transaction(`${scenario.fixture}
CREATE TABLE f0_security_repair.before_repair AS SELECT * FROM f0_security_repair.current_state;`));
      fixtureCommitted = true;
      if (scenario.expectedFailure) {
        runSqlExpectFailure(`Security repair rejection ${scenario.name}`, database, repairMigration, scenario.expectedFailure);
        // Each callback starts another process/session after the migration exits.
        runSql(`Security repair rollback ${scenario.name}`, database,
          transaction(sameStateSql("before_repair", "F0_SECURITY_REPAIR_ROLLBACK_CHANGED_STATE")));
      } else {
        runSql(`Security repair first apply ${scenario.name}`, database, repairMigration);
        runSql(`Security repair first assertion ${scenario.name}`, database, transaction(`${repairedSql}
CREATE TABLE f0_security_repair.after_first AS SELECT * FROM f0_security_repair.current_state;`));
        runSql(`Security repair repeated apply ${scenario.name}`, database, repairMigration);
        runSql(`Security repair repeated assertion ${scenario.name}`, database, transaction(`${repairedSql}
${sameStateSql("after_first", "F0_SECURITY_REPAIR_REPEAT_CHANGED_STATE")}`));
      }
    } catch (error) {
      errors.push(error);
    } finally {
      // Restore run-owned role changes only after a confirmed fixture commit.
      // An uncertain process result after COMMIT fails this proof. Never reuse
      // that marked disposable cluster.
      try {
        if (fixtureCommitted && scenario.cleanup) {
          runSql(`Security repair role cleanup ${scenario.name}`, database, transaction(scenario.cleanup));
        }
        runSql(`Security repair global assertion ${scenario.name}`, database, transaction(globalsRestoredSql));
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `Security repair ${scenario.name} and cleanup failed.`);
  }
}
