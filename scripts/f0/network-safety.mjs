import { spawnSync } from "node:child_process";
import { devNull } from "node:os";
import path from "node:path";

const markerPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const allowedHosts = new Set(["127.0.0.1", "[::1]"]);
const allowedProtocols = new Set(["postgres:", "postgresql:"]);

export function resolveNetworkProofContext(environment = process.env) {
  if (environment.F0_ALLOW_DISPOSABLE_DATABASE !== "1") {
    throw new Error("F0_ALLOW_DISPOSABLE_DATABASE=1 is required for this destructive disposable-database proof.");
  }

  const databaseUrl = environment.F0_DATABASE_URL;
  const marker = environment.F0_DISPOSABLE_MARKER;
  if (!databaseUrl || !markerPattern.test(marker || "")) {
    throw new Error("F0_DATABASE_URL and a canonical lowercase UUIDv4 F0_DISPOSABLE_MARKER are required.");
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("F0_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  let databasePath;
  let password;
  let username;
  try {
    databasePath = decodeURIComponent(parsed.pathname);
    password = decodeURIComponent(parsed.password);
    username = decodeURIComponent(parsed.username);
  } catch {
    throw new Error("F0_DATABASE_URL must contain valid encoded connection fields.");
  }

  if (
    !allowedProtocols.has(parsed.protocol)
    || !allowedHosts.has(parsed.hostname)
    || databasePath !== "/agent_ads_f0"
    || parsed.search !== ""
    || parsed.hash !== ""
  ) {
    throw new Error(
      "F0_DATABASE_URL must use a numeric loopback PostgreSQL authority, the agent_ads_f0 database, and no query or fragment overrides.",
    );
  }
  if (parsed.port === "" || username === "" || password === "") {
    throw new Error("F0_DATABASE_URL must include an explicit port, username, and password.");
  }
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("F0_DATABASE_URL must include a valid explicit PostgreSQL port.");
  }

  const spawnEnvironment = Object.fromEntries(
    Object.entries(environment).filter(([name]) => !name.toUpperCase().startsWith("PG")),
  );
  const psql = environment.PSQL_BIN || "psql";
  if (!/^psql(?:\.exe)?$/iu.test(path.basename(psql))) {
    throw new Error("PSQL_BIN must resolve to the PostgreSQL psql executable.");
  }
  const versionEnvironment = Object.fromEntries(
    Object.entries(spawnEnvironment).filter(([name]) => name.toUpperCase() !== "F0_DATABASE_URL"),
  );
  const versionResult = spawnSync(psql, ["--version"], {
    encoding: "utf8",
    env: versionEnvironment,
    windowsHide: true,
  });
  const versionOutput = `${versionResult.stdout || ""}\n${versionResult.stderr || ""}`.trim();
  if (
    versionResult.error
    || versionResult.status !== 0
    || !/^psql \(PostgreSQL\) (?:16|17)(?:\.|\s|$)/u.test(versionOutput)
  ) {
    throw new Error("PSQL_BIN must identify itself as a PostgreSQL 16 or 17 psql executable.");
  }

  return {
    connection: {
      host: parsed.hostname === "[::1]" ? "::1" : parsed.hostname,
      password,
      port: parsed.port,
      username,
    },
    databaseUrl,
    marker,
    psql,
    spawnEnvironment,
  };
}

export function psqlBaseArguments(options = {}) {
  const args = ["-X", "--no-password", "--set", "ON_ERROR_STOP=1"];
  if (options.quiet === true) args.push("--quiet");
  if (options.tuplesOnly === true) args.push("--tuples-only");
  if (options.noAlign === true) args.push("--no-align");
  return args;
}

export function networkDatabaseEnvironment(context, databaseName, options = {}) {
  if (!/^[a-z][a-z0-9_]{0,62}$/u.test(databaseName)) {
    throw new Error("Unsafe F0 database name.");
  }

  const environment = {
    ...Object.fromEntries(
      Object.entries(context.spawnEnvironment).filter(
        ([name]) => name.toUpperCase() !== "F0_DATABASE_URL",
      ),
    ),
    PGDATABASE: databaseName,
    PGCONNECT_TIMEOUT: "5",
    PGHOST: context.connection.host,
    PGPASSFILE: devNull,
    PGPASSWORD: context.connection.password,
    PGPORT: context.connection.port,
    PGUSER: context.connection.username,
  };
  if (options.trustedCatalogs === true) {
    environment.PGOPTIONS = "-c event_triggers=false -c search_path=pg_catalog,pg_temp";
  }
  return environment;
}
