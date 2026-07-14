import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sha256 } from "../src/core/hash.js";
import { analyzeChange, decideRun } from "../src/core/workflow.js";
import { normalizeLiveContext } from "../src/datahub/live-context.js";
import { EvidenceValidationError, validateEvidenceBundle } from "../scripts/validate-evidence.js";

const targetUrn = "urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.gold.customers,PROD)";
const downstreamUrn = "urn:li:dataset:(urn:li:dataPlatform:snowflake,retail.analytics.customer_segments,PROD)";
const policy = JSON.parse(await readFile("config/policy.json", "utf8"));

function calls(entity) {
  return [
    {
      tool: "get_entities",
      arguments: { urns: [targetUrn] },
      payload: { result: [entity] }
    },
    {
      tool: "list_schema_fields",
      arguments: { urn: targetUrn, limit: 100, offset: 0 },
      payload: {
        urn: targetUrn,
        fields: [{ fieldPath: "customer_email", type: "STRING" }],
        totalFields: 1,
        returned: 1,
        remainingCount: 0,
        matchingCount: null,
        offset: 0
      }
    },
    {
      tool: "get_lineage",
      arguments: { urn: targetUrn, upstream: false, max_hops: 5, max_results: 100 },
      payload: { downstreams: { total: 1, returned: 1, hasMore: false, searchResults: [{ entity: { urn: downstreamUrn } }] } }
    },
    {
      tool: "get_lineage_paths_between",
      arguments: { source_urn: targetUrn, target_urn: downstreamUrn, direction: "downstream" },
      payload: { source: targetUrn, target: downstreamUrn, pathCount: 1, paths: [{ path: [targetUrn, downstreamUrn] }] }
    },
    {
      tool: "get_dataset_queries",
      arguments: { urn: targetUrn },
      payload: { start: 0, total: 0, count: 10, results: [] }
    }
  ];
}

