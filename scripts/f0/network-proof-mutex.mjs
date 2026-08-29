import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { waitForProcessExit } from "./network-process-tree.mjs";
import {
  assertNetworkProofMutex,
  networkDatabaseEnvironment,
  NETWORK_PROOF_MUTEX_KEYS,
  networkProofMutexApplicationName,
  networkProofMutexChildEnvironment,
  psqlBaseArguments,
} from "./network-safety.mjs";

const ACQUIRED_PREFIX = "F0_NETWORK_MUTEX_ACQUIRED";
const BUSY_MESSAGE = "F0_NETWORK_MUTEX_BUSY";
const MISSING_MESSAGE = "F0_NETWORK_MUTEX_MISSING";
const PENDING_MESSAGE = "F0_NETWORK_MUTEX_PENDING";
const GONE_MESSAGE = "F0_NETWORK_MUTEX_GONE";
const TERMINATED_MESSAGE = "F0_NETWORK_MUTEX_TERMINATED";
const HANDSHAKE_TIMEOUT_MS = 10_000;
const HOLDER_EXIT_TIMEOUT_MS = 5_000;
const PROBE_TIMEOUT_MS = 5_000;
const HOLDER_SLEEP_SECONDS = 2_147_483;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function mutexKeySql() {
  return NETWORK_PROOF_MUTEX_KEYS.join(", ");
}

function holderSql() {
  return `
SET statement_timeout = 0;
DO $f0_mutex$
BEGIN
  IF NOT pg_catalog.pg_try_advisory_lock(${mutexKeySql()}) THEN
    RAISE EXCEPTION '${BUSY_MESSAGE}' USING ERRCODE = '55P03';
  END IF;
  PERFORM pg_catalog.pg_sleep(${HOLDER_SLEEP_SECONDS});
END
$f0_mutex$;
`;
}

function holderStateSql(applicationName) {
  const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;
  return `
WITH current_database_entry AS MATERIALIZED (
  SELECT oid
  FROM pg_catalog.pg_database
  WHERE datname = pg_catalog.current_database()
),
expected_holder AS MATERIALIZED (
  SELECT holder.pid
  FROM pg_catalog.pg_stat_activity AS holder
  JOIN pg_catalog.pg_locks AS held_mutex
    ON held_mutex.pid = holder.pid
   AND held_mutex.database = holder.datid
  CROSS JOIN current_database_entry
  WHERE holder.datid = current_database_entry.oid
    AND holder.application_name = '${applicationName}'
    AND held_mutex.locktype = 'advisory'
    AND held_mutex.classid = (${keyOne})::pg_catalog.oid
    AND held_mutex.objid = (${keyTwo})::pg_catalog.oid
    AND held_mutex.objsubid = 2
    AND held_mutex.mode = 'ExclusiveLock'
    AND held_mutex.granted
),
any_holder AS MATERIALIZED (
  SELECT 1
  FROM pg_catalog.pg_locks AS held_mutex
  CROSS JOIN current_database_entry
  WHERE held_mutex.database = current_database_entry.oid
    AND held_mutex.locktype = 'advisory'
    AND held_mutex.classid = (${keyOne})::pg_catalog.oid
    AND held_mutex.objid = (${keyTwo})::pg_catalog.oid
    AND held_mutex.objsubid = 2
    AND held_mutex.mode = 'ExclusiveLock'
    AND held_mutex.granted
)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM expected_holder)
  THEN '${ACQUIRED_PREFIX}' || E'\\t'
    || (SELECT pid::text FROM expected_holder LIMIT 1) || E'\\t'
    || system.system_identifier::text
  WHEN EXISTS (SELECT 1 FROM any_holder) THEN '${BUSY_MESSAGE}'
  WHEN EXISTS (
    SELECT 1
    FROM pg_catalog.pg_stat_activity AS pending_holder
    CROSS JOIN current_database_entry
    WHERE pending_holder.datid = current_database_entry.oid
      AND pending_holder.application_name = '${applicationName}'
  ) THEN '${PENDING_MESSAGE}'
  ELSE '${MISSING_MESSAGE}'
END
FROM pg_catalog.pg_control_system() AS system;
`;
}

function holderGoneSql(backendPid, applicationName) {
  return `
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM pg_catalog.pg_stat_activity
    WHERE pid = ${backendPid}
      AND datid = (
        SELECT oid
        FROM pg_catalog.pg_database
        WHERE datname = pg_catalog.current_database()
      )
      AND application_name = '${applicationName}'
  ) THEN '${PENDING_MESSAGE}'
  ELSE '${GONE_MESSAGE}'
END;
`;
}

function terminateHolderSql(applicationName) {
  const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;
  return `
WITH exact_holder AS MATERIALIZED (
  SELECT holder.pid
  FROM pg_catalog.pg_stat_activity AS holder
  JOIN pg_catalog.pg_locks AS held_mutex
    ON held_mutex.pid = holder.pid
   AND held_mutex.database = holder.datid
  WHERE holder.datid = (
      SELECT oid
      FROM pg_catalog.pg_database
      WHERE datname = pg_catalog.current_database()
    )
    AND holder.application_name = '${applicationName}'
    AND held_mutex.locktype = 'advisory'
    AND held_mutex.classid = (${keyOne})::pg_catalog.oid
    AND held_mutex.objid = (${keyTwo})::pg_catalog.oid
    AND held_mutex.objsubid = 2
    AND held_mutex.mode = 'ExclusiveLock'
    AND held_mutex.granted
  LIMIT 1
)
SELECT CASE
  WHEN NOT EXISTS (SELECT 1 FROM exact_holder) THEN '${GONE_MESSAGE}'
  WHEN (SELECT pg_catalog.pg_terminate_backend(pid, 4_000) FROM exact_holder)
    THEN '${TERMINATED_MESSAGE}'
  ELSE 'F0_NETWORK_MUTEX_TERMINATION_FAILED'
END;
`;
}

