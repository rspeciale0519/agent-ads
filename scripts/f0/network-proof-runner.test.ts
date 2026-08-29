import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

type Stage = { label: string; script: string };
type Mutex = {
  childEnvironment: NodeJS.ProcessEnv;
  failure: Promise<Error>;
  assertAlive: () => void;
  retainAfterFailure: () => Promise<void>;
  release: () => Promise<void>;
};
type RunnerModule = {
  executeNetworkProofStages: (
    stages: readonly Stage[],
    dependencies: {
      acquireMutex: () => Promise<Mutex>;
      assertContinue?: () => void;
      prepareRelease?: () => void;
      runStage: (stage: Stage, mutex: Mutex) => Promise<void>;
    },
  ) => Promise<void>;
  fullNetworkProofStages: readonly Stage[];
  guardNetworkProofStages: readonly Stage[];
  recordNetworkProofInterruption: (
    state: {
      interruption: Error | null;
      releaseStarted: boolean;
      resolveInterruption: (error: Error) => void;
    },
    signal: string,
  ) => void;
};

const root = path.join(process.cwd(), "scripts", "f0");
const runnerPath = path.join(root, "network-proof-runner.mjs");
const mutexPath = path.join(root, "network-proof-mutex.mjs");
const processTreePath = path.join(root, "network-process-tree.mjs");
const safetyPath = path.join(root, "network-safety.mjs");
const runnerSource = readFileSync(runnerPath, "utf8");
const mutexSource = readFileSync(mutexPath, "utf8");
const processTreeSource = readFileSync(processTreePath, "utf8");
const safetySource = readFileSync(safetyPath, "utf8");
const workflow = readFileSync(path.join(process.cwd(), ".github", "workflows", "validate.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

async function runnerModule() {
  return await import(pathToFileURL(runnerPath).href) as RunnerModule;
}

function pendingFailure() {
  return new Promise<Error>(() => undefined);
}

function fakeMutex(
  release = vi.fn(async () => undefined),
  retainAfterFailure = vi.fn(async () => undefined),
): Mutex {
  return {
    childEnvironment: { NODE_ENV: "test" },
    failure: pendingFailure(),
    assertAlive: vi.fn(),
    retainAfterFailure,
    release,
  };
}

function isolatedEnvironment(overrides: Record<string, string | undefined>) {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (name.toUpperCase().startsWith("PG") || name.startsWith("F0_")) delete environment[name];
  }
  return { ...environment, ...overrides };
}

function processExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error && typeof error === "object" && "code" in error && error.code === "ESRCH");
  }
}

async function waitForProcessToStop(pid: number, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processExists(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return !processExists(pid);
}

function firstOutputLine(child: ChildProcess) {
  return new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("Process-tree fixture output timed out.")), 3_000);
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString("utf8");
      const line = output.match(/^([^\r\n]+)[\r\n]/u);
      if (!line) return;
      clearTimeout(timer);
      resolve(line[1]);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", () => {
      if (output.includes("\n")) return;
      clearTimeout(timer);
      reject(new Error("Process-tree fixture exited before reporting its descendant."));
    });
  });
}

