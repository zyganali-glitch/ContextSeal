import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeChange } from "../src/core/workflow.js";
import { analyzeWithLiveContext } from "../src/datahub/analysis.js";

const request = JSON.parse(await readFile("examples/retail-change-request.json", "utf8"));
const context = JSON.parse(await readFile("examples/retail-context-graph.json", "utf8"));
const policy = JSON.parse(await readFile("config/policy.json", "utf8"));

test("datahub analysis captures raw MCP context before deterministic analysis without upgrading fixture impact", async () => {
  const order = [];
  let closed = false;
  const sourceField = request.sourceField;
  const client = {
    async initialize() { order.push("initialize"); return { protocolVersion: "2025-03-26", serverInfo: { name: "datahub-mcp", version: "test" } }; },
    provenance() { return { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" }; },
    async callTool(tool, args) {
      order.push(tool);
      if (tool === "get_entities") {
        return {
          isError: false,
          structuredContent: {
            result: [{
              urn: request.targetUrn,
              type: "DATASET",
              name: request.entityName,
              platform: { name: "snowflake" },
              ownership: { owners: [{ owner: { urn: "urn:li:corpgroup:customer-data" } }] },
              tags: { tags: [{ tag: { urn: "urn:li:tag:PII" } }, { tag: { urn: "urn:li:tag:Tier1" } }] },
              glossaryTerms: { terms: [{ term: { urn: "urn:li:glossaryTerm:Personal Email Address" } }] },
              health: [{ type: "INCIDENTS", status: "PASS" }],
              schemaMetadata: { fields: [{ fieldPath: sourceField, nativeDataType: "varchar", nullable: false }] }
            }]
          }
        };
      }
      if (tool === "list_schema_fields") {
        return {
          isError: false,
          structuredContent: {
            urn: request.targetUrn,
            fields: [{ fieldPath: sourceField, nativeDataType: "varchar", nullable: false }],
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
              total: 0,
              returned: 0,
              offset: 0,
              hasMore: false,
              searchResults: []
            }
          }
        };
      }
      if (tool === "get_dataset_queries") {
        return { isError: false, structuredContent: { total: 0, queries: [] } };
      }
      throw new Error(`unexpected tool ${tool}`);
    },
    async close() { closed = true; order.push("close"); }
  };
  const run = await analyzeWithLiveContext({
    request,
    context,
    policy,
    mode: "datahub",
    now: new Date("2026-08-01T12:00:00.000Z"),
    createClient: () => client,
    analyze: (options) => {
      order.push("analyze");
      return analyzeChange(options);
    },
    enrichRun: async (candidate) => {
      order.push("enrich");
      return candidate;
    }
  });

  assert.deepEqual(order, ["initialize", "get_entities", "list_schema_fields", "get_lineage", "get_dataset_queries", "close", "analyze", "enrich"]);
  assert.equal(closed, true);
  assert.equal(run.liveEvidence.captureStage, "PRE_ANALYSIS");
  assert.equal(run.evidence.find((item) => item.claim === "DataHub context retrieved").state, "PASS");
  assert.equal(run.evidence.find((item) => item.claim === "Downstream impact paths traced").state, "FIXTURE");
});

test("fixture analysis does not create a client or live-evidence claim", async () => {
  const run = await analyzeWithLiveContext({
    request,
    context,
    policy,
    mode: "fixture",
    createClient: () => { throw new Error("fixture mode must not create an MCP client"); },
    enrichRun: async (candidate) => candidate
  });

  assert.equal(run.liveEvidence, undefined);
  assert.equal(run.evidence.find((item) => item.claim === "DataHub context retrieved").state, "FIXTURE");
});

test("datahub analysis closes the MCP client when a required read fails", async () => {
  let closed = false;
  const client = {
    async initialize() {},
    async callTool() { throw new Error("catalog unavailable"); },
    async close() { closed = true; }
  };

  await assert.rejects(() => analyzeWithLiveContext({
    request,
    context,
    policy,
    mode: "datahub",
    createClient: () => client,
    enrichRun: async (candidate) => candidate
  }), /catalog unavailable/);
  assert.equal(closed, true);
});