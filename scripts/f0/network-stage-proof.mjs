import { runNetworkProof } from "./network-proof-runner.mjs";

const stages = Object.freeze({
  "mark-guard": Object.freeze({
    label: "F0 mark guard proof",
    script: "disposable-mark-guard-proof.mjs",
  }),
  mark: Object.freeze({
    label: "F0 network target marking",
    script: "network-mark-disposable.mjs",
  }),
  guard: Object.freeze({
    label: "F0 disposable guard proof",
    script: "disposable-guard-proof.mjs",
  }),
  schema: Object.freeze({
    label: "F0 fresh migration proof",
    script: "fresh-migration-proof.mjs",
  }),
  upgrade: Object.freeze({
    label: "F0 upgrade proof",
    script: "upgrade-proof.mjs",
  }),
});

const stageName = process.argv[2];
const stage = stages[stageName];
if (!stage || process.argv.length !== 3) {
  throw new Error("F0 network stage name is missing or invalid.");
}

try {
  await runNetworkProof([stage]);
  console.log(`${stage.label} passed under one cooperative PostgreSQL session mutex.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "F0 network stage proof failed.");
  process.exitCode = 1;
}
