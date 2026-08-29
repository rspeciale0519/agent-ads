import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acquireNetworkProofMutex } from "./network-proof-mutex.mjs";
import { requiresDetachedProcessGroup, terminateProcessTree } from "./network-process-tree.mjs";
import { resolveNetworkProofContext } from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGE_CLOSE_TIMEOUT_MS = 5_000;
const STAGE_OUTPUT_LIMIT_BYTES = 1024 * 1024;

export const guardNetworkProofStages = Object.freeze([
  Object.freeze({ label: "F0 network target marking", script: "network-mark-disposable.mjs" }),
  Object.freeze({
    label: "F0 mark guard proof",
    requiresRunningMarker: true,
    script: "disposable-mark-guard-proof.mjs",
  }),
  Object.freeze({
    label: "F0 disposable guard proof",
    requiresRunningMarker: true,
    script: "disposable-guard-proof.mjs",
  }),
]);

export const fullNetworkProofStages = Object.freeze([
  ...guardNetworkProofStages,
  Object.freeze({
    label: "F0 fresh migration proof",
    requiresRunningMarker: true,
    script: "fresh-migration-proof.mjs",
  }),
]);

function errorCauses(error) {
  return error instanceof AggregateError
    ? error.errors.flatMap((cause) => errorCauses(cause))
    : [error];
}

export function formatNetworkProofFailure(error, environment, fallback) {
  const messages = errorCauses(error)
    .filter((cause) => cause instanceof Error && cause.message.length > 0)
    .map((cause) => cause.message);
  const output = [...new Set(messages)].join("\n") || fallback;
  return redactNetworkProofOutput(output, environment);
}

export async function executeNetworkProofStages(stages, dependencies) {
  const mutex = await dependencies.acquireMutex();
  let targetArmed = false;
  let proofError;
  try {
    for (const stage of stages) {
      mutex.assertAlive();
      if (stage.requiresRunningMarker === true && !targetArmed) {
        await mutex.armTarget();
        targetArmed = true;
        mutex.assertAlive();
      }
      await dependencies.runStage(stage, mutex);
      mutex.assertAlive();
    }
    dependencies.assertContinue?.();
    if (targetArmed) {
      await mutex.completeTarget();
      targetArmed = false;
      mutex.assertAlive();
    }
    dependencies.prepareRelease?.();
  } catch (error) {
    proofError = error;
  }

  let cleanupError;
  try {
    if (proofError && targetArmed) {
      await mutex.quarantineAndRelease();
    } else {
      await mutex.release();
    }
  } catch (error) {
    cleanupError = error;
  }

  if (proofError && cleanupError) {
    throw new AggregateError(
      [proofError, ...errorCauses(cleanupError)],
      "F0 network proof failed and target containment was incomplete.",
    );
  }
  if (proofError) throw proofError;
  if (cleanupError) throw cleanupError;
}

function childResult(child) {
  return new Promise((resolve) => {
    let settled = false;
    child.once("error", (error) => {
      if (settled || child.pid !== undefined) return;
      settled = true;
      resolve({ error, status: null, signal: null });
    });
    child.once("exit", (status, signal) => {
      if (settled) return;
      settled = true;
      resolve({ error: null, status, signal });
    });
  });
}

function childClose(child) {
  return new Promise((resolve) => {
    child.once("close", (status, signal) => resolve({ signal, status }));
  });
}

function waitWithTimeout(promise, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
}

function appendStageOutput(state, chunk, streamName) {
  const text = chunk.toString("utf8");
  state.outputBytes += Buffer.byteLength(text);
  if (state.outputBytes > STAGE_OUTPUT_LIMIT_BYTES) {
    state.outputExceeded = true;
    return;
  }
  state[streamName] += text;
}

