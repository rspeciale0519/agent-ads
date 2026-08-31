import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireNetworkProofMutex } from "./network-proof-mutex.mjs";
import {
  NETWORK_PROOF_MUTEX_KEYS,
  networkDatabaseEnvironment,
  networkProofMutexApplicationName,
  networkProofRunningMarker,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
const mutex = await acquireNetworkProofMutex(context);
const mutexContext = resolveNetworkProofContext(mutex.childEnvironment);
const metadata = mutexContext.mutex;
const applicationName = networkProofMutexApplicationName(metadata.token);
const runningMarker = networkProofRunningMarker(context.marker, metadata.token);
const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;

function runProbe(sql) {
  return spawnSync(context.psql, [
    ...psqlBaseArguments({ quiet: true, tuplesOnly: true, noAlign: true }),
    "--command",
    sql,
  ], {
    encoding: "utf8",
    env: {
      ...networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
      PGAPPNAME: "agent_ads_f0_holder_death_probe",
    },
    maxBuffer: 64 * 1024,
    timeout: 5_000,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
}

function requireProbe(sql, expected, message) {
  const result = runProbe(sql);
  if (result.error || result.status !== 0 || result.stdout.trim() !== expected) {
    throw new Error(message);
  }
}

function holderHealthFailureWithin(timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("F0 holder-death proof timed out.")),
      timeoutMs,
    );
    mutex.healthMonitorFailure.then((error) => {
      clearTimeout(timer);
      resolve(error);
    });
  });
}

const terminateSql = `
WITH exact_holder AS MATERIALIZED (
  SELECT holder.pid
  FROM pg_catalog.pg_stat_activity AS holder
  JOIN pg_catalog.pg_locks AS held_mutex
    ON held_mutex.pid = holder.pid
   AND held_mutex.database = holder.datid
  WHERE holder.pid = ${metadata.backendPid}
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
SELECT CASE
  WHEN system.system_identifier::text <> '${metadata.systemIdentifier}'
    THEN 'F0_HOLDER_DEATH_WRONG_CLUSTER'
  WHEN NOT EXISTS (SELECT 1 FROM exact_holder)
    THEN 'F0_HOLDER_DEATH_HOLDER_MISSING'
  WHEN pg_catalog.pg_terminate_backend((SELECT pid FROM exact_holder), 4_000)
    THEN 'F0_HOLDER_DEATH_TERMINATED'
  ELSE 'F0_HOLDER_DEATH_TERMINATION_FAILED'
END
FROM pg_catalog.pg_control_system() AS system;
`;

const finalStateSql = `
SELECT CASE
  WHEN system.system_identifier::text = '${metadata.systemIdentifier}'
   AND pg_catalog.shobj_description(database_entry.oid, 'pg_database') = '${runningMarker}'
   AND NOT EXISTS (
     SELECT 1
     FROM pg_catalog.pg_locks AS held_mutex
     WHERE held_mutex.database = database_entry.oid
       AND held_mutex.locktype = 'advisory'
       AND held_mutex.classid = (${keyOne})::pg_catalog.oid
       AND held_mutex.objid = (${keyTwo})::pg_catalog.oid
       AND held_mutex.objsubid = 2
       AND held_mutex.mode = 'ExclusiveLock'
       AND held_mutex.granted
   )
  THEN 'F0_HOLDER_DEATH_CONTAINED'
  ELSE 'F0_HOLDER_DEATH_CONTAINMENT_FAILED'
END
FROM pg_catalog.pg_database AS database_entry
CROSS JOIN pg_catalog.pg_control_system() AS system
WHERE database_entry.datname = pg_catalog.current_database();
`;

let targetArmed = false;
let cleanupComplete = false;
try {
  await mutex.armTarget();
  targetArmed = true;
  const psql = context.psql;
  let holderError;
  try {
    context.psql = `f0_missing_psql_${metadata.token}`;
    holderError = await holderHealthFailureWithin(5_000);
  } finally {
    context.psql = psql;
  }
  if (
    !(holderError instanceof Error)
    || holderError.message !== "F0 network proof mutex holder lost its database lock."
  ) {
    throw new Error("F0 holder-death proof did not observe the health-monitor failure.");
  }
  requireProbe(
    terminateSql,
    "F0_HOLDER_DEATH_TERMINATED",
    "F0 holder-death proof could not terminate the exact mutex holder.",
  );
  await mutex.quarantineAndRelease();
  cleanupComplete = true;
  requireProbe(
    finalStateSql,
    "F0_HOLDER_DEATH_CONTAINED",
    "F0 holder-death proof did not leave an orphaned running marker without the mutex.",
  );
  const reuseResult = spawnSync(
    process.execPath,
    [path.join(root, "scripts", "f0", "network-stage-proof.mjs"), "mark"],
    {
      cwd: root,
      encoding: "utf8",
      env: context.spawnEnvironment,
      maxBuffer: 1024 * 1024,
      timeout: 15_000,
      killSignal: "SIGKILL",
      windowsHide: true,
    },
  );
  if (reuseResult.error || reuseResult.status === 0) {
    throw new Error("F0 holder-death proof did not reject a fresh wrapped reuse attempt.");
  }
  requireProbe(
    finalStateSql,
    "F0_HOLDER_DEATH_CONTAINED",
    "F0 holder-death proof reuse attempt changed the contained target.",
  );
} catch (proofError) {
  if (cleanupComplete) throw proofError;
  try {
    if (targetArmed) await mutex.quarantineAndRelease();
    else await mutex.release();
  } catch (cleanupError) {
    throw new AggregateError(
      [proofError, cleanupError],
      "F0 holder-death proof and cleanup both failed.",
    );
  }
  throw proofError;
}

console.log("F0 holder-death proof passed: health monitoring contained holder loss and blocked wrapped target reuse.");
