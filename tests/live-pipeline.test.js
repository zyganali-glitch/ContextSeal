import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sha256 } from "../src/core/hash.js";
import { analyzeChange, decideRun } from "../src/core/workflow.js";
import { assertPassportValid, PassportVerificationError } from "../src/core/passport.js";
import { collectLiveEvidence, LiveContextError, normalizeLiveContext } from "../src/datahub/live-context.js";
import {
  buildWritebackOperations,
  collectWritebackReadback,
  executeWriteback,
  WritebackError
} from "../src/datahub/writeback.js";

const request = JSON.parse(await readFile("examples/retail-change-request.json", "utf8"));
const policy = JSON.parse(await readFile("config/policy.json", "utf8"));
const observedAt = "2026-07-14T12:00:00.000Z";
const now = new Date("2026-07-14T12:30:00.000Z");
const jobUrn = "urn:li:dataset:(urn:li:dataPlatform:airflow,customer_360.build_segments,PROD)";
const dashboardUrn = "urn:li:dataset:(urn:li:dataPlatform:looker,executive_customer_health,PROD)";

const targetEntity = {
  urn: request.targetUrn,
  type: "DATASET",
  name: "gold_customers",
  platform: { name: "snowflake" },
  ownership: { owners: [{ owner: { urn: "urn:li:corpuser:customer-data" } }] },
  tags: { tags: [{ tag: { urn: "urn:li:tag:PII" } }, { tag: { urn: "urn:li:tag:Tier1" } }] },
  health: [{ type: "INCIDENTS", status: "PASS" }],
  schemaMetadata: { fields: [{ fieldPath: "customer_email", nativeDataType: "varchar", nullable: false }] }
};
const jobEntity = {
  urn: jobUrn,
  type: "DATASET",
  name: "build_segments",
  platform: { name: "airflow" },
  ownership: { owners: [{ owner: { urn: "urn:li:corpuser:growth-data" } }] }
};
const dashboardEntity = {
  urn: dashboardUrn,
  type: "DATASET",
  name: "Executive Customer Health",
  platform: { name: "looker" },
  ownership: { owners: [{ owner: { urn: "urn:li:corpuser:analytics" } }] }
};

function rawEvidence(overrides = {}) {
  const authoritativeSchemaFields = overrides.schemaFields || [
    { fieldPath: "customer_email", nativeDataType: "varchar", nullable: false }
  ];
  const values = [
    {
      tool: "get_entities",
      arguments: { urns: [request.targetUrn] },
      payload: { result: [overrides.targetEntity || targetEntity] }
    },
    {
      tool: "list_schema_fields",
      arguments: { urn: request.targetUrn, limit: 100, offset: 0 },
      payload: {
        urn: request.targetUrn,
        fields: authoritativeSchemaFields,
        totalFields: authoritativeSchemaFields.length,
        returned: authoritativeSchemaFields.length,
        remainingCount: 0,
        matchingCount: null,
        offset: 0
      }
    },
    {
      tool: "get_lineage",
      arguments: { urn: request.targetUrn, upstream: false, max_hops: 5, max_results: 100 },
      payload: { downstreams: { total: 2, searchResults: [{ entity: jobEntity, degree: 1 }, { entity: dashboardEntity, degree: 2 }], hasMore: false } }
    },
    {
      tool: "get_lineage_paths_between",
      arguments: { source_urn: request.targetUrn, target_urn: jobUrn, direction: "downstream" },
      payload: { source: request.targetUrn, target: jobUrn, pathCount: 1, paths: [{ path: [{ urn: request.targetUrn, type: "DATASET" }, { urn: jobUrn, type: "DATASET" }] }] }
    },
    {
      tool: "get_lineage_paths_between",
      arguments: { source_urn: request.targetUrn, target_urn: dashboardUrn, direction: "downstream" },
      payload: { source: request.targetUrn, target: dashboardUrn, pathCount: 1, paths: [{ path: [{ urn: request.targetUrn, type: "DATASET" }, { urn: jobUrn, type: "DATASET" }, { urn: dashboardUrn, type: "DATASET" }] }] }
    },
    {
      tool: "get_dataset_queries",
      arguments: { urn: request.targetUrn },
      payload: { total: 1, queries: [{ queryId: "q-1", datasetUrn: request.targetUrn, sql: "select customer_email from gold_customers" }] }
    }
  ];
  return overrides.evidence || values;
}

