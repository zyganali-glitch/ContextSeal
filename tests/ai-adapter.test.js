import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeChange } from "../src/core/workflow.js";
import { AI_OUTPUT_DISCLAIMER } from "../src/ai/contracts.js";
import { enrichRunWithAi, generateAiCompanion, readAiRuntimeConfig } from "../src/ai/adapter.js";

const fixtureRequest = JSON.parse(await readFile("examples/retail-change-request.json", "utf8"));
const fixtureContext = JSON.parse(await readFile("examples/retail-context-graph.json", "utf8"));
const policy = JSON.parse(await readFile("config/policy.json", "utf8"));
const now = new Date("2026-07-14T12:30:00.000Z");

test("adapter configuration keeps the local Ollama defaults", () => {
  const config = readAiRuntimeConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.runtime, "ollama");
  assert.equal(config.model, "qwen2.5:7b");
  assert.equal(config.baseUrl, "http://127.0.0.1:11434");
  assert.equal(config.timeoutMs, 12000);
});

test("adapter falls back cleanly when AI is disabled", async () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const enriched = await enrichRunWithAi(run, { env: {} });
  assert.equal(enriched.risk.verdict, "BLOCKED");
  assert.equal(enriched.ai.status, "NOT_ENABLED");
  assert.equal(enriched.ai.reason, "AI runtime disabled by environment.");
  assert.equal(enriched.ai.output, null);
  assert.equal(enriched.aiGroundingInput.generatedFromRunId, run.runId);
});

test("adapter reports runtime unavailability without breaking the run", async () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const result = await generateAiCompanion(run, {
    env: {
      CONTEXTSEAL_AI_ENABLED: "true",
      CONTEXTSEAL_AI_RUNTIME: "ollama",
      CONTEXTSEAL_AI_MODEL: "qwen2.5:7b",
      CONTEXTSEAL_AI_BASE_URL: "http://127.0.0.1:11434",
      CONTEXTSEAL_AI_TIMEOUT_MS: "500"
    },
    fetchImpl: async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
    }
  });

  assert.equal(result.ai.status, "UNAVAILABLE");
  assert.match(result.ai.reason, /Local AI runtime unavailable/);
  assert.equal(result.ai.output, null);
});

test("adapter accepts a valid bounded Ollama response", async () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const result = await generateAiCompanion(run, {
    env: {
      CONTEXTSEAL_AI_ENABLED: "true",
      CONTEXTSEAL_AI_RUNTIME: "ollama",
      CONTEXTSEAL_AI_MODEL: "qwen2.5:7b",
      CONTEXTSEAL_AI_BASE_URL: "http://127.0.0.1:11434",
      CONTEXTSEAL_AI_TIMEOUT_MS: "500"
    },
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          response: JSON.stringify({
            schemaVersion: "1.0",
            disclaimer: AI_OUTPUT_DISCLAIMER,
            ownerAlert: {
              title: "Notify the downstream owners",
              summary: "The rename stays blocked until downstream consumers are migrated.",
              bullets: [
                "Notify customer-success and growth-data owners before consumer cutover.",
                "Keep the direct rename blocked while the staged migration is reviewed."
              ]
            },
            migrationRationale: {
              summary: "The staged migration keeps the original field authoritative while a compatible field is introduced.",
              safeguards: [
                "Backfill the compatibility field before downstream updates.",
                "Require scoped approval before any DataHub mutation step."
              ]
            },
            reviewerNoteDraft: {
              subject: "ContextSeal review for gold_customers",
              body: "Approve only the generated expand-migrate-contract plan. Do not approve a direct destructive rename."
            },
            nextStepGuidance: {
              immediateActions: [
                "Review the deterministic findings and impacted assets.",
                "Share the generated migration summary with downstream owners."
              ],
              afterApproval: [
                "Capture live MCP evidence before any DataHub write-back attempt."
              ]
            }
          })
        };
      }
    })
  });

  assert.equal(result.ai.status, "PASS");
  assert.equal(result.ai.reason, null);
  assert.equal(result.ai.output.disclaimer, AI_OUTPUT_DISCLAIMER);
  assert.equal(result.ai.output.ownerAlert.bullets.length, 2);
});