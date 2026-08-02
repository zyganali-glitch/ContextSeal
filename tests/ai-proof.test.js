import test from "node:test";
import assert from "node:assert/strict";
import { AI_OUTPUT_DISCLAIMER } from "../src/ai/contracts.js";
import {
  AI_PROOF_MODEL,
  AI_PROOF_VERSION,
  RECORDED_LOCAL_OLLAMA_PROOF_LABEL,
  RECORDED_LOCAL_OLLAMA_PROOF_NOTE,
  validateAiProof
} from "../src/ai/proof.js";

const output = {
  schemaVersion: "1.0",
  disclaimer: AI_OUTPUT_DISCLAIMER,
  ownerAlert: { title: "Notify owners", summary: "A staged migration is required.", bullets: ["Notify owner A.", "Keep the source field."] },
  migrationRationale: { summary: "Use expand-migrate-contract.", safeguards: ["Preserve compatibility.", "Require approval."] },
  reviewerNoteDraft: { subject: "ContextSeal review", body: "Approve only the staged migration." },
  nextStepGuidance: { immediateActions: ["Review evidence.", "Notify owners."], afterApproval: ["Capture live evidence."] }
};

test("local AI proof accepts a bounded Ollama PASS artifact", () => {
  assert.deepEqual(validateAiProof({
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
  }), {
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
  });
});

test("local AI proof rejects fallback or incomplete model artifacts", () => {
  assert.throws(() => validateAiProof({ proofVersion: AI_PROOF_VERSION, status: "NOT_ENABLED", runtime: "ollama", model: AI_PROOF_MODEL }), /requires status PASS/);
  assert.throws(() => validateAiProof({ proofVersion: AI_PROOF_VERSION, status: "PASS", runtime: "ollama", model: "", output }), /non-empty string/);
});