import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeChange } from "../src/core/workflow.js";
import {
  AI_OUTPUT_DISCLAIMER,
  AiContractError,
  buildAiGroundingInput,
  validateAiOutput
} from "../src/ai/contracts.js";

const fixtureRequest = JSON.parse(await readFile("examples/retail-change-request.json", "utf8"));
const fixtureContext = JSON.parse(await readFile("examples/retail-context-graph.json", "utf8"));
const policy = JSON.parse(await readFile("config/policy.json", "utf8"));
const now = new Date("2026-07-14T12:30:00.000Z");

test("ai grounding input is built from deterministic run evidence", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const bundle = buildAiGroundingInput(run);
  assert.equal(bundle.schemaVersion, "1.0");
  assert.equal(bundle.evidenceBoundary.groundingMode, "FIXTURE_DEMO");
  assert.equal(bundle.impact.totalAssets, 5);
  assert.equal(bundle.queryEvidence.fixtureQueryCount, 2);
  assert.equal(bundle.queryEvidence.liveReadCaptured, false);
  assert.match(bundle.queryEvidence.safeClaim, /Fixture query evidence shows 2 matching queries/);
  assert.deepEqual(bundle.requiredOutputs, ["ownerAlert", "migrationRationale", "reviewerNoteDraft", "nextStepGuidance"]);
});

test("ai grounding input captures zero-result live query reads without overclaiming", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "datahub", now });
  run.liveEvidence = {
    evidence: [
      { tool: "get_dataset_queries", payload: { total: 0 } }
    ]
  };
  const bundle = buildAiGroundingInput(run);
  assert.equal(bundle.evidenceBoundary.groundingMode, "DATAHUB_WITH_STORED_RAW_MCP_EVIDENCE");
  assert.equal(bundle.queryEvidence.liveReadCaptured, true);
  assert.equal(bundle.queryEvidence.liveReadTotal, 0);
  assert.match(bundle.queryEvidence.safeClaim, /zero observed dataset queries/);
});

test("ai output schema accepts bounded structured output", () => {
  const output = validateAiOutput({
    schemaVersion: "1.0",
    disclaimer: AI_OUTPUT_DISCLAIMER,
    ownerAlert: {
      title: "Notify the downstream owners",
      summary: "The rename is blocked because downstream consumers and privacy signals exist.",
      bullets: [
        "Notify growth-data and customer-success owners before consumer changes begin.",
        "Call out that the direct rename remains blocked even if the staged migration is approved."
      ]
    },
    migrationRationale: {
      summary: "The staged migration preserves the old field while consumers move to the new field.",
      safeguards: [
        "Keep the source field authoritative during migration.",
        "Require scoped human approval before any write-back step."
      ]
    },
    reviewerNoteDraft: {
      subject: "ContextSeal review for gold_customers",
      body: "Approve only the generated expand-migrate-contract plan. Do not approve a direct destructive rename."
    },
    nextStepGuidance: {
      immediateActions: [
        "Review the deterministic findings and impacted owners.",
        "Share the staged migration summary with downstream consumers."
      ],
      afterApproval: [
        "Capture live MCP evidence before attempting any DataHub write-back."
      ]
    }
  });

  assert.equal(output.disclaimer, AI_OUTPUT_DISCLAIMER);
  assert.equal(output.ownerAlert.bullets.length, 2);
  assert.equal(output.nextStepGuidance.afterApproval.length, 1);
});

test("ai output schema rejects missing deterministic disclaimer", () => {
  assert.throws(() => validateAiOutput({
    schemaVersion: "1.0",
    disclaimer: "model says this is enough",
    ownerAlert: { title: "x", summary: "y", bullets: ["a", "b"] },
    migrationRationale: { summary: "z", safeguards: ["a", "b"] },
    reviewerNoteDraft: { subject: "s", body: "b" },
    nextStepGuidance: { immediateActions: ["a", "b"], afterApproval: ["c"] }
  }), AiContractError);
});