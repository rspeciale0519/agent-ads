import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

type Stage = { label: string; requiresRunningMarker?: boolean; script: string };
type Mutex = {
  armTarget: () => Promise<void>;
  childEnvironment: NodeJS.ProcessEnv;
  completeTarget: () => Promise<void>;
  failure: Promise<Error>;
  assertAlive: () => void;
  quarantineAndRelease: () => Promise<void>;
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
  formatNetworkProofFailure: (
    error: unknown,
    environment: NodeJS.ProcessEnv,
    fallback: string,
  ) => string;
  fullNetworkProofStages: readonly Stage[];
  guardNetworkProofStages: readonly Stage[];
  networkProofInterruptionSignals: (platform?: NodeJS.Platform) => readonly string[];
  redactNetworkProofOutput: (value: string, environment: NodeJS.ProcessEnv) => string;
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
const holderDeathProofSource = readFileSync(
  path.join(root, "network-proof-mutex-holder-death-proof.mjs"),
  "utf8",
);
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

function fakeMutex(overrides: Partial<Mutex> = {}): Mutex {
  return {
    armTarget: vi.fn(async () => undefined),
    childEnvironment: { NODE_ENV: "test" },
    completeTarget: vi.fn(async () => undefined),
    failure: pendingFailure(),
    assertAlive: vi.fn(),
    quarantineAndRelease: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
    ...overrides,
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
      "network-mark-disposable.mjs",
      "disposable-mark-guard-proof.mjs",
      "disposable-guard-proof.mjs",
      "fresh-migration-proof.mjs",
    ]);
    expect(mutex.armTarget).toHaveBeenCalledOnce();
    expect(mutex.completeTarget).toHaveBeenCalledOnce();
    expect(mutex.assertAlive).toHaveBeenCalledTimes(observed.length * 2 + 2);
    expect(mutex.release).toHaveBeenCalledOnce();
  });

  it("stops later stages and quarantines the target after a stage failure", async () => {
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
      "network-mark-disposable.mjs",
      "disposable-mark-guard-proof.mjs",
    ]);
    expect(mutex.quarantineAndRelease).toHaveBeenCalledOnce();
    expect(mutex.armTarget).toHaveBeenCalledOnce();
    expect(mutex.completeTarget).not.toHaveBeenCalled();
    expect(mutex.release).not.toHaveBeenCalled();
  });

  it("finishes stage cancellation before it quarantines the target", async () => {
    const runner = await runnerModule();
    const events: string[] = [];
    let resolveFailure: (error: Error) => void = () => undefined;
    const failure = new Promise<Error>((resolve) => {
      resolveFailure = resolve;
    });
    const mutex = fakeMutex({
      failure,
      quarantineAndRelease: vi.fn(async () => {
        events.push("quarantine");
      }),
    });

    await expect(runner.executeNetworkProofStages(runner.guardNetworkProofStages.slice(1, 2), {
      acquireMutex: async () => mutex,
      runStage: async () => {
        events.push("cancel-start");
        resolveFailure(new Error("F0 network proof mutex holder exited during the proof."));
        const error = await failure;
        events.push("cancel-finished");
        throw error;
      },
    })).rejects.toThrow("F0 network proof mutex holder exited during the proof.");

    expect(events).toEqual(["cancel-start", "cancel-finished", "quarantine"]);
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

  it("releases an unarmed target when the safe mark stage fails", async () => {
    const runner = await runnerModule();
    const mutex = fakeMutex();

    await expect(runner.executeNetworkProofStages(runner.guardNetworkProofStages.slice(0, 1), {
      acquireMutex: async () => mutex,
      runStage: async () => {
        throw new Error("synthetic mark failure");
      },
    })).rejects.toThrow("synthetic mark failure");

    expect(mutex.armTarget).not.toHaveBeenCalled();
    expect(mutex.quarantineAndRelease).not.toHaveBeenCalled();
    expect(mutex.release).toHaveBeenCalledOnce();
  });

  it("quarantines the target when interruption arrives before release", async () => {
    const runner = await runnerModule();
    const mutex = fakeMutex();

    await expect(runner.executeNetworkProofStages(runner.guardNetworkProofStages.slice(1, 2), {
      acquireMutex: async () => mutex,
      assertContinue: () => {
        throw new Error("synthetic late interruption");
      },
      runStage: async () => undefined,
    })).rejects.toThrow("synthetic late interruption");

    expect(mutex.quarantineAndRelease).toHaveBeenCalledOnce();
    expect(mutex.release).not.toHaveBeenCalled();
  });

  it("preserves proof and mutex cleanup failures", async () => {
    const runner = await runnerModule();
    const mutex = fakeMutex({
      quarantineAndRelease: vi.fn(async () => {
        throw new AggregateError([
          new Error("synthetic quarantine failure"),
          new Error("synthetic release failure"),
        ], "synthetic containment failure");
      }),
    });

    try {
      await runner.executeNetworkProofStages(runner.guardNetworkProofStages.slice(1, 2), {
        acquireMutex: async () => mutex,
        runStage: async () => {
          throw new Error("synthetic proof failure");
        },
      });
      throw new Error("Expected the combined proof failure.");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors.map((cause) => (cause as Error).message)).toEqual([
        "synthetic proof failure",
        "synthetic quarantine failure",
        "synthetic release failure",
      ]);
    }
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

  it("records only the first interruption before cleanup starts", async () => {
    const runner = await runnerModule();
    const resolveInterruption = vi.fn();
    const state = {
      interruption: null,
      releaseStarted: false,
      resolveInterruption,
    };

    runner.recordNetworkProofInterruption(state, "SIGTERM");
    runner.recordNetworkProofInterruption(state, "SIGINT");

    expect(state.interruption).toBeInstanceOf(Error);
    expect((state.interruption as Error | null)?.message).toBe(
      "F0 network proof was interrupted by SIGTERM.",
    );
    expect(resolveInterruption).toHaveBeenCalledOnce();
    expect(resolveInterruption).toHaveBeenCalledWith(state.interruption);
  });

  it("uses the catchable interruption signals for each platform", async () => {
    const runner = await runnerModule();

    expect(runner.networkProofInterruptionSignals("win32")).toEqual([
      "SIGINT",
      "SIGTERM",
      "SIGBREAK",
    ]);
    expect(runner.networkProofInterruptionSignals("linux")).toEqual([
      "SIGINT",
      "SIGTERM",
      "SIGHUP",
    ]);
  });

  it("redacts the database URL from bounded stage output", async () => {
    const runner = await runnerModule();
    const databaseUrl = "postgresql://f0:safe%4asecret@127.0.0.1:5432/agent_ads_f0";
    const output = [
      databaseUrl,
      "safeJsecret",
      "safe%4asecret",
      "safe%4Asecret",
    ].join("\n");

    const redacted = runner.redactNetworkProofOutput(output, {
      F0_DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
    });
    expect(redacted).toContain("[REDACTED_DATABASE_URL]");
    expect(redacted).not.toContain(databaseUrl);
    expect(redacted).not.toContain("safeJsecret");
    expect(redacted).not.toContain("safe%4asecret");
    expect(redacted).not.toContain("safe%4Asecret");
    expect(runner.redactNetworkProofOutput("diagnostic", {
      F0_DATABASE_URL: "not a URL",
      NODE_ENV: "test",
    })).toBe("[REDACTED_INVALID_DATABASE_OUTPUT]\n");
  });

  it("flattens proof causes and redacts their database secrets", async () => {
    const runner = await runnerModule();
    const databaseUrl = "postgresql://f0:safe%40secret@127.0.0.1:5432/agent_ads_f0";
    const failure = new AggregateError([
      new Error(`proof failed for ${databaseUrl}`),
      new AggregateError([
        new Error("cleanup exposed safe@secret"),
      ], "nested cleanup failure"),
    ], "combined failure");

    const output = runner.formatNetworkProofFailure(failure, {
      F0_DATABASE_URL: databaseUrl,
      NODE_ENV: "test",
    }, "fallback");
    expect(output).toContain("proof failed for [REDACTED_DATABASE_URL]");
    expect(output).toContain("cleanup exposed [REDACTED_DATABASE_SECRET]");
    expect(output).not.toContain("safe@secret");
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
    expect(mutexSource).not.toContain("pg_catalog.pg_sleep");
    expect(mutexSource).toContain("pg_catalog.pg_terminate_backend");
    expect(mutexSource).toContain("detached: false");
    expect(mutexSource).toContain('stdio: ["pipe", "ignore", "ignore"]');
    expect(mutexSource).toContain("child.stdin.write(holderSql()");
    expect(mutexSource).toContain("child.stdin.end()");
    expect(mutexSource).toContain("waitForProcessExit(child, HOLDER_EXIT_TIMEOUT_MS)");
    expect(mutexSource).toContain("waitForHolderGone(context, mutex)");
    expect(mutexSource).toContain("holderMarkerTransitionSql");
    expect(mutexSource).toContain("HOLDER_HEALTH_INTERVAL_MS");
    expect(mutexSource).toContain("mutex holder lost its database lock");
    expect(mutexSource).toContain("settleFailure(holderHealthError)");
    expect(mutexSource).toContain("pg_catalog.pg_backend_pid() <> ${mutex.backendPid}");
    expect(mutexSource).toContain("await writeHolderSql(");
    expect(mutexSource).toContain("agent_ads_f0_complete:");
    expect(mutexSource).toContain("agent_ads_f0_failed:");
    expect(mutexSource).toContain("quarantineAndRelease()");
    expect(mutexSource).not.toContain("quarantineTargetSql");
    expect(mutexSource).toContain("timeout: PROBE_TIMEOUT_MS");
    expect(mutexSource).not.toContain("child.unref()");
    expect(safetySource).toContain("JOIN pg_catalog.pg_locks AS held_mutex");
    expect(safetySource).toContain("held_mutex.objsubid = 2");
    expect(safetySource).toContain("held_mutex.mode = 'ExclusiveLock'");
    expect(safetySource).toContain("held_mutex.granted");
    expect(safetySource).toContain("agent_ads_f0_running:");
    expect(runnerSource).toContain("terminateProcessTree(state.activeChild)");
    expect(runnerSource).toContain("await mutex.armTarget()");
    expect(runnerSource).toContain("await mutex.completeTarget()");
    expect(runnerSource).toContain("await mutex.release()");
    expect(runnerSource).toContain("await mutex.quarantineAndRelease()");
  });

  it("selects exact process-tree termination commands for both platforms", async () => {
    const processTree = await import(pathToFileURL(processTreePath).href) as {
      processTreeTerminationStrategy: (platform: NodeJS.Platform) => string;
      requiresDetachedProcessGroup: (platform: NodeJS.Platform) => boolean;
      windowsProcessTreeTerminationConfirmed: (
        taskkillStatus: number | null,
        rootStopped: boolean,
      ) => boolean;
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
    expect(processTree.windowsProcessTreeTerminationConfirmed(0, true)).toBe(true);
    expect(processTree.windowsProcessTreeTerminationConfirmed(128, true)).toBe(false);
    expect(processTree.windowsProcessTreeTerminationConfirmed(0, false)).toBe(false);
    expect(processTreeSource).toContain("shell: false");
    expect(processTreeSource).toContain("taskkill=not-run");
    expect(processTreeSource).toContain('signalProcessGroup(pid, "SIGTERM")');
    expect(processTreeSource).toContain('signalProcessGroup(pid, "SIGKILL")');
  });

  it("fails closed for a Windows dead-root taskkill result", async () => {
    const processTree = await import(pathToFileURL(processTreePath).href) as {
      windowsProcessTreeTerminationConfirmed: (
        taskkillStatus: number | null,
        rootStopped: boolean,
      ) => boolean;
    };
    const deadRootFixture = { rootStopped: true, taskkillStatus: 128 };

    expect(processTree.windowsProcessTreeTerminationConfirmed(
      deadRootFixture.taskkillStatus,
      deadRootFixture.rootStopped,
    )).toBe(false);
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
    15_000,
  );

  it.skipIf(
    process.platform !== "win32" || process.env.F0_TEST_WINDOWS_TASKKILL !== "1",
  )(
    "stops a real Windows stage process and its stubborn descendant",
    async () => {
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
    },
    15_000,
  );

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
    expect(workflow).toContain("node scripts/f0/network-stage-proof.mjs mark");
    expect(workflow).toContain("node scripts/f0/network-proof-mutex-holder-death-proof.mjs");
    expect(holderDeathProofSource).toContain("pg_catalog.pg_terminate_backend");
    expect(holderDeathProofSource).toContain("F0_HOLDER_DEATH_CONTAINED");
    expect(holderDeathProofSource).toContain("mutex holder lost its database lock");
    expect(holderDeathProofSource).toContain("fresh wrapped reuse attempt");
    expect(holderDeathProofSource).toContain("await mutex.quarantineAndRelease()");
    expect(workflow).not.toContain("node scripts/f0/disposable-mark-guard-proof.mjs");
  });
});
