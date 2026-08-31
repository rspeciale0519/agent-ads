import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { waitForProcessExit } from "./network-process-tree.mjs";
import {
  assertNetworkProofMutex,
  networkDatabaseEnvironment,
  NETWORK_PROOF_MUTEX_KEYS,
  networkProofMutexApplicationName,
  networkProofMutexChildEnvironment,
  networkProofRunningMarker,
  psqlBaseArguments,
} from "./network-safety.mjs";

const ACQUIRED_PREFIX = "F0_NETWORK_MUTEX_ACQUIRED";
const BUSY_MESSAGE = "F0_NETWORK_MUTEX_BUSY";
const MISSING_MESSAGE = "F0_NETWORK_MUTEX_MISSING";
const PENDING_MESSAGE = "F0_NETWORK_MUTEX_PENDING";
const GONE_MESSAGE = "F0_NETWORK_MUTEX_GONE";
const TERMINATED_MESSAGE = "F0_NETWORK_MUTEX_TERMINATED";
const TARGET_MARKER_HELD_MESSAGE = "F0_NETWORK_TARGET_MARKER_HELD";
const TARGET_QUARANTINED_MESSAGE = "F0_NETWORK_TARGET_QUARANTINED";
const HANDSHAKE_TIMEOUT_MS = 10_000;
const HOLDER_HEALTH_INTERVAL_MS = 250;
const HOLDER_EXIT_TIMEOUT_MS = 5_000;
const PROBE_TIMEOUT_MS = 5_000;

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

function holderMarkerTransitionSql(expectedMarker, nextMarker, mutex, applicationName) {
  const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;
  return `
DO $f0_marker_transition$
DECLARE
  current_marker text;
BEGIN
  IF pg_catalog.current_database() <> 'agent_ads_f0'
     OR pg_catalog.pg_backend_pid() <> ${mutex.backendPid}
     OR pg_catalog.current_setting('application_name') IS DISTINCT FROM '${applicationName}'
     OR (
       SELECT system.system_identifier::text
       FROM pg_catalog.pg_control_system() AS system
     ) IS DISTINCT FROM '${mutex.systemIdentifier}'
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_locks AS held_mutex
       WHERE held_mutex.pid = pg_catalog.pg_backend_pid()
         AND held_mutex.database = (
           SELECT database_entry.oid
           FROM pg_catalog.pg_database AS database_entry
           WHERE database_entry.datname = pg_catalog.current_database()
         )
         AND held_mutex.locktype = 'advisory'
         AND held_mutex.classid = (${keyOne})::pg_catalog.oid
         AND held_mutex.objid = (${keyTwo})::pg_catalog.oid
         AND held_mutex.objsubid = 2
         AND held_mutex.mode = 'ExclusiveLock'
         AND held_mutex.granted
     ) THEN
    RAISE EXCEPTION 'F0_NETWORK_TARGET_MARKER_TRANSITION_REFUSED';
  END IF;

  SELECT pg_catalog.shobj_description(database_entry.oid, 'pg_database')
    INTO current_marker
    FROM pg_catalog.pg_database AS database_entry
   WHERE database_entry.datname = pg_catalog.current_database();

  IF current_marker IS DISTINCT FROM '${expectedMarker}' THEN
    RAISE EXCEPTION 'F0_NETWORK_TARGET_MARKER_SOURCE_REFUSED';
  END IF;

  EXECUTE pg_catalog.format(
    'COMMENT ON DATABASE %I IS %L',
    pg_catalog.current_database(),
    '${nextMarker}'
  );
END
$f0_marker_transition$;
`;
}

function targetMarkerHeldSql(expectedMarker, mutex, applicationName) {
  const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;
  return `
WITH exact_holder AS MATERIALIZED (
  SELECT 1
  FROM pg_catalog.pg_stat_activity AS holder
  JOIN pg_catalog.pg_locks AS held_mutex
    ON held_mutex.pid = holder.pid
   AND held_mutex.database = holder.datid
  WHERE holder.pid = ${mutex.backendPid}
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
  WHEN system.system_identifier::text = '${mutex.systemIdentifier}'
   AND pg_catalog.shobj_description(database_entry.oid, 'pg_database') = '${expectedMarker}'
   AND EXISTS (SELECT 1 FROM exact_holder)
  THEN '${TARGET_MARKER_HELD_MESSAGE}'
  ELSE 'F0_NETWORK_TARGET_MARKER_NOT_HELD'
END
FROM pg_catalog.pg_database AS database_entry
CROSS JOIN pg_catalog.pg_control_system() AS system
WHERE database_entry.datname = pg_catalog.current_database();
`;
}

