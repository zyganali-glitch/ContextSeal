import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AI_OUTPUT_DISCLAIMER } from "../src/ai/contracts.js";
import {
  AI_PROOF_MODEL,
  AI_PROOF_PATH,
  AI_PROOF_VERSION,
  RECORDED_LOCAL_OLLAMA_PROOF_LABEL,
  RECORDED_LOCAL_OLLAMA_PROOF_NOTE
} from "../src/ai/proof.js";
import { buildExpectedOutputs, writeOutputs } from "../scripts/run-demo.js";

const output = {
  schemaVersion: "1.0",
  disclaimer: AI_OUTPUT_DISCLAIMER,
  ownerAlert: { title: "Notify owners", summary: "A staged migration is required.", bullets: ["Notify owner A.", "Keep the source field."] },
  migrationRationale: { summary: "Use expand-migrate-contract.", safeguards: ["Preserve compatibility.", "Require approval."] },
  reviewerNoteDraft: { subject: "ContextSeal review", body: "Approve only the staged migration." },
  nextStepGuidance: { immediateActions: ["Review evidence.", "Notify owners."], afterApproval: ["Capture live evidence."] }
};

test("deterministic demo generation preserves the recorded AI proof artifact", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "contextseal-demo-artifacts-"));
  await cp("config", path.join(tempRoot, "config"), { recursive: true });
  await cp("examples", path.join(tempRoot, "examples"), { recursive: true });
  await cp("public", path.join(tempRoot, "public"), { recursive: true });

  const proofPath = path.join(tempRoot, ...AI_PROOF_PATH.split("/"));
  await mkdir(path.dirname(proofPath), { recursive: true });
  await writeFile(proofPath, `${JSON.stringify({
    proofVersion: AI_PROOF_VERSION,
    status: "PASS",
    runtime: "ollama",
    model: AI_PROOF_MODEL,
    disclaimer: AI_OUTPUT_DISCLAIMER,
    deterministicRunId: "csr_29d34a4cea700f26",
    groundingInputSha256: "a".repeat(64),
    capturedAt: "2026-08-01T09:12:56.000Z",
    captureCommand: "npm run ai:capture",
    runtimeProvenance: {
      launcher: "ollama",
      transport: "native-http",
      ollamaVersion: "ollama version is 0.32.5",
      availableModels: [AI_PROOF_MODEL]
    },
    boundary: {
      label: RECORDED_LOCAL_OLLAMA_PROOF_LABEL,
      hostedDemo: RECORDED_LOCAL_OLLAMA_PROOF_NOTE,
      authority: AI_OUTPUT_DISCLAIMER
    },
    output
  }, null, 2)}\n`, "utf8");

  const originalProof = await readFile(proofPath, "utf8");
  const { outputs } = await buildExpectedOutputs(tempRoot, {
    env: {
      CONTEXTSEAL_AI_ENABLED: "false",
      CONTEXTSEAL_AI_RUNTIME: "ollama",
      CONTEXTSEAL_AI_MODEL: AI_PROOF_MODEL
    }
  });

  await writeOutputs(tempRoot, outputs);

  const afterProof = await readFile(proofPath, "utf8");
  assert.equal(afterProof, originalProof);

  const demoData = JSON.parse(await readFile(path.join(tempRoot, "public", "demo-data.json"), "utf8"));
  assert.equal(demoData.analyzed.ai.status, "NOT_ENABLED");
  assert.equal(demoData.recordedAiProof.status, "PASS");
  assert.equal(demoData.recordedAiProof.boundary.label, RECORDED_LOCAL_OLLAMA_PROOF_LABEL);
  assert.equal(demoData.recordedAiProof.boundary.hostedDemo, RECORDED_LOCAL_OLLAMA_PROOF_NOTE);
  assert.deepEqual(demoData.recordedAiProof.output.ownerAlert, output.ownerAlert);
  assert.equal(demoData.recordedLiveProof.label, "RECORDED LIVE-LOCAL PROOF");
  assert.equal(demoData.recordedLiveProof.note.includes("not connected to a live catalog"), true);
  assert.equal(demoData.recordedLiveProof.status, "STALE");
  assert.equal(demoData.recordedLiveProof.read.toolCount, 14);
  assert.equal(demoData.recordedLiveProof.writeback.mutationReceiptCount, 3);
  assert.equal(demoData.recordedLiveProof.writeback.receiptStates.every((receipt) => receipt.state === "STALE"), true);
  assert.equal("evidence" in demoData.recordedLiveProof, false);
  assert.deepEqual(demoData.recordedLiveProof.evidencePaths, [
    "examples/outputs/live-datahub-read-evidence.json",
    "examples/outputs/live-datahub-writeback-evidence.json"
  ]);
});