import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_GRACE_TIMEOUT_MS = 2_000;
const DEFAULT_FORCE_TIMEOUT_MS = 5_000;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isMissingProcessError(error) {
  return error && typeof error === "object" && error.code === "ESRCH";
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (isMissingProcessError(error)) return false;
    if (error && typeof error === "object" && error.code === "EPERM") return true;
    throw error;
  }
}

function signalProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (!isMissingProcessError(error)) throw error;
  }
}

async function waitForCondition(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await delay(25);
  }
  return predicate();
}

export function waitForProcessExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      child.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    child.once("exit", onExit);
  });
}

export function processTreeTerminationStrategy(platform = process.platform) {
  return platform === "win32" ? "taskkill" : "process-group";
}

export function requiresDetachedProcessGroup(platform = process.platform) {
  return processTreeTerminationStrategy(platform) === "process-group";
}

export function windowsTaskkillInvocation(pid, environment = process.env) {
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error("Unsafe F0 process identifier.");
  const systemRoot = environment.SystemRoot;
  if (!systemRoot || !path.win32.isAbsolute(systemRoot)) {
    throw new Error("Windows SystemRoot is missing or invalid.");
  }
  const command = path.win32.join(path.win32.normalize(systemRoot), "System32", "taskkill.exe");
  return Object.freeze({
    args: Object.freeze(["/PID", String(pid), "/T", "/F"]),
    command,
  });
}

async function runWindowsTaskkill(pid, timeoutMs) {
  const invocation = windowsTaskkillInvocation(pid);
  const killer = spawn(invocation.command, invocation.args, {
    shell: false,
    stdio: "ignore",
    windowsHide: true,
  });
  let startError = null;
  killer.on("error", (error) => {
    startError = error;
  });
  const exited = await waitForProcessExit(killer, timeoutMs);
  if (!exited) {
    killer.kill("SIGKILL");
    await waitForProcessExit(killer, 1_000);
    throw new Error("Windows process-tree termination timed out.");
  }
  if (startError) throw new Error("Windows process-tree termination could not start.");
  return killer.exitCode;
}

export async function terminateProcessTree(child, options = {}) {
  const pid = child.pid;
  if (!Number.isSafeInteger(pid) || pid < 1) {
    throw new Error("F0 stage process identifier is missing or invalid.");
  }
  const graceTimeoutMs = options.graceTimeoutMs ?? DEFAULT_GRACE_TIMEOUT_MS;
  const forceTimeoutMs = options.forceTimeoutMs ?? DEFAULT_FORCE_TIMEOUT_MS;

  if (processTreeTerminationStrategy() === "taskkill") {
    const taskkillStatus = await runWindowsTaskkill(pid, forceTimeoutMs);
    const exited = await waitForProcessExit(child, forceTimeoutMs);
    if (!exited || (taskkillStatus !== 0 && child.exitCode === null && child.signalCode === null)) {
      throw new Error("F0 stage process tree did not stop.");
    }
    return;
  }

  if (processGroupExists(pid)) signalProcessGroup(pid, "SIGTERM");
  let groupStopped = await waitForCondition(() => !processGroupExists(pid), graceTimeoutMs);
  if (!groupStopped) {
    signalProcessGroup(pid, "SIGKILL");
    groupStopped = await waitForCondition(() => !processGroupExists(pid), forceTimeoutMs);
  }
  const rootExited = await waitForProcessExit(child, forceTimeoutMs);
  if (!groupStopped || !rootExited) throw new Error("F0 stage process tree did not stop.");
}
