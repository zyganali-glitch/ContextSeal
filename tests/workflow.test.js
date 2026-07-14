import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateApproval, validateChangeRequest, ContractError } from "../src/core/contracts.js";
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

test("contracts reject credential material without reflecting it in errors", () => {
  const pasted = ["github", "pat", "F7".repeat(16)].join("_");
  for (const [validate, input, field] of [
    [validateChangeRequest, { ...fixtureRequest, requestedBy: pasted }, "requestedBy"],
    [validateChangeRequest, { ...fixtureRequest, rationale: `emergency ${pasted}` }, "rationale"],
    [validateApproval, {
      decision: "APPROVE",
      reviewer: pasted,
      note: "Approve exact staged scope only.",
      scopeAccepted: true
    }, "reviewer"],
    [validateApproval, {
      decision: "APPROVE",
      reviewer: "data-owner",
      note: `Authorization: Bearer ${pasted}`,
      scopeAccepted: true
    }, "note"]
  ]) {
    assert.throws(() => validate(input), (error) => {
      const safeEnvelope = `${error.message}\n${(error.details || []).join("\n")}`;
      return error instanceof ContractError
        && safeEnvelope.includes(`${field} must not contain credential material`)
        && !safeEnvelope.includes(pasted);
    });
  }
});

test("contracts preserve ordinary prose and valid DataHub URNs", () => {
  const request = validateChangeRequest({
    ...fixtureRequest,
    rationale: "Never paste a token here; certify only the exact DataHub URN."
  });
  const approval = validateApproval({
    decision: "APPROVE",
    reviewer: "data-owner",
    note: `Approve staged migration for ${fixtureRequest.targetUrn}.`,
    scopeAccepted: true
  });
  assert.equal(request.targetUrn, fixtureRequest.targetUrn);
  assert.equal(approval.reviewer, "data-owner");
  assert.deepEqual(validateApproval({
    decision: "REJECT",
    reviewer: "data-owner",
    note: "Reject this scope pending owner review.",
    scopeAccepted: false
  }).scopeAccepted, false);
  assert.throws(() => validateApproval({
    decision: "REJECT",
    reviewer: "data-owner",
    note: "Reject this scope pending owner review.",
    scopeAccepted: true
  }), /Invalid approval/);
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
  assert.equal(run.evidence.find((item) => item.claim.includes("warehouse")).state, "NOT_RUN");
  assert.equal(run.evidence[0].state, "FIXTURE");
});

test("run ID binds normalized context, raw evidence, and the complete active policy", () => {
  const base = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const changedContext = analyzeChange({
    request: fixtureRequest,
    context: { ...fixtureContext, assets: fixtureContext.assets.map((asset, index) => index === 0 ? { ...asset, name: "changed" } : asset) },
    policy,
    mode: "fixture",
    now
  });
  const changedPolicy = analyzeChange({
    request: fixtureRequest,
    context: fixtureContext,
    policy: { ...policy, riskWeights: { ...policy.riskWeights, sensitiveData: policy.riskWeights.sensitiveData + 1 } },
    mode: "fixture",
    now
  });
  assert.match(base.runId, /^csr_[a-f0-9]{32}$/);
  assert.notEqual(changedContext.runId, base.runId);
  assert.notEqual(changedPolicy.runId, base.runId);
});

test("datahub mode cannot claim live context before MCP evidence arrives", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "datahub", now: new Date(fixtureContext.observedAt) });
  assert.equal(run.evidence.find((item) => item.claim === "DataHub context retrieved").state, "NOT_RUN");
  assert.equal(run.evidence.find((item) => item.claim === "Entity-level downstream impact traced").state, "NOT_RUN");
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
  assert.equal(approved.passport.artifactHashes.length, 4);
  assert.equal(approved.passport.evidence.find((item) => item.claim === "Human scope approval recorded").state, "PASS");
});

test("human rejection records an explicit non-authorizing passport", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const rejected = decideRun(run, {
    decision: "REJECT",
    reviewer: "data-owner",
    note: "Reject pending a narrower owner-approved scope.",
    scopeAccepted: false
  }, now);
  assert.equal(rejected.state, "REJECTED");
  assert.equal(rejected.approval.scopeAccepted, false);
  assert.equal(rejected.passport.status, "REJECTED");
  assert.throws(() => buildWritebackOperations(rejected, policy, now), (error) =>
    Array.isArray(error?.details)
      && error.details.some((detail) => /not approved|not CERTIFIED|approval/i.test(detail)));
});

test("write-back operations cannot be built before scoped approval", () => {
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  assert.throws(() => buildWritebackOperations(run, policy), /Certified passport is missing/);
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
  const run = analyzeChange({ request: fixtureRequest, context: fixtureContext, policy, mode: "fixture", now });
  const approved = decideRun(run, {
    decision: "APPROVE",
    reviewer: "data-owner",
    note: "Approve staged migration only.",
    scopeAccepted: true
  }, now);
  const operations = buildWritebackOperations(approved, policy, now);
  let calls = 0;
  const client = {
    async callTool() {
      calls += 1;
      if (calls === 2) throw new Error("catalog denied description");
      return { isError: false, structuredContent: { success: true } };
    }
  };
  await assert.rejects(
    () => executeWriteback(client, operations, { run: approved, policy, now }),
    (error) => error instanceof WritebackError && error.results.map((item) => item.status).join(",") === "PASS,FAIL"
  );
  assert.equal(calls, 2);
});
