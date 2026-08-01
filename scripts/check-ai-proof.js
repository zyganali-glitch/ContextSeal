import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { validateAiOutput } from "../src/ai/contracts.js";

export function validateAiProof(ai) {
  if (!ai || ai.status !== "PASS") {
    throw new Error(`Local AI proof requires status PASS; found '${ai?.status ?? "missing"}'.`);
  }
  if (ai.runtime !== "ollama") {
    throw new Error(`Local AI proof requires runtime ollama; found '${ai.runtime ?? "missing"}'.`);
  }
  if (typeof ai.model !== "string" || !ai.model.trim()) {
    throw new Error("Local AI proof requires a non-empty model identifier.");
  }
  if (!ai.output) throw new Error("Local AI proof requires bounded structured output.");

  validateAiOutput(ai.output);
  return { runtime: ai.runtime, model: ai.model };
}

async function main() {
  const artifact = JSON.parse(await readFile("examples/outputs/generated/ai/contextseal-ai-output.json", "utf8"));
  const proof = validateAiProof(artifact);
  console.log(`PASS local AI proof: ${proof.runtime} model ${proof.model} produced a bounded four-output artifact`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}