function validBundle() {
  const request = {
    targetUrn,
    entityName: "gold_customers",
    changeType: "rename_column",
    sourceField: "customer_email",
    destinationField: "contact_email",
    destinationType: null,
    requestedBy: "test-owner",
    rationale: "Test the complete evidence chain."
  };
  const baseEntity = {
    urn: targetUrn,
    type: "DATASET",
    name: "gold_customers",
    properties: {
      customProperties: [
        { key: "contextseal_fixture", value: "true" },
        { key: "evidence_boundary", value: "synthetic-local" }
      ]
    },
    schemaMetadata: { fields: [{ fieldPath: "customer_email", nativeDataType: "varchar" }] }
  };
  const rawCalls = calls(baseEntity);
  const rawEvidenceHash = sha256(rawCalls);
  const mcp = {
    protocolVersion: "2025-03-26",
    serverInfo: { name: "test-datahub", version: "1.0.0" },
    launcher: { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" }
  };
  const observedAt = "2026-07-14T12:00:00.000Z";
  const normalized = normalizeLiveContext({
    targetUrn,
    sourceField: request.sourceField,
    changeType: request.changeType,
    destinationField: request.destinationField,
    maxHops: policy.impactMaxHops,
    observedAt,
    evidence: rawCalls,
    rawEvidenceHash
  });
  const liveEvidence = {
    observedAt,
    targetUrn,
    rawEvidenceHash,
    mcp,
    summary: normalized.summary,
    tools: normalized.toolTypes,
    evidence: rawCalls,
    evidenceBoundary: "test live evidence"
  };
  const analyzed = analyzeChange({
    request,
    context: normalized.normalizedContext,
    policy,
    mode: "datahub",
    liveEvidence,
    now: new Date("2026-07-14T12:00:30.000Z")
  });
  const approved = decideRun(analyzed, {
    decision: "APPROVE",
    reviewer: "data-owner",
    note: "Approved safe staged migration.",
    scopeAccepted: true
  }, new Date("2026-07-14T12:02:00.000Z"));
  const passport = approved.passport;
  const finalEntity = {
    ...baseEntity,
    editableProperties: { description: `Certified safe plan ${passport.passportId}` },
    structuredProperties: {
      properties: [
        { structuredProperty: { definition: { qualifiedName: "io.contextseal.status" } }, values: [{ stringValue: "CERTIFIED" }] },
        { structuredProperty: { definition: { qualifiedName: "io.contextseal.riskScore" } }, values: [{ numberValue: approved.risk.score }] },
        { structuredProperty: { definition: { qualifiedName: "io.contextseal.passportId" } }, values: [{ stringValue: passport.passportId }] },
        { structuredProperty: { definition: { qualifiedName: "io.contextseal.validUntil" } }, values: [{ stringValue: "2026-07-15" }] }
      ]
    },
    relatedDocuments: { documents: [{ info: { title: `Change Passport ${passport.passportId}` } }] }
  };
  const savedDocumentUrn = "urn:li:document:contextseal-test";
  const mutationReceipts = ["add_structured_properties", "update_description", "save_document"].map((tool) => ({
    tool,
    status: "PASS",
    result: { isError: false, structuredContent: { success: true, ...(tool === "save_document" ? { urn: savedDocumentUrn } : {}) } }
  }));
  const readbackEvidence = [
    { tool: "get_entities", arguments: { urns: [targetUrn] }, state: "PASS", payload: { result: [finalEntity] } },
    ...Object.entries({ passportId: passport.passportId, manifestHash: passport.manifestHash, targetUrn }).map(([binding, literal]) => ({
      tool: "grep_documents",
      arguments: { urns: [savedDocumentUrn], pattern: literal },
      state: "PASS",
      payload: {
        results: [{
          urn: savedDocumentUrn,
          title: `Change Passport ${passport.passportId}`,
          total_matches: 1,
          matches: [{ excerpt: `exact ${binding}: ${literal}` }]
        }]
      }
    }))
  ];
  const run = {
    ...approved,
    state: "CERTIFIED_AND_WRITTEN_BACK",
    evidence: approved.evidence.map((item) => ["DataHub write-back completed", "Durable DataHub read-back verified"].includes(item.claim)
      ? { ...item, state: "PASS", artifact: "verified readback" }
      : item),
    writeback: {
      startedAt: "2026-07-14T12:02:30.000Z",
      at: "2026-07-14T12:03:00.000Z",
      mutationsCompletedAt: "2026-07-14T12:03:00.000Z",
      completedAt: "2026-07-14T12:04:15.000Z",
      mutationReceipts,
      readback: {
        state: "PASS",
        observedAt: "2026-07-14T12:04:00.000Z",
        targetUrn,
        verified: {
          structuredProperties: { state: "PASS", properties: [] },
          description: { state: "PASS", passportIdPresent: true },
          relatedDocument: {
            state: "PASS",
            urn: savedDocumentUrn,
            title: `Change Passport ${passport.passportId}`,
            verificationScope: "EXACT_URN_TITLE_AND_LITERAL_BINDINGS",
            verified: { passportId: true, manifestHash: true, targetUrn: true }
          }
        },
        evidence: readbackEvidence,
        attemptCount: 1,
        attempts: []
      }
    }
  };
  const finalCalls = calls(finalEntity);
  const finalObservedAt = "2026-07-14T12:04:30.000Z";
  const finalHash = sha256(finalCalls);
  const finalNormalized = normalizeLiveContext({
    targetUrn,
    sourceField: request.sourceField,
    changeType: request.changeType,
    destinationField: request.destinationField,
    maxHops: policy.impactMaxHops,
    observedAt: finalObservedAt,
    evidence: finalCalls,
    rawEvidenceHash: finalHash
  });
  return {
    policy,
    writebackEvidence: {
      evidenceBoundary: "Disposable local DataHub with synthetic metadata; no production or customer data.",
      exportedAt: "2026-07-14T12:05:00.000Z",
      run
    },
    readEvidence: {
      status: "PASS",
      contextsealMutationGateEnabled: false,
      observedAt: finalObservedAt,
      targetUrn,
      rawEvidenceHash: finalHash,
      mcp,
      tools: finalNormalized.toolTypes,
      summary: finalNormalized.summary,
      evidenceBoundary: "Post-write capture of the synthetic local target; no production data.",
      evidence: finalCalls
    }
  };
}

test("structural evidence validator accepts a complete hash-bound read/write/readback chain", () => {
  const result = validateEvidenceBundle(validBundle());
  assert.equal(result.downstreamAssets, 1);
  assert.equal(result.mcpCalls, 5);
  assert.equal(result.mutationReceipts, 3);
});

test("structural evidence validator requires sanitized pinned launcher provenance", () => {
  const bundle = validBundle();
  bundle.readEvidence.mcp.launcher = { transport: "stdio", launcherPackage: null };
  assert.throws(
    () => validateEvidenceBundle(bundle),
    (error) => error instanceof EvidenceValidationError
      && error.details.some((item) => item.includes("mcp-server-datahub@0.6.0"))
  );
});

test("structural evidence validator rejects impossible write-back and export chronology", () => {
  const observationAfterRunCreation = validBundle();
  observationAfterRunCreation.writebackEvidence.run.liveEvidence.observedAt = "2026-07-14T12:00:31.000Z";
  assert.throws(
    () => validateEvidenceBundle(observationAfterRunCreation),
    (error) => error instanceof EvidenceValidationError
      && error.details.some((item) => item.includes("observe/create/approve/start/mutate/readback/complete"))
  );

  const readbackBeforeMutation = validBundle();
  readbackBeforeMutation.writebackEvidence.run.writeback.readback.observedAt = "2026-07-14T12:02:59.000Z";
  assert.throws(
    () => validateEvidenceBundle(readbackBeforeMutation),
    (error) => error instanceof EvidenceValidationError
      && error.details.some((item) => item.includes("observe/create/approve/start/mutate/readback/complete"))
  );

  const captureBeforeCompletion = validBundle();
  captureBeforeCompletion.readEvidence.observedAt = "2026-07-14T12:04:14.000Z";
  assert.throws(
    () => validateEvidenceBundle(captureBeforeCompletion),
    (error) => error instanceof EvidenceValidationError
      && error.details.some((item) => item.includes("post-write capture/export"))
  );
});

test("query evidence uses payload.total rather than the requested page count", () => {
  const bundle = validBundle();
  assert.equal(bundle.readEvidence.evidence.find((item) => item.tool === "get_dataset_queries").payload.count, 10);
  assert.doesNotThrow(() => validateEvidenceBundle(bundle));
});

test("structural evidence validator rejects target drift and failed mutation receipts", () => {
  const bundle = validBundle();
  bundle.readEvidence.targetUrn = "urn:li:dataset:wrong";
  bundle.writebackEvidence.run.writeback.mutationReceipts[0].result.isError = true;
  assert.throws(
    () => validateEvidenceBundle(bundle),
    (error) => error instanceof EvidenceValidationError
      && error.details.some((item) => item.startsWith("target:"))
      && error.details.some((item) => item.includes("add_structured_properties"))
  );
});

test("structural evidence validator rejects a source field absent from live schema", () => {
  const bundle = validBundle();
  const schema = bundle.writebackEvidence.run.liveEvidence.evidence.find((item) => item.tool === "list_schema_fields");
  schema.payload.fields = [{ fieldPath: "customer_id" }];
  assert.throws(
    () => validateEvidenceBundle(bundle),
    (error) => error instanceof EvidenceValidationError && error.details.some((item) => item.includes("requested sourceField"))
  );
});

test("validator rejects context drift even when an attacker reissues self-consistent context hashes", () => {
  const bundle = validBundle();
  const run = bundle.writebackEvidence.run;
  run.context.edges = [];
  const { passportId: _oldId, manifestHash: _oldManifest, ...body } = run.passport;
  body.contextHash = sha256(run.context);
  const manifestHash = sha256(body);
  run.passport = { ...body, passportId: `csp_${manifestHash.slice(0, 20)}`, manifestHash };
  assert.throws(
    () => validateEvidenceBundle(bundle),
    (error) => error instanceof EvidenceValidationError
      && error.details.some((item) => item.includes("normalized context does not exactly match"))
  );
});

test("validator trusts raw synthetic-local markers, not relabeled boundary prose", () => {
  const bundle = validBundle();
  for (const evidence of [bundle.writebackEvidence.run.liveEvidence.evidence, bundle.readEvidence.evidence]) {
    const properties = evidence.find((item) => item.tool === "get_entities").payload.result[0].properties.customProperties;
    properties.find((item) => item.key === "contextseal_fixture").value = "false";
    properties.find((item) => item.key === "evidence_boundary").value = "production";
  }
  assert.throws(
    () => validateEvidenceBundle(bundle),
    (error) => error instanceof EvidenceValidationError
      && error.details.filter((item) => item.includes("raw target entity is not marked")).length === 2
  );
});
