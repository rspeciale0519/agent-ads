import {
  formatNetworkProofFailure,
  guardNetworkProofStages,
  runNetworkProof,
} from "./network-proof-runner.mjs";

try {
  await runNetworkProof(guardNetworkProofStages);
  console.log("F0 guard suite passed under one cooperative PostgreSQL session mutex.");
} catch (error) {
  console.error(formatNetworkProofFailure(error, process.env, "F0 guard suite failed."));
  process.exitCode = 1;
}
