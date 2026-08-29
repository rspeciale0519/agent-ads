import { fullNetworkProofStages, runNetworkProof } from "./network-proof-runner.mjs";

try {
  await runNetworkProof(fullNetworkProofStages);
  console.log("F0 network proof passed under one cooperative PostgreSQL session mutex.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "F0 network proof failed.");
  process.exitCode = 1;
}