export function redactNetworkProofOutput(value, environment) {
  const databaseUrl = environment.F0_DATABASE_URL;
  if (!databaseUrl) return value;

  let parsed;
  let decodedPassword;
  try {
    parsed = new URL(databaseUrl);
    decodedPassword = decodeURIComponent(parsed.password);
  } catch {
    return "[REDACTED_INVALID_DATABASE_OUTPUT]\n";
  }

  const authorityStart = databaseUrl.indexOf("//") + 2;
  const authorityEnd = databaseUrl.lastIndexOf("@");
  const passwordStart = databaseUrl.indexOf(":", authorityStart) + 1;
  const rawPassword = passwordStart > authorityStart && authorityEnd > passwordStart
    ? databaseUrl.slice(passwordStart, authorityEnd)
    : parsed.password;
  const replacements = new Map([
    [databaseUrl, "[REDACTED_DATABASE_URL]"],
    [parsed.href, "[REDACTED_DATABASE_URL]"],
  ]);
  const passwordVariants = new Set([
    rawPassword,
    parsed.password,
    decodedPassword,
    encodeURIComponent(decodedPassword),
  ]);
  for (const password of passwordVariants) {
    if (password.length === 0) continue;
    replacements.set(password, "[REDACTED_DATABASE_SECRET]");
    replacements.set(
      password.replace(/%[0-9a-f]{2}/giu, (match) => match.toUpperCase()),
      "[REDACTED_DATABASE_SECRET]",
    );
    replacements.set(
      password.replace(/%[0-9a-f]{2}/giu, (match) => match.toLowerCase()),
      "[REDACTED_DATABASE_SECRET]",
    );
  }
  const pattern = new RegExp(
    [...replacements.keys()]
      .sort((left, right) => right.length - left.length)
      .map((secret) => secret.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
      .join("|"),
    "gu",
  );
  return value.replace(pattern, (secret) => replacements.get(secret));
}

function writeStageOutput(output, mutex) {
  if (output.stdout) {
    process.stdout.write(redactNetworkProofOutput(output.stdout, mutex.childEnvironment));
  }
  if (output.stderr) {
    process.stderr.write(redactNetworkProofOutput(output.stderr, mutex.childEnvironment));
  }
}

async function terminateActiveStage(state) {
  if (!state.activeChild) return;
  state.activeTermination ??= terminateProcessTree(state.activeChild);
  await state.activeTermination;
}

export async function runChildStage(stage, mutex, state) {
  if (state.interruption) throw state.interruption;
  const child = spawn(
    process.execPath,
    [path.join(root, "scripts", "f0", stage.script)],
    {
      cwd: root,
      detached: requiresDetachedProcessGroup(),
      env: mutex.childEnvironment,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  state.activeChild = child;
  state.activeTermination = null;
  const output = { outputBytes: 0, outputExceeded: false, stderr: "", stdout: "" };
  child.stdout.on("data", (chunk) => appendStageOutput(output, chunk, "stdout"));
  child.stderr.on("data", (chunk) => appendStageOutput(output, chunk, "stderr"));
  const completion = childResult(child);
  const closed = childClose(child);
  const outcome = await Promise.race([
    completion.then((result) => ({ kind: "child", result })),
    mutex.failure.then((error) => ({ error, kind: "mutex" })),
    state.interruptionFailure.then((error) => ({ error, kind: "interruption" })),
  ]);

  if (outcome.kind !== "child") {
    let terminationError;
    try {
      await terminateActiveStage(state);
      if (!(await waitWithTimeout(closed, STAGE_CLOSE_TIMEOUT_MS))) {
        throw new Error("F0 stage process pipes did not close after termination.");
      }
    } catch (error) {
      terminationError = error;
    } finally {
      state.activeChild = null;
      state.activeTermination = null;
    }
    if (terminationError) {
      writeStageOutput(output, mutex);
      throw new AggregateError(
        [outcome.error, terminationError],
        `${stage.label} cancellation could not confirm process-tree termination.`,
      );
    }
    throw outcome.error;
  }

  let stageError = null;
  if (state.interruption) {
    stageError = state.interruption;
  } else if (outcome.result.error) {
    stageError = new Error(`${stage.label} could not start: ${outcome.result.error.message}`);
  } else if (outcome.result.status !== 0) {
    const suffix = outcome.result.signal ? ` after signal ${outcome.result.signal}` : "";
    stageError = new Error(`${stage.label} failed with exit code ${outcome.result.status}${suffix}.`);
  } else if (!(await waitWithTimeout(closed, STAGE_CLOSE_TIMEOUT_MS))) {
    stageError = new Error(`${stage.label} left an inherited process pipe open.`);
  } else if (output.outputExceeded) {
    stageError = new Error(`${stage.label} exceeded the bounded output limit.`);
  }
  if (stageError) {
    let terminationError;
    try {
      if (child.pid !== undefined) await terminateActiveStage(state);
      if (!(await waitWithTimeout(closed, STAGE_CLOSE_TIMEOUT_MS))) {
        throw new Error("F0 stage process pipes did not close after termination.");
      }
    } catch (error) {
      terminationError = error;
    } finally {
      state.activeChild = null;
      state.activeTermination = null;
    }
    if (terminationError) {
      writeStageOutput(output, mutex);
      throw new AggregateError(
        [stageError, terminationError],
        `${stage.label} failed and process-tree termination was not confirmed.`,
      );
    }
    writeStageOutput(output, mutex);
    throw stageError;
  }
  state.activeChild = null;
  state.activeTermination = null;
  writeStageOutput(output, mutex);
}

export async function runNetworkProof(stages) {
  const context = resolveNetworkProofContext();
  let resolveInterruption;
  const interruptionFailure = new Promise((resolve) => {
    resolveInterruption = resolve;
  });
  const state = {
    activeChild: null,
    activeTermination: null,
    interruption: null,
    interruptionFailure,
    releaseStarted: false,
    resolveInterruption,
  };
  const signalHandlers = networkProofInterruptionSignals().map((signal) => {
    const handler = () => recordNetworkProofInterruption(state, signal);
    process.on(signal, handler);
    return { handler, signal };
  });

  try {
    await executeNetworkProofStages(stages, {
      acquireMutex: () => acquireNetworkProofMutex(context),
      assertContinue: () => {
        if (state.interruption) throw state.interruption;
      },
      prepareRelease: () => {
        if (state.interruption) throw state.interruption;
        state.releaseStarted = true;
      },
      runStage: (stage, mutex) => runChildStage(stage, mutex, state),
    });
  } finally {
    for (const { handler, signal } of signalHandlers) process.off(signal, handler);
  }
}

export function networkProofInterruptionSignals(platform = process.platform) {
  return platform === "win32"
    ? Object.freeze(["SIGINT", "SIGTERM", "SIGBREAK"])
    : Object.freeze(["SIGINT", "SIGTERM", "SIGHUP"]);
}

export function recordNetworkProofInterruption(state, signal) {
  if (state.releaseStarted || state.interruption) return;
  state.interruption = new Error(`F0 network proof was interrupted by ${signal}.`);
  state.resolveInterruption(state.interruption);
}
