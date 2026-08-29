import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type NetworkSafetyModule = {
  networkDatabaseEnvironment: (
    context: {
      connection: { host: string; password: string; port: string; username: string };
      processEnvironment: Record<string, string>;
    },
    databaseName: string,
  ) => Record<string, string>;
  networkProofStageEnvironment: (options: {
    databaseUrl: string;
    marker: string;
    mutex: null;
    processEnvironment: Record<string, string>;
    psqlBin?: string;
  }) => Record<string, string>;
  safeProcessEnvironment: (environment: Record<string, string>) => Record<string, string>;
};

async function networkSafetyModule() {
  const safetyPath = path.join(process.cwd(), "scripts", "f0", "network-safety.mjs");
  return await import(pathToFileURL(safetyPath).href) as NetworkSafetyModule;
}

describe("F0 network child environments", () => {
  it("allows only required operating-system values", async () => {
    const safety = await networkSafetyModule();
    const processEnvironment = safety.safeProcessEnvironment({
      NODE_OPTIONS: "--require=unsafe",
      PATH: "synthetic-path",
      PGSERVICE: "unsafe-service",
      SECRET_TOKEN: "sentinel",
      SystemRoot: "C:\\Windows",
      TEMP: "synthetic-temp",
    });

    expect(processEnvironment).toEqual({
      PATH: "synthetic-path",
      SystemRoot: "C:\\Windows",
      TEMP: "synthetic-temp",
    });
    const stageEnvironment = safety.networkProofStageEnvironment({
      databaseUrl: "postgresql://f0:synthetic@127.0.0.1:5432/agent_ads_f0",
      marker: "f0000000-0000-4000-8000-000000000001",
      mutex: null,
      processEnvironment,
    });
    expect(stageEnvironment).not.toHaveProperty("NODE_OPTIONS");
    expect(stageEnvironment).not.toHaveProperty("PGSERVICE");
    expect(stageEnvironment).not.toHaveProperty("SECRET_TOKEN");
    expect(stageEnvironment).toMatchObject({
      F0_ALLOW_DISPOSABLE_DATABASE: "1",
      F0_DATABASE_URL: "postgresql://f0:synthetic@127.0.0.1:5432/agent_ads_f0",
      F0_DISPOSABLE_MARKER: "f0000000-0000-4000-8000-000000000001",
      PATH: "synthetic-path",
    });
    const databaseEnvironment = safety.networkDatabaseEnvironment({
      connection: {
        host: "127.0.0.1",
        password: "synthetic-password",
        port: "5432",
        username: "f0",
      },
      processEnvironment,
    }, "agent_ads_f0");
    expect(databaseEnvironment).not.toHaveProperty("NODE_OPTIONS");
    expect(databaseEnvironment).not.toHaveProperty("PGSERVICE");
    expect(databaseEnvironment).not.toHaveProperty("SECRET_TOKEN");
    expect(databaseEnvironment).toMatchObject({
      PATH: "synthetic-path",
      PGDATABASE: "agent_ads_f0",
      PGHOST: "127.0.0.1",
      PGPASSWORD: "synthetic-password",
      PGPORT: "5432",
      PGUSER: "f0",
    });
  });
});