function normalizedBundle(overrides = {}) {
  const evidence = rawEvidence(overrides);
  const rawEvidenceHash = sha256(evidence);
  const normalized = normalizeLiveContext({
    targetUrn: request.targetUrn,
    sourceField: request.sourceField,
    changeType: request.changeType,
    destinationField: request.destinationField,
    maxHops: 5,
    observedAt,
    evidence,
    rawEvidenceHash
  });
  return {
    context: normalized.normalizedContext,
    liveEvidence: {
      observedAt,
      targetUrn: request.targetUrn,
      rawEvidenceHash,
      mcp: { protocolVersion: "2025-03-26", serverInfo: { name: "datahub", version: "test" } },
      summary: normalized.summary,
      tools: normalized.toolTypes,
      evidence,
      evidenceBoundary: "test live evidence"
    }
  };
}

function approvedLiveRun(activePolicy = policy) {
  const { context, liveEvidence } = normalizedBundle();
  const run = analyzeChange({ request, context, policy: activePolicy, mode: "datahub", liveEvidence, now });
  return decideRun(run, {
    decision: "APPROVE",
    reviewer: "data-owner",
    note: "Approve the exact staged migration only.",
    scopeAccepted: true
  }, now);
}

test("live MCP evidence normalizes exact paths and observed queries into decision context", () => {
  const { context, liveEvidence } = normalizedBundle();
  assert.equal(context.evidenceBoundary, "LIVE_DATAHUB_MCP_NORMALIZED");
  assert.equal(context.assets.length, 3);
  assert.deepEqual(context.edges.map((edge) => `${edge.from}->${edge.to}`), [
    `${request.targetUrn}->${jobUrn}`,
    `${jobUrn}->${dashboardUrn}`
  ]);
  assert.equal(context.queries[0].id, "q-1");
  assert.equal(liveEvidence.summary.pathTargetCount, 2);

  const run = analyzeChange({ request, context, policy, mode: "datahub", liveEvidence, now });
  assert.equal(run.impact.counts.total, 2);
  assert.equal(run.risk.findings.some((item) => item.code === "LIVE_QUERY_USAGE"), true);
  assert.equal(run.evidence.find((item) => item.claim === "DataHub context retrieved").state, "PASS");
  assert.equal(run.evidence.find((item) => item.claim === "Target field validated in schema").state, "PASS");
});

