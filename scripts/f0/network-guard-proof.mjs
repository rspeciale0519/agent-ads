import { guardNetworkProofStages, runNetworkProof } from "./network-proof-runner.mjs";

try {
  await runNetworkProof(guardNetworkProofStages);
  console.log("F0 guard suite passed under one cooperative PostgreSQL session mutex.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "F0 guard suite failed.");
  process.exitCode = 1;
}
