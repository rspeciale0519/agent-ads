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
  Object.freeze({ label: "F0 mark guard proof", script: "disposable-mark-guard-proof.mjs" }),
  Object.freeze({ label: "F0 network target marking", script: "network-mark-disposable.mjs" }),
  Object.freeze({ label: "F0 disposable guard proof", script: "disposable-guard-proof.mjs" }),
]);

export const fullNetworkProofStages = Object.freeze([
  ...guardNetworkProofStages,
  Object.freeze({ label: "F0 fresh migration proof", script: "fresh-migration-proof.mjs" }),
]);

export async function executeNetworkProofStages(stages, dependencies) {
  const mutex = await dependencies.acquireMutex();
  let proofError;
  try {
    for (const stage of stages) {
      mutex.assertAlive();
      await dependencies.runStage(stage, mutex);
      mutex.assertAlive();
    }
    dependencies.assertContinue?.();
    dependencies.prepareRelease?.();
  } catch (error) {
    proofError = error;
  }

  if (proofError) {
    let retainError;
    try {
      await mutex.retainAfterFailure();
    } catch (error) {
      retainError = error;
    }
    if (retainError) {
      throw new AggregateError(
        [proofError, retainError],
        "F0 network proof failed and could not retain its cooperative mutex.",
      );
    }
    throw proofError;
  }

  let releaseError;
  try {
    await mutex.release();
  } catch (error) {
    releaseError = error;
  }

  if (releaseError) throw releaseError;
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
      throw new AggregateError(
        [stageError, terminationError],
        `${stage.label} failed and process-tree termination was not confirmed.`,
      );
    }
    throw stageError;
  }
  state.activeChild = null;
  state.activeTermination = null;
  if (output.stdout) process.stdout.write(output.stdout);
  if (output.stderr) process.stderr.write(output.stderr);
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
  const signalHandlers = ["SIGINT", "SIGTERM"].map((signal) => {
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

export function recordNetworkProofInterruption(state, signal) {
  if (state.releaseStarted || state.interruption) return;
  state.interruption = new Error(`F0 network proof was interrupted by ${signal}.`);
  state.resolveInterruption(state.interruption);
}