test("collector records MCP initialization provenance and obtains an exact path for every discovered asset", async () => {
  const evidence = rawEvidence();
  let index = 0;
  const client = {
    async initialize() { return { protocolVersion: "2025-03-26", serverInfo: { name: "datahub-mcp", version: "test" } }; },
    provenance() { return { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" }; },
    async callTool(tool, args) {
      const expected = evidence[index++];
      assert.equal(tool, expected.tool);
      assert.deepEqual(args, expected.arguments);
      return { isError: false, structuredContent: expected.payload };
    }
  };
  const collected = await collectLiveEvidence(client, request, { now, maxHops: 5, maxResults: 100 });
  assert.equal(collected.evidence.length, 6);
  assert.equal(collected.summary.schemaFieldCount, 1);
  assert.equal(collected.summary.downstreamAssetCount, 2);
  assert.equal(collected.mcp.serverInfo.version, "test");
  assert.deepEqual(collected.mcp.launcher, { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" });
  assert.equal(collected.rawEvidenceHash, sha256(collected.evidence));
});

test("collector paginates the authoritative schema until counts prove completeness", async () => {
  const evidence = rawEvidence();
  const schemaFields = [
    { fieldPath: request.sourceField, type: "STRING" },
    { fieldPath: "customer_id", type: "STRING" }
  ];
  evidence.splice(1, 1,
    {
      tool: "list_schema_fields",
      arguments: { urn: request.targetUrn, limit: 1, offset: 0 },
      payload: {
        urn: request.targetUrn,
        fields: [schemaFields[0]],
        totalFields: 2,
        returned: 1,
        remainingCount: 1,
        matchingCount: null,
        offset: 0
      }
    },
    {
      tool: "list_schema_fields",
      arguments: { urn: request.targetUrn, limit: 1, offset: 1 },
      payload: {
        urn: request.targetUrn,
        fields: [schemaFields[1]],
        totalFields: 2,
        returned: 1,
        remainingCount: 0,
        matchingCount: null,
        offset: 1
      }
    });
  let index = 0;
  const client = {
    async initialize() { return { protocolVersion: "2025-03-26", serverInfo: { name: "datahub-mcp", version: "test" } }; },
    provenance() { return { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" }; },
    async callTool(tool, args) {
      const expected = evidence[index++];
      assert.equal(tool, expected.tool);
      assert.deepEqual(args, expected.arguments);
      return { isError: false, structuredContent: expected.payload };
    }
  };
  const collected = await collectLiveEvidence(client, request, {
    now,
    maxHops: 5,
    maxResults: 100,
    schemaPageSize: 1,
    maxSchemaFields: 10
  });
  assert.equal(collected.summary.schemaFieldCount, 2);
  assert.equal(collected.summary.schemaPageCount, 2);
  assert.deepEqual(collected.normalizedContext.assets[0].schemaFields.map((field) => field.fieldPath), [request.sourceField, "customer_id"]);
});

test("collector rejects credential-like MCP payloads before they enter evidence", async () => {
  const evidence = structuredClone(rawEvidence());
  const pasted = ["github", "pat", "Z9".repeat(16)].join("_");
  evidence.at(-1).payload.queries[0].sql = `select '${pasted}'`;
  let index = 0;
  const client = {
    async initialize() { return { protocolVersion: "2025-03-26", serverInfo: { name: "datahub-mcp", version: "test" } }; },
    provenance() { return { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" }; },
    async callTool() {
      const expected = evidence[index++];
      return { isError: false, structuredContent: expected.payload };
    }
  };
  await assert.rejects(
    () => collectLiveEvidence(client, request, { now, maxHops: 5, maxResults: 100 }),
    (error) => error instanceof LiveContextError
      && /credential-like material/.test(error.message)
      && !error.message.includes(pasted)
  );
});

test("live normalization fails closed on target mismatch, absent authoritative source field, and incomplete path coverage", () => {
  const wrongTarget = { ...targetEntity, urn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,wrong,PROD)" };
  assert.throws(() => normalizedBundle({ targetEntity: wrongTarget }), LiveContextError);
  assert.throws(() => normalizedBundle({ schemaFields: [{ fieldPath: "customer_id" }] }), /absent from the live target schema/);
  assert.throws(() => normalizedBundle({ evidence: rawEvidence().filter((item) => !(item.tool === "get_lineage_paths_between" && item.arguments.target_urn === dashboardUrn)) }), /path coverage/);
  assert.throws(() => normalizeLiveContext({
    targetUrn: request.targetUrn,
    sourceField: request.sourceField,
    changeType: request.changeType,
    destinationField: request.destinationField,
    maxHops: 5,
    observedAt,
    evidence: rawEvidence(),
    rawEvidenceHash: "0".repeat(64)
  }), /rawEvidenceHash/);
});

test("live normalization rejects truncated schema pages and collisions hidden from get_entities", () => {
  const truncated = structuredClone(rawEvidence());
  truncated[1].payload.totalFields = 2;
  truncated[1].payload.remainingCount = 1;
  assert.throws(() => normalizedBundle({ evidence: truncated }), /pagination is incomplete/);

  assert.throws(() => normalizedBundle({
    schemaFields: [
      { fieldPath: request.sourceField },
      { fieldPath: request.destinationField }
    ]
  }), /destination already exists/);

  const noEntitySchema = normalizedBundle({ targetEntity: { ...targetEntity, schemaMetadata: undefined } });
  assert.deepEqual(noEntitySchema.context.assets[0].schemaFields.map((field) => field.fieldPath), [request.sourceField]);
});

test("live normalization enforces maxHops and exact discovery-to-traceImpact scope equality", () => {
  const tooDeep = structuredClone(rawEvidence());
  tooDeep[4].payload.paths[0].path = [
    { urn: request.targetUrn, type: "DATASET" },
    { urn: jobUrn, type: "DATASET" },
    ...Array.from({ length: 4 }, (_, index) => ({
      urn: `urn:li:dataset:(urn:li:dataPlatform:snowflake,intermediate_${index},PROD)`,
      type: "DATASET"
    })),
    { urn: dashboardUrn, type: "DATASET" }
  ];
  assert.throws(() => normalizedBundle({ evidence: tooDeep }), /exceeds requested maxHops 5/);

  const undiscoveredIntermediate = structuredClone(rawEvidence());
  undiscoveredIntermediate[4].payload.paths[0].path = [
    { urn: request.targetUrn, type: "DATASET" },
    { urn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,hidden_intermediate,PROD)", type: "DATASET" },
    { urn: dashboardUrn, type: "DATASET" }
  ];
  assert.throws(() => normalizedBundle({ evidence: undiscoveredIntermediate }), /traceImpact scope and hop bounds/);
});

test("live PASS claims require summary, endpoint, impact, and policy hop bounds to agree", () => {
  for (const mutate of [
    (liveEvidence) => { liveEvidence.summary.downstreamAssetCount = 1; },
    (liveEvidence) => { liveEvidence.summary.pathTargetCount = 1; }
  ]) {
    const { context, liveEvidence } = normalizedBundle();
    mutate(liveEvidence);
    const run = analyzeChange({ request, context, policy, mode: "datahub", liveEvidence, now });
    assert.equal(run.impact.counts.total, 2);
    assert.equal(run.evidence.find((item) => item.claim === "DataHub context retrieved").state, "NOT_RUN");
    assert.equal(run.evidence.find((item) => item.claim === "Downstream impact paths traced").state, "NOT_RUN");
  }
});

test("live normalization rejects incomplete lineage and uninspectable query evidence", () => {
  const mutations = [
    (evidence) => { evidence[2].payload.downstreams.hasMore = true; },
    (evidence) => { evidence[2].payload.downstreams.hasMore = "false"; },
    (evidence) => { evidence[2].payload.downstreams.total = 3; },
    (evidence) => { evidence[2].payload.downstreams.returned = 1; },
    (evidence) => { evidence[3].payload.pathCount = 2; },
    (evidence) => { evidence.at(-1).payload.hasMore = true; },
    (evidence) => { evidence.at(-1).payload.total = null; },
    (evidence) => { evidence.at(-1).payload.total = 2; },
    (evidence) => { delete evidence.at(-1).payload.queries[0].sql; }
  ];
  for (const mutate of mutations) {
    const evidence = structuredClone(rawEvidence());
    mutate(evidence);
    assert.throws(() => normalizedBundle({ evidence }), LiveContextError);
  }
});

test("query normalization supports DataHub query entities and verifies subjects", () => {
  const evidence = structuredClone(rawEvidence());
  evidence.at(-1).payload.queries = [{
    urn: "urn:li:query:query-123",
    subjects: [request.targetUrn],
    properties: {
      statement: { value: "select customer_email from gold_customers" },
      source: { value: "MANUAL" }
    }
  }];
  const { context } = normalizedBundle({ evidence });
  assert.equal(context.queries[0].id, "urn:li:query:query-123");
  assert.equal(context.queries[0].source, "MANUAL");

  evidence.at(-1).payload.queries[0].subjects = [dashboardUrn];
  assert.throws(() => normalizedBundle({ evidence }), /not bound to the requested dataset/);
});

test("live schema validation rejects unsafe generated-field collisions", () => {
  assert.throws(() => normalizeLiveContext({
    targetUrn: request.targetUrn,
    sourceField: request.sourceField,
    changeType: "rename_column",
    destinationField: request.sourceField,
    maxHops: 5,
    observedAt,
    evidence: rawEvidence()
  }), /must differ/);
  assert.throws(() => normalizeLiveContext({
    targetUrn: request.targetUrn,
    sourceField: request.sourceField,
    changeType: "rename_column",
    destinationField: "customer_id",
    maxHops: 5,
    observedAt,
    evidence: rawEvidence({ schemaFields: [{ fieldPath: request.sourceField }, { fieldPath: "customer_id" }] })
  }), /already exists/);
  assert.throws(() => normalizeLiveContext({
    targetUrn: request.targetUrn,
    sourceField: request.sourceField,
    changeType: "type_change",
    maxHops: 5,
    observedAt,
    evidence: rawEvidence({ schemaFields: [{ fieldPath: request.sourceField }, { fieldPath: `${request.sourceField}_typed` }] })
  }), /already exists/);
});

test("passport v2 binds policy, normalized context, raw MCP evidence, artifacts, and PASS approval", () => {
  const run = approvedLiveRun();
  assert.equal(run.passport.passportVersion, "2.0");
  assert.equal(run.passport.policy.version, policy.policyVersion);
  assert.equal(run.passport.liveEvidence.rawEvidenceHash, sha256(run.liveEvidence.evidence));
  assert.equal(run.passport.liveEvidence.tools.includes("list_schema_fields"), true);
  assert.equal(run.passport.liveEvidence.summary.maxHops, policy.impactMaxHops);
  assert.equal(run.passport.evidence.find((item) => item.claim === "Human scope approval recorded").state, "PASS");
  assert.equal(assertPassportValid(run, policy, now).valid, true);
});

test("run ID changes when same-millisecond raw MCP evidence changes", () => {
  const base = normalizedBundle();
  const changedEvidence = structuredClone(rawEvidence());
  changedEvidence.at(-1).payload.queries[0].sql = "select upper(customer_email) from gold_customers";
  const changed = normalizedBundle({ evidence: changedEvidence });
  const first = analyzeChange({ request, context: base.context, policy, mode: "datahub", liveEvidence: base.liveEvidence, now });
  const second = analyzeChange({ request, context: changed.context, policy, mode: "datahub", liveEvidence: changed.liveEvidence, now });
  assert.equal(first.createdAt, second.createdAt);
  assert.notEqual(first.runId, second.runId);
});

test("mutation gate rejects self-reissued hashes for context not derived from raw MCP evidence", () => {
  for (const tamper of [
    (run) => { run.context.edges = []; },
    (run) => { run.context.queries = []; }
  ]) {
    const run = structuredClone(approvedLiveRun());
    tamper(run);
    const { passportId: _oldId, manifestHash: _oldHash, ...body } = run.passport;
    body.contextHash = sha256(run.context);
    const manifestHash = sha256(body);
    run.passport = { ...body, passportId: `csp_${manifestHash.slice(0, 20)}`, manifestHash };
    assert.throws(
      () => buildWritebackOperations(run, policy, now),
      (error) => error instanceof PassportVerificationError
        && error.details.some((detail) => detail.includes("normalized live context"))
    );
  }
});

test("mutation gate rejects every tampered decision input and expired passports", () => {
  const cases = [
    (run) => { run.liveEvidence.evidence[0].payload.result[0].name = "tampered"; },
    (run) => { run.request.targetUrn = "urn:li:dataset:(urn:li:dataPlatform:snowflake,wrong,PROD)"; },
    (run) => { run.runId = "csr_tampered"; },
    (run) => { run.createdAt = "2026-07-14T12:01:00.000Z"; },
    (run) => { run.mode = "fixture"; },
    (run) => { run.risk.score = 0; },
    (run) => { run.risk.findings = []; },
    (run) => { run.risk.findings[0].message = "Tampered risk explanation."; },
    (run) => { run.impact.counts.total = 0; },
    (run) => { run.impact.impacted[0].hops = 99; },
    (run) => { run.artifacts.strategy = "DIRECT_RENAME"; },
    (run) => { run.artifacts.summary = "A changed unbound description."; },
    (run) => { run.approval.note = "Tampered decision note."; },
    (run) => { run.approval.decidedAt = "2026-07-14T12:59:00.000Z"; },
    (run) => { run.approval.scopeAccepted = false; },
    (run) => { run.liveEvidence.mcp.serverInfo.version = "tampered"; },
    (run) => { run.liveEvidence.summary.pathCount = 0; },
    (run) => { run.passport.validUntil = "2026-07-14T12:00:01.000Z"; }
  ];
  for (const mutate of cases) {
    const run = structuredClone(approvedLiveRun());
    mutate(run);
    assert.throws(() => buildWritebackOperations(run, policy, new Date("2026-07-15T12:01:00.000Z")), PassportVerificationError);
  }
  const run = approvedLiveRun();
  assert.throws(() => buildWritebackOperations(run, { ...policy, policyVersion: "changed" }, now), /Passport verification failed/);
});

test("mutation executor revalidates certification and requires explicit success receipts", async () => {
  const run = approvedLiveRun();
  const operations = buildWritebackOperations(run, policy, now);
  let calls = 0;
  const client = {
    async callTool() {
      calls += 1;
      return calls === 2
        ? { isError: false, structuredContent: { success: false } }
        : { isError: false, structuredContent: { success: true } };
    }
  };
  await assert.rejects(
    () => executeWriteback(client, operations, { run, policy, now }),
    (error) => error instanceof WritebackError && error.results.map((item) => item.status).join(",") === "PASS,FAIL"
  );
  assert.equal(calls, 2);
});

test("mutation receipts are minimized and credential-bearing results fail closed without echo", async () => {
  const run = approvedLiveRun();
  const operations = buildWritebackOperations(run, policy, now);
  const receipts = await executeWriteback({
    async callTool(tool) {
      return {
        isError: false,
        structuredContent: {
          success: true,
          message: "remote diagnostic that must not be persisted",
          ...(tool === "save_document" ? { urn: "urn:li:document:minimized-receipt" } : {})
        }
      };
    }
  }, operations, { run, policy, now });
  assert.deepEqual(receipts.map((item) => item.result), [
    { isError: false, structuredContent: { success: true } },
    { isError: false, structuredContent: { success: true } },
    { isError: false, structuredContent: { success: true, urn: "urn:li:document:minimized-receipt" } }
  ]);
  assert.equal(JSON.stringify(receipts).includes("remote diagnostic"), false);

  const pasted = ["github", "pat", "K4".repeat(16)].join("_");
  await assert.rejects(
    () => executeWriteback({
      async callTool() {
        return { isError: false, structuredContent: { success: true, diagnostic: pasted } };
      }
    }, operations, { run, policy, now }),
    (error) => {
      assert.equal(error instanceof WritebackError, true);
      assert.equal(JSON.stringify(error).includes(pasted), false);
      assert.deepEqual(error.results, [{
        tool: "add_structured_properties",
        status: "FAIL",
        error: "DataHub MCP mutation failed; external detail was withheld."
      }]);
      return true;
    }
  );
});

test("write-back rejects every non-canonical operation field and resists TOCTOU mutation", async () => {
  const run = approvedLiveRun();
  const mutations = [
    (operations) => { operations[0].arguments.entity_urns.push(dashboardUrn); },
    (operations) => { operations[0].arguments.property_values["urn:li:structuredProperty:unexpected"] = ["x"]; },
    (operations) => { operations[1].arguments.operation = "overwrite"; },
    (operations) => { operations[1].arguments.description += " altered"; },
    (operations) => { operations[2].arguments.document_type = "Knowledge"; },
    (operations) => { operations[2].arguments.topics = ["contextseal"]; },
    (operations) => { operations[2].arguments.unexpected = true; }
  ];
  for (const mutate of mutations) {
    const operations = structuredClone(buildWritebackOperations(run, policy, now));
    mutate(operations);
    let calls = 0;
    await assert.rejects(() => executeWriteback({ async callTool() { calls += 1; } }, operations, { run, policy, now }), /content has changed/);
    assert.equal(calls, 0);
  }

  const operations = buildWritebackOperations(run, policy, now);
  const received = [];
  const client = {
    async callTool(tool, args) {
      received.push({ tool, args: structuredClone(args) });
      if (received.length === 1) operations[1].arguments.operation = "overwrite";
      return { isError: false, structuredContent: { success: true } };
    }
  };
  await executeWriteback(client, operations, { run, policy, now });
  assert.equal(received[1].args.operation, "append");
});

test("write-back enforces supported changes and the structured-property allowlist", () => {
  const unsupportedPolicy = { ...policy, supportedChanges: ["drop_column"] };
  const unsupportedRun = approvedLiveRun(unsupportedPolicy);
  assert.throws(() => buildWritebackOperations(unsupportedRun, unsupportedPolicy, now), /does not permit/);

  const subsetPolicy = {
    ...policy,
    writeback: { ...policy.writeback, structuredProperties: ["io.contextseal.passportId"] }
  };
  const subsetRun = approvedLiveRun(subsetPolicy);
  const operations = buildWritebackOperations(subsetRun, subsetPolicy, now);
  assert.deepEqual(Object.keys(operations[0].arguments.property_values), ["urn:li:structuredProperty:io.contextseal.passportId"]);

  const unknownPropertyPolicy = {
    ...policy,
    writeback: { ...policy.writeback, structuredProperties: ["io.contextseal.unknown"] }
  };
  const unknownPropertyRun = approvedLiveRun(unknownPropertyPolicy);
  assert.throws(() => buildWritebackOperations(unknownPropertyRun, unknownPropertyPolicy, now), /unsupported ContextSeal structured properties/);
});

function mutationReceipts(run) {
  return [
    { tool: "add_structured_properties", status: "PASS", result: { isError: false, structuredContent: { success: true } } },
    { tool: "update_description", status: "PASS", result: { isError: false, structuredContent: { success: true } } },
    {
      tool: "save_document",
      status: "PASS",
      result: { isError: false, structuredContent: { success: true, urn: "urn:li:document:passport-test" } }
    }
  ];
}

function readbackClient(run, { wrongTitle = false, irrelevantExcerpt = false } = {}) {
  return {
    async callTool(tool) {
      if (tool === "get_entities") {
        return {
          isError: false,
          structuredContent: {
            result: [{
              urn: run.request.targetUrn,
              editableProperties: { description: `Certified by ${run.passport.passportId}` },
              structuredProperties: {
                properties: Object.entries({
                  "urn:li:structuredProperty:io.contextseal.status": "CERTIFIED",
                  "urn:li:structuredProperty:io.contextseal.riskScore": run.risk.score,
                  "urn:li:structuredProperty:io.contextseal.passportId": run.passport.passportId,
                  "urn:li:structuredProperty:io.contextseal.validUntil": run.passport.validUntil.slice(0, 10)
                }).map(([propertyUrn, value]) => ({
                  structuredProperty: { urn: propertyUrn },
                  values: [typeof value === "number" ? { numberValue: value } : { stringValue: value }]
                }))
              }
            }]
          }
        };
      }
      if (tool === "grep_documents") {
        return {
          isError: false,
          structuredContent: {
            results: [{
              urn: "urn:li:document:passport-test",
              title: wrongTitle ? "A different passport" : `Change Passport ${run.passport.passportId}`,
              total_matches: 1,
              matches: [{
                excerpt: irrelevantExcerpt
                  ? "irrelevant content"
                  : `${run.passport.passportId} ${run.passport.manifestHash} ${run.request.targetUrn}`,
                position: 1
              }]
            }],
            total_matches: 1,
            documents_with_matches: 1
          }
        };
      }
      throw new Error(`unexpected tool ${tool}`);
    }
  };
}

test("post-write read-back verifies target properties, description, and exact receipt document content", async () => {
  const run = approvedLiveRun();
  const readback = await collectWritebackReadback(readbackClient(run), run, mutationReceipts(run), { policy, now });
  assert.equal(readback.state, "PASS");
  assert.equal(readback.verified.structuredProperties.state, "PASS");
  assert.equal(readback.verified.description.state, "PASS");
  assert.equal(readback.verified.relatedDocument.state, "PASS");
  assert.equal(readback.verified.relatedDocument.verificationScope, "EXACT_URN_TITLE_AND_LITERAL_BINDINGS");
  assert.equal(readback.evidence.filter((item) => item.tool === "grep_documents").length, 3);
});

test("post-write read-back rejects credential-bearing MCP payloads without retaining them", async () => {
  const run = approvedLiveRun();
  const healthy = readbackClient(run);
  const pasted = ["github", "pat", "L5".repeat(16)].join("_");
  const client = {
    async callTool(tool, args) {
      if (tool === "get_entities") {
        return {
          isError: false,
          structuredContent: { result: [{ urn: run.request.targetUrn }], diagnostic: pasted }
        };
      }
      return healthy.callTool(tool, args);
    }
  };
  const readback = await collectWritebackReadback(client, run, mutationReceipts(run), {
    policy,
    now,
    maxAttempts: 1
  });
  assert.equal(readback.state, "FAIL");
  assert.equal(JSON.stringify(readback).includes(pasted), false);
  const entityEvidence = readback.evidence.find((item) => item.tool === "get_entities");
  assert.equal(entityEvidence.state, "FAIL");
  assert.equal("payload" in entityEvidence, false);
});

test("post-write read-back rejects a fuzzy document match with the wrong exact title", async () => {
  const run = approvedLiveRun();
  const readback = await collectWritebackReadback(readbackClient(run, { wrongTitle: true }), run, mutationReceipts(run), {
    policy,
    now,
    retryDelayMs: 0
  });
  assert.equal(readback.state, "FAIL");
  assert.equal(readback.verified.relatedDocument.state, "FAIL");
});

test("post-write document binding rejects irrelevant grep excerpts", async () => {
  const run = approvedLiveRun();
  const readback = await collectWritebackReadback(readbackClient(run, { irrelevantExcerpt: true }), run, mutationReceipts(run), {
    policy,
    now,
    maxAttempts: 1
  });
  assert.equal(readback.state, "FAIL");
  assert.deepEqual(readback.verified.relatedDocument.verified, { passportId: false, manifestHash: false, targetUrn: false });
});

test("post-write verification retries bounded read-only reads and preserves attempt evidence", async () => {
  const run = approvedLiveRun();
  const healthy = readbackClient(run);
  let targetReads = 0;
  const client = {
    async callTool(tool, args) {
      if (tool === "get_entities" && targetReads++ === 0) {
        return { isError: false, structuredContent: { result: [{ urn: run.request.targetUrn }] } };
      }
      return healthy.callTool(tool, args);
    }
  };
  const readback = await collectWritebackReadback(client, run, mutationReceipts(run), {
    policy,
    now,
    maxAttempts: 2,
    retryDelayMs: 0
  });
  assert.equal(readback.state, "PASS");
  assert.equal(readback.attemptCount, 2);
  assert.deepEqual(readback.attempts.map((attempt) => attempt.state), ["FAIL", "PASS"]);
  assert.equal(targetReads, 2);
});
