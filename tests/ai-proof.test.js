import test from "node:test";
import assert from "node:assert/strict";
import { AI_OUTPUT_DISCLAIMER } from "../src/ai/contracts.js";
import { validateAiProof } from "../scripts/check-ai-proof.js";

const output = {
  schemaVersion: "1.0",
  disclaimer: AI_OUTPUT_DISCLAIMER,
  ownerAlert: { title: "Notify owners", summary: "A staged migration is required.", bullets: ["Notify owner A.", "Keep the source field."] },
  migrationRationale: { summary: "Use expand-migrate-contract.", safeguards: ["Preserve compatibility.", "Require approval."] },
  reviewerNoteDraft: { subject: "ContextSeal review", body: "Approve only the staged migration." },
  nextStepGuidance: { immediateActions: ["Review evidence.", "Notify owners."], afterApproval: ["Capture live evidence."] }
};

test("local AI proof accepts a bounded Ollama PASS artifact", () => {
  assert.deepEqual(validateAiProof({ status: "PASS", runtime: "ollama", model: "qwen2.5:7b", output }), {
    runtime: "ollama",
    model: "qwen2.5:7b"
  });
});

test("local AI proof rejects fallback or incomplete model artifacts", () => {
  assert.throws(() => validateAiProof({ status: "NOT_ENABLED", runtime: "ollama", model: "qwen2.5:7b" }), /requires status PASS/);
  assert.throws(() => validateAiProof({ status: "PASS", runtime: "ollama", model: "", output }), /non-empty model identifier/);
});