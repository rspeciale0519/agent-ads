import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSingleUserGuardSql,
  buildSingleUserInventorySql,
  resolveSingleUserContext,
  runSingleUserSql,
} from "./single-user-safety.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const context = resolveSingleUserContext(root);
const markerSql = buildSingleUserGuardSql(context.root, context.marker, "write");

runSingleUserSql(
  context,
  "Disposable postgres inventory",
  "postgres",
  buildSingleUserInventorySql(context.root, "postgres"),
  { trustedCatalogs: true },
);
runSingleUserSql(
  context,
  "Disposable template1 inventory",
  "template1",
  buildSingleUserInventorySql(context.root, "template1"),
  { trustedCatalogs: true },
);
runSingleUserSql(
  context,
  "Disposable cluster mark",
  "postgres",
  markerSql,
  { trustedCatalogs: true },
);

console.log("F0 single-user target marked after its PostgreSQL 17 source-database inventories passed.");
