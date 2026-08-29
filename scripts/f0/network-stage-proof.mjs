import { formatNetworkProofFailure, runNetworkProof } from "./network-proof-runner.mjs";

const markStage = Object.freeze({
  label: "F0 network target marking",
  script: "network-mark-disposable.mjs",
});
const markGuardStage = Object.freeze({
  label: "F0 mark guard proof",
  requiresRunningMarker: true,
  script: "disposable-mark-guard-proof.mjs",
});
const stageSequences = Object.freeze({
  "mark-guard": Object.freeze({
    label: markGuardStage.label,
    stages: Object.freeze([markStage, markGuardStage]),
  }),
  mark: Object.freeze({
    label: markStage.label,
    stages: Object.freeze([markStage]),
  }),
  guard: Object.freeze({
    label: "F0 disposable guard proof",
    stages: Object.freeze([Object.freeze({
      label: "F0 disposable guard proof",
      requiresRunningMarker: true,
      script: "disposable-guard-proof.mjs",
    })]),
  }),
  schema: Object.freeze({
    label: "F0 fresh migration proof",
    stages: Object.freeze([Object.freeze({
      label: "F0 fresh migration proof",
      requiresRunningMarker: true,
      script: "fresh-migration-proof.mjs",
    })]),
  }),
  upgrade: Object.freeze({
    label: "F0 upgrade proof",
    stages: Object.freeze([Object.freeze({
      label: "F0 upgrade proof",
      requiresRunningMarker: true,
      script: "upgrade-proof.mjs",
    })]),
  }),
});

const stageName = process.argv[2];
const selected = stageSequences[stageName];
if (!selected || process.argv.length !== 3) {
  throw new Error("F0 network stage name is missing or invalid.");
}

try {
  await runNetworkProof(selected.stages);
  console.log(`${selected.label} passed under one cooperative PostgreSQL session mutex.`);
} catch (error) {
  console.error(formatNetworkProofFailure(error, process.env, "F0 network stage proof failed."));
  process.exitCode = 1;
}
