import {
  formatNetworkProofFailure,
  fullNetworkProofStages,
  runNetworkProof,
} from "./network-proof-runner.mjs";

try {
  await runNetworkProof(fullNetworkProofStages);
  console.log("F0 network proof passed under one cooperative PostgreSQL session mutex.");
} catch (error) {
  console.error(formatNetworkProofFailure(error, process.env, "F0 network proof failed."));
  process.exitCode = 1;
}
