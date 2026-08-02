import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateChangeRequest, ContractError } from "../src/core/contracts.js";
import { traceImpact } from "../src/core/impact.js";
import { evaluateRisk } from "../src/core/risk.js";
import { analyzeChange, decideRun } from "../src/core/workflow.js";
import { buildWritebackOperations, executeWriteback, WritebackError } from "../src/datahub/writeback.js";

const fixtureRequest = JSON.parse(await readFile("examples/retail-change-request.json", "utf8"));
const fixtureContext = JSON.parse(await readFile("examples/retail-context-graph.json", "utf8"));
const policy = JSON.parse(await readFile("config/policy.json", "utf8"));
const now = new Date("2026-07-14T12:30:00.000Z");

test("change contract rejects a rename without a destination", () => {
  assert.throws(() => validateChangeRequest({ ...fixtureRequest, destinationField: "" }), ContractError);
});

test("impact trace returns downstream paths without duplicates", () => {
  const impact = traceImpact(fixtureContext, fixtureRequest.targetUrn, 5);
  assert.equal(impact.counts.total, 5);
  assert.equal(impact.counts.highCriticality, 4);
  assert.deepEqual(impact.impacted.at(-1).path, [
    fixtureRequest.targetUrn,
    "urn:li:dataJob:(urn:li:dataFlow:(airflow,customer_360,PROD),build_segments)",
    "urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.analytics.customer_segments,PROD)",
    "urn:li:mlModel:(urn:li:dataPlatform:mlflow,churn_prediction,PROD)",
    "urn:li:dashboard:(powerbi,retention_campaign)"
  ]);
});

test("risk engine blocks the direct breaking request with named evidence", () => {
  const impact = traceImpact(fixtureContext, fixtureRequest.targetUrn, 5);
  const risk = evaluateRisk({ request: fixtureRequest, context: fixtureContext, impact, policy, now });
  assert.equal(risk.verdict, "BLOCKED");
  assert.equal(risk.score, 80);
  assert.deepEqual(risk.findings.map((item) => item.code), ["BREAKING_LINEAGE", "SENSITIVE_DATA", "LIVE_QUERY_USAGE"]);
});

test("workflow generates a staged migration and keeps unexecuted claims NOT_RUN", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  assert.equal(run.state, "AWAITING_HUMAN");
  assert.equal(run.artifacts.strategy, "EXPAND_MIGRATE_CONTRACT");
  assert.match(run.artifacts.files[0].content, /customer_email as contact_email/);
  assert.equal(run.artifacts.grounding.contractVersion, "1.0");
  assert.equal(run.artifacts.grounding.migrationRule.ruleId, "RENAME_COLUMN_REQUIRES_COMPATIBILITY_FIELD");
  assert.deepEqual(run.artifacts.grounding.policyInputs.findingCodes, ["BREAKING_LINEAGE", "SENSITIVE_DATA", "LIVE_QUERY_USAGE"]);
  assert.equal(run.artifacts.grounding.lineageInputs.representativePaths[0].assetUrn, "urn:li:dataJob:(urn:li:dataFlow:(airflow,customer_360,PROD),build_segments)");
  assert.match(run.evidence.find((item) => item.claim === "Migration artifacts generated").artifact, /grounding contract 1.0/);
  assert.equal(run.evidence.find((item) => item.claim.includes("warehouse")).state, "NOT_RUN");
  assert.equal(run.evidence[0].state, "FIXTURE");
});

test("datahub mode cannot claim live context before MCP evidence arrives", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "datahub", now: new Date(fixtureContext.observedAt) });
  assert.equal(run.evidence.find((item) => item.claim === "DataHub context retrieved").state, "NOT_RUN");
  assert.equal(run.evidence.find((item) => item.claim === "Downstream impact paths traced").state, "FIXTURE");
});

test("approval creates a hashed passport without rewriting deterministic risk", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const approved = decideRun(run, {
    decision: "APPROVE",
    reviewer: "data-owner",
    note: "Approve staged migration only.",
    scopeAccepted: true
  }, now);
  assert.equal(approved.state, "APPROVED_FOR_WRITEBACK");
  assert.equal(approved.risk.verdict, "BLOCKED");
  assert.equal(approved.passport.status, "CERTIFIED");
  assert.match(approved.passport.passportId, /^csp_[a-f0-9]{20}$/);
  assert.equal(approved.passport.artifactHashes.length, 5);
  assert.equal(approved.passport.artifactGroundingContractVersion, "1.0");
  assert.equal(approved.passport.artifactGroundingRuleId, "RENAME_COLUMN_REQUIRES_COMPATIBILITY_FIELD");
  assert.equal(approved.artifacts.manifest.manifestVersion, "1.0");
  assert.equal(approved.artifacts.manifest.passportContext.passportId, approved.passport.passportId);
  assert.equal(approved.artifacts.manifest.artifacts.length, 5);
  assert.deepEqual(approved.artifacts.manifest.artifacts[0].groundingRefs, ["target", "schemaInputs", "policyInputs", "migrationRule"]);
});

