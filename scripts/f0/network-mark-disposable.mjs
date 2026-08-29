import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNetworkProofMutex,
  networkDatabaseEnvironment,
  psqlBaseArguments,
  resolveNetworkProofContext,
} from "./network-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveNetworkProofContext();
assertNetworkProofMutex(context);
const { databaseUrl, marker, psql } = context;
const result = spawnSync(psql, [
  ...psqlBaseArguments(),
  "--set",
  `f0_marker=${marker}`,
  "--file",
  path.join(root, "scripts", "f0", "mark-disposable.sql"),
], {
  cwd: root,
  encoding: "utf8",
  env: networkDatabaseEnvironment(context, "agent_ads_f0", { trustedCatalogs: true }),
  maxBuffer: 10 * 1024 * 1024,
});

if (result.error || result.status !== 0) {
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.replaceAll(
    databaseUrl,
    "[REDACTED_DATABASE_URL]",
  );
  process.stderr.write(output);
  if (result.error) throw new Error(`F0 network marker could not start: ${result.error.message}`);
  throw new Error("F0 network marker failed.");
}

console.log("F0 network target marked after its PostgreSQL 17 source-database inventories passed.");
