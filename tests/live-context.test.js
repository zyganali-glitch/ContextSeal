import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { attachLiveEvidence, collectLiveEvidence } from "../src/datahub/live-context.js";

const request = JSON.parse(await readFile("examples/retail-change-request.json", "utf8"));

test("live context preserves three raw MCP reads and marks only retrieval as live", async () => {
  const calls = [];
  const client = {
    async initialize() {
      calls.push("initialize");
      return { protocolVersion: "2025-03-26", serverInfo: { name: "datahub-mcp", version: "test" } };
    },
    provenance() { return { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" }; },
    async callTool(tool, args) {
      calls.push(tool);
      if (tool === "get_entities") {
        return {
          isError: false,
          structuredContent: {
            result: [{
              urn: args.urns[0],
              type: "DATASET",
              name: request.entityName,
              platform: { name: "snowflake" },
              ownership: { owners: [{ owner: { urn: "urn:li:corpgroup:customer-data" } }] },
              tags: { tags: [{ tag: { urn: "urn:li:tag:PII" } }, { tag: { urn: "urn:li:tag:Tier1" } }] },
              glossaryTerms: { terms: [{ term: { urn: "urn:li:glossaryTerm:Personal Email Address" } }] },
              health: [{ type: "INCIDENTS", status: "PASS" }],
              schemaMetadata: { fields: [{ fieldPath: request.sourceField, nativeDataType: "varchar", nullable: false }] }
            }]
          }
        };
      }
      if (tool === "list_schema_fields") {
        return {
          isError: false,
          structuredContent: {
            urn: args.urn,
            fields: [{ fieldPath: request.sourceField, nativeDataType: "varchar", nullable: false }],
            totalFields: 1,
            returned: 1,
            remainingCount: 0,
            matchingCount: null,
            offset: args.offset
          }
        };
      }
      if (tool === "get_lineage") {
        return {
          isError: false,
          structuredContent: {
            downstreams: {
              total: 3,
              returned: 3,
              offset: 0,
              hasMore: false,
              downstreams: {
                total: 3,
                returned: 3,
                offset: 0,
                hasMore: false,
                facets: [{
                  field: "_entityType",
                  aggregations: [
                    { value: "DATASET", count: 1 },
                    { value: "DATA_JOB", count: 1 },
                    { value: "DASHBOARD", count: 1 }
                  ]
                }],
                searchResults: [
                  { entity: { urn: "urn:li:dataset:(urn:li:dataPlatform:db,segments,PROD)", type: "DATASET", properties: { name: "segments" }, platform: { name: "snowflake" } }, degree: 1 },
                  { entity: { urn: "urn:li:dataJob:(urn:li:dataFlow:(airflow,customer_360,PROD),build_segments)", type: "DATA_JOB", properties: { name: "build_segments" }, platform: { name: "airflow" } }, degree: 2 },
                  { entity: { urn: "urn:li:dashboard:(looker,executive_customer_health)", type: "DASHBOARD", properties: { name: "Executive Customer Health" }, platform: { name: "looker" } }, degree: 3 }
                ]
              }
            }
          }
        };
      }
      if (tool === "get_lineage_paths_between") {
        const target = args.target_urn;
        if (target.includes("segments")) {
          return {
            isError: false,
            structuredContent: {
              source: request.targetUrn,
              target,
              pathCount: 1,
              paths: [{ path: [{ urn: request.targetUrn, type: "DATASET" }, { urn: target, type: target.includes("dataJob") ? "DATA_JOB" : "DATASET" }] }]
            }
          };
        }
        return {
          isError: false,
          structuredContent: {
            source: request.targetUrn,
            target,
            pathCount: 1,
            paths: [{ path: [
              { urn: request.targetUrn, type: "DATASET" },
              { urn: "urn:li:dataset:(urn:li:dataPlatform:db,segments,PROD)", type: "DATASET" },
              { urn: target, type: "DASHBOARD" }
            ] }]
          }
        };
      }
      return { isError: false, structuredContent: { total: 0, queries: [] } };
    }
  };
  const liveEvidence = await collectLiveEvidence(client, request, { now: new Date("2026-08-01T12:00:00.000Z"), maxHops: 5, maxResults: 100 });
  const run = {
    evidence: [
      { claim: "DataHub context retrieved", state: "NOT_RUN", artifact: null },
      { claim: "Downstream impact paths traced", state: "FIXTURE", artifact: "fixture impact paths" }
    ]
  };
  const attached = attachLiveEvidence(run, liveEvidence, "PRE_ANALYSIS");

  assert.deepEqual(calls, [
    "initialize",
    "get_entities",
    "list_schema_fields",
    "get_lineage",
    "get_lineage_paths_between",
    "get_lineage_paths_between",
    "get_lineage_paths_between",
    "get_dataset_queries"
  ]);
  assert.equal(liveEvidence.evidence.length, 7);
  assert.equal(liveEvidence.lineageSummary.downstreamCount, 3);
  assert.deepEqual(liveEvidence.lineageSummary.entityTypes, [
    { type: "DATASET", count: 1 },
    { type: "DATA_JOB", count: 1 },
    { type: "DASHBOARD", count: 1 }
  ]);
  assert.deepEqual(liveEvidence.lineageSummary.representativeDownstreams, [
    {
      urn: "urn:li:dataset:(urn:li:dataPlatform:db,segments,PROD)",
      type: "DATASET",
      name: "segments",
      platform: "snowflake",
      degree: 1
    },
    {
      urn: "urn:li:dataJob:(urn:li:dataFlow:(airflow,customer_360,PROD),build_segments)",
      type: "DATA_JOB",
      name: "build_segments",
      platform: "airflow",
      degree: 2
    },
    {
      urn: "urn:li:dashboard:(looker,executive_customer_health)",
      type: "DASHBOARD",
      name: "Executive Customer Health",
      platform: "looker",
      degree: 3
    }
  ]);
  assert.equal(attached.liveEvidence.captureStage, "PRE_ANALYSIS");
  assert.equal(attached.evidence[0].state, "PASS");
  assert.match(attached.evidence[0].artifact, /captured before deterministic analysis/);
  assert.match(attached.evidence[0].artifact, /downstream types: 1 DATASET, 1 DATA_JOB, 1 DASHBOARD/);
  assert.equal(attached.evidence[1].state, "FIXTURE");
});