test("write-back operations cannot be built before scoped approval", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  assert.throws(() => buildWritebackOperations(run, policy), /approved certified run/);
});

test("approved passport produces bounded DataHub mutation operations", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const approved = decideRun(run, {
    decision: "APPROVE",
    reviewer: "data-owner",
    note: "Approve staged migration only.",
    scopeAccepted: true
  }, now);
  const operations = buildWritebackOperations(approved, policy, now);
  assert.deepEqual(operations.map((item) => item.tool), ["add_structured_properties", "update_description", "save_document"]);
  assert.deepEqual(operations[0].arguments.entity_urns, [fixtureRequest.targetUrn]);
  assert.deepEqual(operations[2].arguments.related_assets, [fixtureRequest.targetUrn]);
});

test("write-back stops and preserves partial operation evidence on tool failure", async () => {
  let calls = 0;
  const client = {
    async callTool() {
      calls += 1;
      if (calls === 2) throw new Error("catalog denied description");
      return { isError: false };
    }
  };
  await assert.rejects(
    () => executeWriteback(client, [{ tool: "one", arguments: {} }, { tool: "two", arguments: {} }, { tool: "three", arguments: {} }]),
    (error) => error instanceof WritebackError && error.results.map((item) => item.status).join(",") === "PASS,FAIL"
  );
  assert.equal(calls, 2);
});

test("write-back verifies then skips an already durable passport without duplicate mutations", async () => {
  const run = decideRun(analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now }), {
    decision: "APPROVE",
    reviewer: "data-owner",
    note: "Approve staged migration only.",
    scopeAccepted: true
  }, now);
  const operations = buildWritebackOperations(run, policy, now);
  const catalog = { properties: {}, description: "", document: null };
  const mutationCalls = [];
  const client = {
    async callTool(tool, args) {
      if (tool === "get_entities") {
        return {
          isError: false,
          structuredContent: {
            result: [{
              urn: fixtureRequest.targetUrn,
              editableProperties: { description: catalog.description },
              structuredProperties: {
                properties: Object.entries(catalog.properties).map(([urn, values]) => ({
                  structuredProperty: { urn },
                  values: values.map((value) => typeof value === "number" ? { numberValue: value } : { stringValue: value })
                }))
              },
              relatedDocuments: {
                documents: catalog.document ? [{ urn: catalog.document.urn, info: { title: catalog.document.title } }] : []
              }
            }]
          }
        };
      }
      if (tool === "grep_documents") {
        return {
          isError: false,
          structuredContent: {
            results: catalog.document ? [{
              urn: catalog.document.urn,
              title: catalog.document.title,
              total_matches: 1,
              matches: [{ excerpt: catalog.document.content }]
            }] : []
          }
        };
      }
      mutationCalls.push(tool);
      if (tool === "add_structured_properties") catalog.properties = args.property_values;
      if (tool === "update_description") catalog.description += args.description;
      if (tool === "save_document") {
        catalog.document = { urn: "urn:li:document:workflow-idempotent", title: args.title, content: args.content };
      }
      return {
        isError: false,
        structuredContent: { success: true, ...(tool === "save_document" ? { urn: catalog.document.urn } : {}) }
      };
    }
  };

  const first = await executeWriteback(client, operations, { run, policy, now });
  const second = await executeWriteback(client, operations, { run, policy, now });

  assert.deepEqual(first.map((receipt) => receipt.action), ["APPLIED", "APPLIED", "APPLIED"]);
  assert.deepEqual(second.map((receipt) => receipt.action), ["SKIPPED", "SKIPPED", "SKIPPED"]);
  assert.equal(second.idempotency.strategy, "VERIFY_THEN_SKIP");
  assert.equal(second.idempotency.preflight.descriptionBlockCount, 1);
  assert.equal(second.idempotency.preflight.document.state, "VERIFIED");
  assert.deepEqual(mutationCalls, ["add_structured_properties", "update_description", "save_document"]);
  assert.equal(catalog.description.split(`ContextSeal passport **${run.passport.passportId}**`).length - 1, 1);
});