describe("F0 network proof cooperative session mutex", () => {
  it("runs every stage in order and releases the mutex", async () => {
    const runner = await runnerModule();
    const mutex = fakeMutex();
    const observed: string[] = [];

    await runner.executeNetworkProofStages(runner.fullNetworkProofStages, {
      acquireMutex: async () => mutex,
      runStage: async (stage) => {
        observed.push(stage.script);
      },
    });

    expect(observed).toEqual([
      "disposable-mark-guard-proof.mjs",
      "network-mark-disposable.mjs",
      "disposable-guard-proof.mjs",
      "fresh-migration-proof.mjs",
    ]);
    expect(mutex.assertAlive).toHaveBeenCalledTimes(observed.length * 2);
    expect(mutex.release).toHaveBeenCalledOnce();
  });

  it("stops later stages and retains the mutex after a stage failure", async () => {
    const runner = await runnerModule();
    const mutex = fakeMutex();
    const observed: string[] = [];

    await expect(runner.executeNetworkProofStages(runner.fullNetworkProofStages, {
      acquireMutex: async () => mutex,
      runStage: async (stage) => {
        observed.push(stage.script);
        if (observed.length === 2) throw new Error("synthetic stage failure");
      },
    })).rejects.toThrow("synthetic stage failure");

    expect(observed).toEqual([
      "disposable-mark-guard-proof.mjs",
      "network-mark-disposable.mjs",
    ]);
    expect(mutex.retainAfterFailure).toHaveBeenCalledOnce();
    expect(mutex.release).not.toHaveBeenCalled();
  });

  it("finishes stage cancellation before it retains the mutex", async () => {
    const runner = await runnerModule();
    const events: string[] = [];
    const mutex = fakeMutex(
      vi.fn(async () => {
        events.push("release");
      }),
      vi.fn(async () => {
        events.push("retain");
      }),
    );

    await expect(runner.executeNetworkProofStages(runner.guardNetworkProofStages.slice(0, 1), {
      acquireMutex: async () => mutex,
      runStage: async () => {
        events.push("cancel-start");
        await new Promise((resolve) => setTimeout(resolve, 10));
        events.push("cancel-finished");
        throw new Error("synthetic holder failure");
      },
    })).rejects.toThrow("synthetic holder failure");

    expect(events).toEqual(["cancel-start", "cancel-finished", "retain"]);
  });

  it("does not start a stage when mutex acquisition fails", async () => {
    const runner = await runnerModule();
    const runStage = vi.fn(async () => undefined);

    await expect(runner.executeNetworkProofStages(runner.guardNetworkProofStages, {
      acquireMutex: async () => {
        throw new Error("synthetic mutex contention");
      },
      runStage,
    })).rejects.toThrow("synthetic mutex contention");

    expect(runStage).not.toHaveBeenCalled();
  });

  it("retains the mutex when interruption arrives before release", async () => {
    const runner = await runnerModule();
    const mutex = fakeMutex();

    await expect(runner.executeNetworkProofStages([], {
      acquireMutex: async () => mutex,
      assertContinue: () => {
        throw new Error("synthetic late interruption");
      },
      runStage: async () => undefined,
    })).rejects.toThrow("synthetic late interruption");

    expect(mutex.retainAfterFailure).toHaveBeenCalledOnce();
    expect(mutex.release).not.toHaveBeenCalled();
  });

  it("ignores signals after safe mutex release starts", async () => {
    const runner = await runnerModule();
    const resolveInterruption = vi.fn();
    const state = {
      interruption: null,
      releaseStarted: true,
      resolveInterruption,
    };

    runner.recordNetworkProofInterruption(state, "SIGTERM");

    expect(state.interruption).toBeNull();
    expect(resolveInterruption).not.toHaveBeenCalled();
  });

  it("requires the wrapper mutex context before a raw stage can access PostgreSQL", () => {
    const result = spawnSync(process.execPath, [path.join(root, "network-mark-disposable.mjs")], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: isolatedEnvironment({
        F0_ALLOW_DISPOSABLE_DATABASE: "1",
        F0_DATABASE_URL: "postgresql://f0:synthetic@127.0.0.1:1/agent_ads_f0",
        F0_DISPOSABLE_MARKER: "f0000000-0000-4000-8000-000000000001",
      }),
    });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "F0 network proof mutex context is required before database access",
    );
    expect(`${result.stdout}\n${result.stderr}`).not.toContain("synthetic");
  });

  it("uses one stable database-local key and binds it to the exact holder", async () => {
    const safety = await import(pathToFileURL(safetyPath).href) as {
      NETWORK_PROOF_MUTEX_KEYS: readonly number[];
    };

    expect(safety.NETWORK_PROOF_MUTEX_KEYS).toHaveLength(2);
    for (const key of safety.NETWORK_PROOF_MUTEX_KEYS) {
      expect(Number.isSafeInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(0);
      expect(key).toBeLessThanOrEqual(2_147_483_647);
    }
    expect(mutexSource).toContain("pg_catalog.pg_try_advisory_lock");
    expect(mutexSource).toContain("pg_catalog.pg_control_system");
    expect(mutexSource).toContain("pg_catalog.pg_sleep");
    expect(mutexSource).toContain("pg_catalog.pg_terminate_backend");
    expect(mutexSource).toContain("detached: true");
    expect(mutexSource).toContain('stdio: "ignore"');
    expect(mutexSource).toContain("waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS)");
    expect(mutexSource).toContain("waitForHolderGone(context, mutex)");
    expect(mutexSource).toContain("timeout: PROBE_TIMEOUT_MS");
    expect(mutexSource.match(/child\.unref\(\)/gu)?.length).toBeGreaterThanOrEqual(3);
    expect(safetySource).toContain("JOIN pg_catalog.pg_locks AS held_mutex");
    expect(safetySource).toContain("held_mutex.objsubid = 2");
    expect(safetySource).toContain("held_mutex.mode = 'ExclusiveLock'");
    expect(safetySource).toContain("held_mutex.granted");
    expect(runnerSource).toContain("terminateProcessTree(state.activeChild)");
    expect(runnerSource).toContain("await mutex.retainAfterFailure()");
  });

  it("selects exact process-tree termination commands for both platforms", async () => {
    const processTree = await import(pathToFileURL(processTreePath).href) as {
      processTreeTerminationStrategy: (platform: NodeJS.Platform) => string;
      requiresDetachedProcessGroup: (platform: NodeJS.Platform) => boolean;
      windowsTaskkillInvocation: (
        pid: number,
        environment: Record<string, string>,
      ) => { args: readonly string[]; command: string };
    };

    expect(processTree.processTreeTerminationStrategy("win32")).toBe("taskkill");
    expect(processTree.requiresDetachedProcessGroup("win32")).toBe(false);
    expect(processTree.processTreeTerminationStrategy("linux")).toBe("process-group");
    expect(processTree.requiresDetachedProcessGroup("linux")).toBe(true);
    expect(processTree.windowsTaskkillInvocation(321, { SystemRoot: "C:\\Windows" })).toEqual({
      args: ["/PID", "321", "/T", "/F"],
      command: "C:\\Windows\\System32\\taskkill.exe",
    });
    expect(processTreeSource).toContain("shell: false");
    expect(processTreeSource).toContain('signalProcessGroup(pid, "SIGTERM")');
    expect(processTreeSource).toContain('signalProcessGroup(pid, "SIGKILL")');
  });

  it.skipIf(process.platform === "win32")(
    "stops a real POSIX stage process and its stubborn descendant",
    async () => {
      const processTree = await import(pathToFileURL(processTreePath).href) as {
        terminateProcessTree: (
          child: ChildProcess,
          options: { forceTimeoutMs: number; graceTimeoutMs: number },
        ) => Promise<void>;
        requiresDetachedProcessGroup: () => boolean;
      };
      const descendantSource = "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)";
      const rootSource = [
        "const {spawn}=require('node:child_process')",
        `const child=spawn(process.execPath,['-e',${JSON.stringify(descendantSource)}],{stdio:'ignore'})`,
        "process.stdout.write(String(child.pid)+'\\n')",
        "process.on('SIGTERM',()=>{})",
        "setInterval(()=>{},1000)",
      ].join(";");
      const child = spawn(process.execPath, ["-e", rootSource], {
        detached: processTree.requiresDetachedProcessGroup(),
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
      let descendantPid: number | null = null;

      try {
        descendantPid = Number(await firstOutputLine(child));
        expect(Number.isSafeInteger(descendantPid)).toBe(true);
        await processTree.terminateProcessTree(child, {
          forceTimeoutMs: 3_000,
          graceTimeoutMs: 100,
        });

        expect(await waitForProcessToStop(descendantPid)).toBe(true);
        expect(processExists(child.pid as number)).toBe(false);
      } finally {
        if (descendantPid && processExists(descendantPid)) process.kill(descendantPid, "SIGKILL");
        if (child.pid && processExists(child.pid)) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            child.kill("SIGKILL");
          }
        }
      }
    },
  );

  it.skipIf(
    process.platform !== "win32" || process.env.F0_TEST_WINDOWS_TASKKILL !== "1",
  )("stops a real Windows stage process and its stubborn descendant", async () => {
    const processTree = await import(pathToFileURL(processTreePath).href) as {
      terminateProcessTree: (
        child: ChildProcess,
        options: { forceTimeoutMs: number; graceTimeoutMs: number },
      ) => Promise<void>;
    };
    const descendantSource = "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)";
    const rootSource = [
      "const {spawn}=require('node:child_process')",
      `const child=spawn(process.execPath,['-e',${JSON.stringify(descendantSource)}],{stdio:'ignore'})`,
      "process.stdout.write(String(child.pid)+'\\n')",
      "setInterval(()=>{},1000)",
    ].join(";");
    const child = spawn(process.execPath, ["-e", rootSource], {
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    let descendantPid: number | null = null;

    try {
      descendantPid = Number(await firstOutputLine(child));
      expect(Number.isSafeInteger(descendantPid)).toBe(true);
      await processTree.terminateProcessTree(child, {
        forceTimeoutMs: 5_000,
        graceTimeoutMs: 100,
      });
      expect(await waitForProcessToStop(descendantPid)).toBe(true);
      expect(processExists(child.pid as number)).toBe(false);
    } finally {
      if (descendantPid && processExists(descendantPid)) process.kill(descendantPid, "SIGKILL");
      if (child.pid && processExists(child.pid)) {
        try {
          await processTree.terminateProcessTree(child, {
            forceTimeoutMs: 3_000,
            graceTimeoutMs: 100,
          });
        } catch {
          child.kill("SIGKILL");
        }
      }
    }
  });

  it("routes official CI network proofs through the mutex wrappers", () => {
    expect(packageJson.scripts["security:f0-network"]).toBe("node scripts/f0/network-proof.mjs");
    expect(packageJson.scripts["security:f0-guard-suite"]).toBe("node scripts/f0/network-guard-proof.mjs");
    for (const name of [
      "security:f0-mark-guard",
      "security:f0-schema:mark",
      "security:f0-schema",
      "security:f0-upgrade",
      "security:f0-guard",
    ]) {
      expect(packageJson.scripts[name]).toContain("node scripts/f0/network-stage-proof.mjs");
    }
    expect(workflow).toContain("node scripts/f0/network-guard-proof.mjs");
    expect(workflow).toContain("pnpm run security:f0-network");
    expect(workflow).not.toContain("node scripts/f0/disposable-mark-guard-proof.mjs");
  });
});