function runProbe(context, sql) {
  return spawnSync(context.psql, [
    ...psqlBaseArguments({ quiet: true, tuplesOnly: true, noAlign: true }),
    "--command",
    sql,
  ], {
    encoding: "utf8",
    env: {
      ...networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
      PGAPPNAME: "agent_ads_f0_mutex_probe",
    },
    maxBuffer: 64 * 1024,
    timeout: PROBE_TIMEOUT_MS,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
}

async function waitForHolderGone(context, mutex) {
  const applicationName = networkProofMutexApplicationName(mutex.token);
  const sql = holderGoneSql(mutex.backendPid, applicationName);
  const deadline = Date.now() + PROBE_TIMEOUT_MS;
  do {
    const result = runProbe(context, sql);
    if (!result.error && result.status === 0 && result.stdout.trim() === GONE_MESSAGE) return;
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error("F0 network proof mutex holder remained active after termination.");
}

function terminateHolderBackend(context, applicationName) {
  const result = runProbe(context, terminateHolderSql(applicationName));
  const output = result.error || result.status !== 0 ? "" : result.stdout.trim();
  if (output !== TERMINATED_MESSAGE && output !== GONE_MESSAGE) {
    throw new Error("F0 network proof mutex backend termination failed.");
  }
}

export async function acquireNetworkProofMutex(context) {
  const token = randomUUID();
  const applicationName = networkProofMutexApplicationName(token);
  const child = spawn(context.psql, [
    ...psqlBaseArguments({ quiet: true }),
    "--command",
    holderSql(),
  ], {
    detached: true,
    env: {
      ...networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
      PGAPPNAME: applicationName,
    },
    stdio: "ignore",
    windowsHide: true,
  });

  let releasing = false;
  let startError = null;
  let settleFailure;
  const failure = new Promise((resolve) => {
    settleFailure = resolve;
  });
  child.on("error", (error) => {
    startError ??= error;
    if (!releasing) settleFailure(new Error("F0 network proof mutex holder failed."));
  });
  child.once("exit", () => {
    if (!releasing) settleFailure(new Error("F0 network proof mutex holder exited during the proof."));
  });

  async function terminateHolder() {
    releasing = true;
    try {
      terminateHolderBackend(context, applicationName);
    } catch (error) {
      child.unref();
      throw error;
    }
    if (child.pid !== undefined && !(await waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS))) {
      try {
        child.kill("SIGKILL");
      } catch (error) {
        child.unref();
        throw error;
      }
      if (!(await waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS))) {
        child.unref();
        throw new Error("F0 network proof mutex holder did not stop.");
      }
    }
  }

  let mutex = null;
  let acquisitionError = null;
  const deadline = Date.now() + HANDSHAKE_TIMEOUT_MS;
  while (!mutex && !acquisitionError && Date.now() < deadline) {
    if (startError) {
      acquisitionError = new Error("F0 network proof mutex holder could not start.");
      break;
    }
    const result = runProbe(context, holderStateSql(applicationName));
    const state = result.error || result.status !== 0 ? "" : result.stdout.trim();
    const acquired = state.match(new RegExp(`^${ACQUIRED_PREFIX}\\t([0-9]+)\\t([0-9]+)$`, "u"));
    if (acquired) {
      mutex = {
        backendPid: Number(acquired[1]),
        systemIdentifier: acquired[2],
        token,
      };
      break;
    }
    if (state === BUSY_MESSAGE) {
      acquisitionError = new Error(
        "Another tracked F0 network proof already holds the cooperative session mutex.",
      );
      break;
    }
    if (child.exitCode !== null || child.signalCode !== null) {
      acquisitionError = new Error("F0 network proof mutex holder exited before acquisition.");
      break;
    }
    await delay(50);
  }
  acquisitionError ??= mutex ? null : new Error("F0 network proof mutex handshake timed out.");

  if (acquisitionError) {
    try {
      await terminateHolder();
    } catch (cleanupError) {
      throw new AggregateError(
        [acquisitionError, cleanupError],
        "F0 network proof mutex acquisition and cleanup both failed.",
      );
    }
    throw acquisitionError;
  }

  const mutexContext = { ...context, mutex };
  try {
    assertNetworkProofMutex(mutexContext);
  } catch (error) {
    try {
      await terminateHolder();
      await waitForHolderGone(context, mutex);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "F0 network proof mutex validation and cleanup both failed.",
      );
    }
    throw error;
  }

  return {
    childEnvironment: networkProofMutexChildEnvironment(context, mutex),
    failure,
    assertAlive() {
      if (child.exitCode !== null || child.signalCode !== null || child.killed) {
        throw new Error("F0 network proof mutex holder is not active.");
      }
    },
    retainAfterFailure() {
      releasing = true;
      child.unref();
    },
    async release() {
      await terminateHolder();
      await waitForHolderGone(context, mutex);
    },
  };
}
