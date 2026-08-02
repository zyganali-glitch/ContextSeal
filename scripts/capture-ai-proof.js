import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256 } from "../src/core/hash.js";
import { AI_OUTPUT_DISCLAIMER } from "../src/ai/contracts.js";
import {
  AI_PROOF_MODEL,
  AI_PROOF_PATH,
  AI_PROOF_VERSION,
  RECORDED_LOCAL_OLLAMA_PROOF_LABEL,
  RECORDED_LOCAL_OLLAMA_PROOF_NOTE,
  validateAiProof
} from "../src/ai/proof.js";
import { loadEnvFile } from "../src/env.js";
import { buildDeterministicFixtureRun } from "./run-demo.js";
import { readOllamaRuntimeProvenance } from "./probe-ai-runtime.js";

async function main() {
  const root = path.resolve(".");
  const env = { ...process.env };
  await loadEnvFile(root, env);

  env.CONTEXTSEAL_AI_ENABLED = "true";
  env.CONTEXTSEAL_AI_RUNTIME = "ollama";
  env.CONTEXTSEAL_AI_MODEL = AI_PROOF_MODEL;

  const runtime = readOllamaRuntimeProvenance(env);
  if (!runtime.available) {
    throw new Error(runtime.reason || "Local Ollama runtime is unavailable.");
  }
  if (!runtime.availableModels.includes(AI_PROOF_MODEL)) {
    throw new Error(`Local Ollama runtime does not list required model ${AI_PROOF_MODEL}.`);
  }

  const { run } = await buildDeterministicFixtureRun(root, { env, useRuntimeAi: true });
  if (run.ai?.status !== "PASS" || !run.ai.output) {
    throw new Error(`AI capture requires a bounded PASS output; found '${run.ai?.status ?? "missing"}'.`);
  }

  const artifact = validateAiProof({
    proofVersion: AI_PROOF_VERSION,
    status: "PASS",
    runtime: "ollama",
    model: AI_PROOF_MODEL,
    disclaimer: AI_OUTPUT_DISCLAIMER,
    deterministicRunId: run.runId,
    groundingInputSha256: sha256(run.aiGroundingInput),
    capturedAt: new Date().toISOString(),
    captureCommand: "npm run ai:capture",
    runtimeProvenance: {
      launcher: runtime.launcher,
      transport: runtime.transport,
      ollamaVersion: runtime.ollamaVersion,
      availableModels: runtime.availableModels
    },
    boundary: {
      label: RECORDED_LOCAL_OLLAMA_PROOF_LABEL,
      hostedDemo: RECORDED_LOCAL_OLLAMA_PROOF_NOTE,
      authority: AI_OUTPUT_DISCLAIMER
    },
    output: run.ai.output
  });

  const outputPath = path.join(root, AI_PROOF_PATH);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`PASS local AI proof captured: ${artifact.runtime} ${artifact.model} run ${artifact.deterministicRunId}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}