function quarantinedTargetSql(runningMarker, failedMarker, completeMarker, mutex, applicationName) {
  const [keyOne, keyTwo] = NETWORK_PROOF_MUTEX_KEYS;
  return `
WITH exact_holder AS MATERIALIZED (
  SELECT 1
  FROM pg_catalog.pg_stat_activity AS holder
  JOIN pg_catalog.pg_locks AS held_mutex
    ON held_mutex.pid = holder.pid
   AND held_mutex.database = holder.datid
  WHERE holder.pid = ${mutex.backendPid}
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
  WHEN system.system_identifier::text = '${mutex.systemIdentifier}'
   AND pg_catalog.shobj_description(database_entry.oid, 'pg_database')
     IN ('${runningMarker}', '${failedMarker}', '${completeMarker}')
   AND NOT EXISTS (SELECT 1 FROM exact_holder)
  THEN '${TARGET_QUARANTINED_MESSAGE}'
  ELSE 'F0_NETWORK_TARGET_QUARANTINE_FAILED'
END
FROM pg_catalog.pg_database AS database_entry
CROSS JOIN pg_catalog.pg_control_system() AS system
WHERE database_entry.datname = pg_catalog.current_database();
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

function writeHolderSql(child, sql) {
  return new Promise((resolve, reject) => {
    if (!child.stdin || child.stdin.destroyed || child.stdin.writableEnded) {
      reject(new Error("F0 network proof mutex holder input is unavailable."));
      return;
    }
    child.stdin.write(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function waitForTargetMarker(context, mutex, applicationName, expectedMarker) {
  const sql = targetMarkerHeldSql(expectedMarker, mutex, applicationName);
  const deadline = Date.now() + PROBE_TIMEOUT_MS;
  do {
    const result = runProbe(context, sql);
    if (
      !result.error
      && result.status === 0
      && result.stdout.trim() === TARGET_MARKER_HELD_MESSAGE
    ) return;
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error("F0 network proof target marker transition was not confirmed.");
}

function verifyQuarantinedTarget(
  context,
  runningMarker,
  failedMarker,
  completeMarker,
  mutex,
  applicationName,
) {
  const result = runProbe(
    context,
    quarantinedTargetSql(runningMarker, failedMarker, completeMarker, mutex, applicationName),
  );
  const output = result.error || result.status !== 0 ? "" : result.stdout.trim();
  if (output !== TARGET_QUARANTINED_MESSAGE) {
    throw new Error("F0 network proof target quarantine failed.");
  }
}

function throwCleanupErrors(errors, message) {
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, message);
}

export async function acquireNetworkProofMutex(context) {
  const token = randomUUID();
  const applicationName = networkProofMutexApplicationName(token);
  const completeMarker = `agent_ads_f0_complete:${context.marker}:${token}`;
  const disposableMarker = `agent_ads_f0_disposable:${context.marker}`;
  const failedMarker = `agent_ads_f0_failed:${context.marker}`;
  const runningMarker = networkProofRunningMarker(context.marker, token);
  const child = spawn(context.psql, [
    ...psqlBaseArguments({ quiet: true }),
  ], {
    detached: false,
    env: {
      ...networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
      PGAPPNAME: applicationName,
    },
    stdio: ["pipe", "ignore", "ignore"],
    windowsHide: true,
  });

  let releasing = false;
  let healthTimer = null;
  let holderHealthError = null;
  let startError = null;
  let settleFailure;
  let settleHealthMonitorFailure;
  const failure = new Promise((resolve) => {
    settleFailure = resolve;
  });
  const healthMonitorFailure = new Promise((resolve) => {
    settleHealthMonitorFailure = resolve;
  });
  child.on("error", (error) => {
    startError ??= error;
    if (!releasing) settleFailure(new Error("F0 network proof mutex holder failed."));
  });
  child.once("exit", () => {
    if (!releasing) settleFailure(new Error("F0 network proof mutex holder exited during the proof."));
  });
  child.stdin?.on("error", (error) => {
    startError ??= error;
    if (!releasing) settleFailure(new Error("F0 network proof mutex holder input failed."));
  });
  if (!child.stdin) {
    startError = new Error("F0 network proof mutex holder input is unavailable.");
  } else {
    child.stdin.write(holderSql(), (error) => {
      if (!error) return;
      startError ??= error;
      if (!releasing) settleFailure(new Error("F0 network proof mutex holder input failed."));
    });
  }

  async function terminateHolder() {
    releasing = true;
    if (healthTimer !== null) {
      clearTimeout(healthTimer);
      healthTimer = null;
    }
    const cleanupErrors = [];
    try {
      if (child.stdin && !child.stdin.destroyed && !child.stdin.writableEnded) {
        child.stdin.end();
      }
    } catch (error) {
      cleanupErrors.push(error);
    }
    let holderExited = child.exitCode !== null || child.signalCode !== null;
    if (!holderExited && child.pid !== undefined) {
      holderExited = await waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS);
    }
    if (!holderExited) {
      try {
        terminateHolderBackend(context, applicationName);
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (child.pid !== undefined) {
        holderExited = await waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS);
      }
    }
    if (!holderExited) {
      try {
        child.kill("SIGKILL");
      } catch (error) {
        cleanupErrors.push(error);
      }
      if (child.pid !== undefined) {
        holderExited = await waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS);
      }
    }
    if (!holderExited) cleanupErrors.push(new Error("F0 network proof mutex holder did not stop."));
    throwCleanupErrors(cleanupErrors, "F0 network proof mutex holder cleanup failed.");
  }

  async function finishHolderRelease() {
    const cleanupErrors = [];
    try {
      await terminateHolder();
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await waitForHolderGone(context, mutex);
    } catch (error) {
      cleanupErrors.push(error);
    }
    throwCleanupErrors(cleanupErrors, "F0 network proof mutex release failed.");
  }

  async function releaseMutex() {
    await finishHolderRelease();
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

  function scheduleHolderHealthCheck() {
    healthTimer = setTimeout(() => {
      healthTimer = null;
      if (releasing || holderHealthError) return;
      const result = runProbe(context, holderStateSql(applicationName));
      const state = result.error || result.status !== 0 ? "" : result.stdout.trim();
      const acquired = state.match(new RegExp(`^${ACQUIRED_PREFIX}\\t([0-9]+)\\t([0-9]+)$`, "u"));
      if (
        !acquired
        || Number(acquired[1]) !== mutex.backendPid
        || acquired[2] !== mutex.systemIdentifier
      ) {
        holderHealthError = new Error("F0 network proof mutex holder lost its database lock.");
        settleHealthMonitorFailure(holderHealthError);
        settleFailure(holderHealthError);
        return;
      }
      scheduleHolderHealthCheck();
    }, HOLDER_HEALTH_INTERVAL_MS);
  }
  scheduleHolderHealthCheck();

  async function transitionTargetMarker(expectedMarker, nextMarker) {
    await writeHolderSql(
      child,
      holderMarkerTransitionSql(expectedMarker, nextMarker, mutex, applicationName),
    );
    await waitForTargetMarker(context, mutex, applicationName, nextMarker);
  }

  return {
    async armTarget() {
      await transitionTargetMarker(disposableMarker, runningMarker);
    },
    childEnvironment: networkProofMutexChildEnvironment(context, mutex),
    async completeTarget() {
      await transitionTargetMarker(runningMarker, completeMarker);
    },
    failure,
    healthMonitorFailure,
    assertAlive() {
      if (holderHealthError) throw holderHealthError;
      if (child.exitCode !== null || child.signalCode !== null || child.killed) {
        throw new Error("F0 network proof mutex holder is not active.");
      }
    },
    release: releaseMutex,
    async quarantineAndRelease() {
      const cleanupErrors = [];
      let transitionError = null;
      try {
        await writeHolderSql(
          child,
          holderMarkerTransitionSql(runningMarker, failedMarker, mutex, applicationName),
        );
      } catch (error) {
        transitionError = error;
      }
      try {
        await releaseMutex();
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        verifyQuarantinedTarget(
          context,
          runningMarker,
          failedMarker,
          completeMarker,
          mutex,
          applicationName,
        );
      } catch (error) {
        if (transitionError) cleanupErrors.push(transitionError);
        cleanupErrors.push(error);
      }
      throwCleanupErrors(cleanupErrors, "F0 network proof quarantine and mutex release failed.");
    },
  };
}
