import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AI_PROOF_PATH, validateAiProof } from "../src/ai/proof.js";

export { validateAiProof } from "../src/ai/proof.js";

async function main() {
  const artifact = JSON.parse(await readFile(AI_PROOF_PATH, "utf8"));
  const proof = validateAiProof(artifact);
  console.log(`PASS local AI proof: ${proof.runtime} model ${proof.model} captured a bounded four-output artifact for ${proof.deterministicRunId}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}