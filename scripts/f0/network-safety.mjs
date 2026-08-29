import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { devNull } from "node:os";
import path from "node:path";

const markerPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const mutexEnvironmentNames = Object.freeze([
  "F0_NETWORK_MUTEX_TOKEN",
  "F0_NETWORK_MUTEX_BACKEND_PID",
  "F0_NETWORK_MUTEX_SYSTEM_IDENTIFIER",
]);
const allowedHosts = new Set(["127.0.0.1", "[::1]"]);
const allowedProtocols = new Set(["postgres:", "postgresql:"]);
const mutexDigest = createHash("sha256").update("agent-ads:f0-network-proof:v1").digest();
export const NETWORK_PROOF_MUTEX_KEYS = Object.freeze([
  mutexDigest.readUInt32BE(0) & 0x7fff_ffff,
  mutexDigest.readUInt32BE(4) & 0x7fff_ffff,
]);

export function resolveNetworkProofContext(environment = process.env) {
  if (environment.F0_ALLOW_DISPOSABLE_DATABASE !== "1") {
    throw new Error("F0_ALLOW_DISPOSABLE_DATABASE=1 is required for this destructive disposable-database proof.");
  }

  const databaseUrl = environment.F0_DATABASE_URL;
  const marker = environment.F0_DISPOSABLE_MARKER;
  if (!databaseUrl || !markerPattern.test(marker || "")) {
    throw new Error("F0_DATABASE_URL and a canonical lowercase UUIDv4 F0_DISPOSABLE_MARKER are required.");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("F0_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  let databasePath;
  let password;
  let username;
  try {
    databasePath = decodeURIComponent(parsed.pathname);
    password = decodeURIComponent(parsed.password);
    username = decodeURIComponent(parsed.username);
  } catch {
    throw new Error("F0_DATABASE_URL must contain valid encoded connection fields.");
  }

  if (
    !allowedProtocols.has(parsed.protocol)
    || !allowedHosts.has(parsed.hostname)
    || databasePath !== "/agent_ads_f0"
    || parsed.search !== ""
    || parsed.hash !== ""
  ) {
    throw new Error(
      "F0_DATABASE_URL must use a numeric loopback PostgreSQL authority, the agent_ads_f0 database, and no query or fragment overrides.",
    );
  }
  if (parsed.port === "" || username === "" || password === "") {
    throw new Error("F0_DATABASE_URL must include an explicit port, username, and password.");
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("F0_DATABASE_URL must include a valid explicit PostgreSQL port.");
  }

  const mutexValues = mutexEnvironmentNames.map((name) => environment[name]);
  const suppliedMutexValues = mutexValues.filter((value) => value !== undefined);
  let mutex = null;
  if (suppliedMutexValues.length > 0) {
    const [token, backendPidText, systemIdentifier] = mutexValues;
    const backendPid = Number(backendPidText);
    if (
      suppliedMutexValues.length !== mutexEnvironmentNames.length
      || !markerPattern.test(token || "")
      || !Number.isSafeInteger(backendPid)
      || backendPid < 1
      || backendPid > 2_147_483_647
      || !/^[1-9][0-9]{0,19}$/u.test(systemIdentifier || "")
    ) {
      throw new Error("F0 network proof mutex context is invalid.");
    }
    mutex = { backendPid, systemIdentifier, token };
  }

  const spawnEnvironment = {
    ...Object.fromEntries(
      Object.entries(environment).filter(([name]) => (
        !name.toUpperCase().startsWith("PG")
        && !mutexEnvironmentNames.includes(name.toUpperCase())
      )),
    ),
    ...(mutex ? {
      F0_NETWORK_MUTEX_TOKEN: mutex.token,
      F0_NETWORK_MUTEX_BACKEND_PID: String(mutex.backendPid),
      F0_NETWORK_MUTEX_SYSTEM_IDENTIFIER: mutex.systemIdentifier,
    } : {}),
  };
  const psql = environment.PSQL_BIN || "psql";
  if (!/^psql(?:\.exe)?$/iu.test(path.basename(psql))) {
    throw new Error("PSQL_BIN must resolve to the PostgreSQL psql executable.");
  }
  const versionEnvironment = Object.fromEntries(
    Object.entries(spawnEnvironment).filter(([name]) => name.toUpperCase() !== "F0_DATABASE_URL"),
  );
  const versionResult = spawnSync(psql, ["--version"], {
    encoding: "utf8",
    env: versionEnvironment,
    windowsHide: true,
  });
  const versionOutput = `${versionResult.stdout || ""}\n${versionResult.stderr || ""}`.trim();
  if (
    versionResult.error
    || versionResult.status !== 0
    || !/^psql \(PostgreSQL\) (?:16|17)(?:\.|\s|$)/u.test(versionOutput)
  ) {
    throw new Error("PSQL_BIN must identify itself as a PostgreSQL 16 or 17 psql executable.");
  }

  return {
    connection: {
      host: parsed.hostname === "[::1]" ? "::1" : parsed.hostname,
      password,
      port: parsed.port,
      username,
    },
    databaseUrl,
    marker,
    mutex,
    psql,
    spawnEnvironment,
  };
}

export function networkProofMutexApplicationName(token) {
  if (!markerPattern.test(token)) throw new Error("Unsafe F0 network proof mutex token.");
  return `agent_ads_f0_mutex_${token.replaceAll("-", "")}`;
}

export function networkProofMutexChildEnvironment(context, mutex) {
  return {
    ...context.spawnEnvironment,
    F0_NETWORK_MUTEX_TOKEN: mutex.token,
    F0_NETWORK_MUTEX_BACKEND_PID: String(mutex.backendPid),
    F0_NETWORK_MUTEX_SYSTEM_IDENTIFIER: mutex.systemIdentifier,
  };
}

export function psqlBaseArguments(options = {}) {
  const args = ["-X", "--no-password", "--set", "ON_ERROR_STOP=1"];
  if (options.quiet === true) args.push("--quiet");
  if (options.tuplesOnly === true) args.push("--tuples-only");
  if (options.noAlign === true) args.push("--no-align");
  return args;
}

export function networkDatabaseEnvironment(context, databaseName, options = {}) {
  if (!/^[a-z][a-z0-9_]{0,62}$/u.test(databaseName)) {
    throw new Error("Unsafe F0 database name.");
  }

  const environment = {
    ...Object.fromEntries(
      Object.entries(context.spawnEnvironment).filter(
        ([name]) => name.toUpperCase() !== "F0_DATABASE_URL",
      ),
    ),
    PGDATABASE: databaseName,
    PGCONNECT_TIMEOUT: "5",
    PGHOST: context.connection.host,
    PGPASSFILE: devNull,
    PGPASSWORD: context.connection.password,
    PGPORT: context.connection.port,
    PGUSER: context.connection.username,
  };
  if (options.trustedCatalogs === true) {
    environment.PGOPTIONS = "-c event_triggers=false -c search_path=pg_catalog,pg_temp";
  }
  return environment;
}

export function assertNetworkProofMutex(context) {
  if (!context.mutex) throw new Error("F0 network proof mutex context is required before database access.");
  const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;
  const applicationName = networkProofMutexApplicationName(context.mutex.token);
  const sql = `
WITH lock_attempt AS MATERIALIZED (
  SELECT pg_catalog.pg_try_advisory_lock(${keyOne}, ${keyTwo}) AS acquired
),
release_attempt AS MATERIALIZED (
  SELECT CASE
    WHEN acquired THEN pg_catalog.pg_advisory_unlock(${keyOne}, ${keyTwo})
    ELSE false
  END AS released
  FROM lock_attempt
)
SELECT CASE
  WHEN system.system_identifier::text = '${context.mutex.systemIdentifier}'
   AND EXISTS (
     SELECT 1
     FROM pg_catalog.pg_stat_activity AS holder
     JOIN pg_catalog.pg_locks AS held_mutex
       ON held_mutex.pid = holder.pid
      AND held_mutex.database = holder.datid
     WHERE holder.pid = ${context.mutex.backendPid}
       AND holder.datid = (
         SELECT database_entry.oid
         FROM pg_catalog.pg_database AS database_entry
         WHERE database_entry.datname = pg_catalog.current_database()
       )
       AND holder.application_name = '${applicationName}'
       AND held_mutex.locktype = 'advisory'
       AND held_mutex.classid = (${keyOne})::pg_catalog.oid
       AND held_mutex.objid = (${keyTwo})::pg_catalog.oid
       AND held_mutex.objsubid = 2
       AND held_mutex.mode = 'ExclusiveLock'
       AND held_mutex.granted
   )
   AND lock_attempt.acquired = false
   AND release_attempt.released = false
  THEN 'F0_NETWORK_MUTEX_VALID'
  ELSE 'F0_NETWORK_MUTEX_INVALID'
END
FROM lock_attempt
CROSS JOIN release_attempt
CROSS JOIN pg_catalog.pg_control_system() AS system
`;
  const result = spawnSync(context.psql, [
    ...psqlBaseArguments({ quiet: true, tuplesOnly: true, noAlign: true }),
    "--command",
    sql,
  ], {
    encoding: "utf8",
    env: networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
    maxBuffer: 64 * 1024,
    timeout: 10_000,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
  if (
    result.error
    || result.status !== 0
    || result.stdout.trim() !== "F0_NETWORK_MUTEX_VALID"
  ) {
    throw new Error("F0 network proof mutex is missing, stale, or bound to another PostgreSQL cluster.");
  }
}
