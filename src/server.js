import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./env.js";
import { analyzeChange, decideRun } from "./core/workflow.js";
import { ContractError } from "./core/contracts.js";
import { enrichRunWithAi } from "./ai/adapter.js";
import { createDataHubMcpClient } from "./datahub/mcp-client.js";
import { buildWritebackOperations, executeWriteback, WritebackError } from "./datahub/writeback.js";
import { collectLiveEvidence } from "./datahub/live-context.js";
import { RunStore } from "./store.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");

await loadEnvFile(root);
const policy = JSON.parse(await readFile(path.join(root, "config", "policy.json"), "utf8"));
const fixtureRequest = JSON.parse(await readFile(path.join(root, "examples", "retail-change-request.json"), "utf8"));
const fixtureContext = JSON.parse(await readFile(path.join(root, "examples", "retail-context-graph.json"), "utf8"));
const store = new RunStore(path.join(root, ".contextseal"));
await store.initialize();

const mode = process.env.CONTEXTSEAL_MODE || "fixture";
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function body(request) {
  let data = "";
  for await (const chunk of request) {
    data += chunk;
    if (data.length > 1_000_000) throw new Error("Request body exceeds 1 MB.");
  }
  return data ? JSON.parse(data) : {};
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(publicRoot, `.${pathname}`);
  if (!file.startsWith(publicRoot)) return json(response, 403, { error: "Forbidden" });
  try {
    const content = await readFile(file);
    const type = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "application/octet-stream";
    response.writeHead(200, { "content-type": `${type}; charset=utf-8` });
    response.end(content);
  } catch (error) {
    if (error.code === "ENOENT") return json(response, 404, { error: "Not found" });
    throw error;
  }
}

async function handler(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json(response, 200, {
        status: "ok",
        product: "ContextSeal",
        mode,
        mutationsEnabled: process.env.DATAHUB_MCP_MUTATIONS_ENABLED === "true",
        evidenceBoundary: mode === "fixture" ? "FIXTURE: no live DataHub claim" : "LIVE DATAHUB MCP"
      });
    }
    if (request.method === "GET" && url.pathname === "/api/demo") {
      return json(response, 200, { request: fixtureRequest, context: { ...fixtureContext, observedAt: new Date().toISOString() } });
    }
    if (request.method === "POST" && url.pathname === "/api/analyze") {
      const input = await body(request);
      const context = input.context || { ...fixtureContext, observedAt: new Date().toISOString() };
      const run = await enrichRunWithAi(
        analyzeChange({ request: input.request || fixtureRequest, context, policy, mode })
      );
      await store.save(run, "ANALYSIS_COMPLETED");
      return json(response, 201, run);
    }
    const decisionMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/decision$/);
    if (request.method === "POST" && decisionMatch) {
      const run = await store.get(decisionMatch[1]);
      if (!run) return json(response, 404, { error: "Run not found" });
      const decided = decideRun(run, await body(request));
      await store.save(decided, decided.state);
      return json(response, 200, decided);
    }
    const liveMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/live-evidence$/);
    if (request.method === "POST" && liveMatch) {
      const run = await store.get(liveMatch[1]);
      if (!run) return json(response, 404, { error: "Run not found" });
      if (mode !== "datahub") return json(response, 409, { error: "Live evidence requires CONTEXTSEAL_MODE=datahub." });
      const client = createDataHubMcpClient();
      let liveEvidence;
      try { liveEvidence = await collectLiveEvidence(client, run.request); }
      finally { await client.close(); }
      const updated = {
        ...run,
        liveEvidence,
        evidence: run.evidence.map((item) => item.claim === "DataHub context retrieved"
          ? { ...item, state: "PASS", artifact: `${liveEvidence.evidence.length} raw MCP calls` }
          : item)
      };
      await store.save(updated, "LIVE_MCP_EVIDENCE_CAPTURED");
      return json(response, 200, updated);
    }
    const writebackMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/writeback$/);
    if (request.method === "POST" && writebackMatch) {
      const run = await store.get(writebackMatch[1]);
      if (!run) return json(response, 404, { error: "Run not found" });
      if (mode === "datahub" && !run.liveEvidence) {
        return json(response, 409, { error: "Live MCP evidence is required before DataHub write-back." });
      }
      const operations = buildWritebackOperations(run, policy);
      if (mode !== "datahub") {
        return json(response, 200, { status: "FIXTURE_ONLY", operations, evidenceState: "NOT_RUN", message: "No catalog was mutated." });
      }
      if (process.env.DATAHUB_MCP_MUTATIONS_ENABLED !== "true") {
        return json(response, 409, { error: "Mutation gate is disabled.", operations });
      }
      const client = createDataHubMcpClient();
      let results;
      try {
        await client.initialize();
        results = await executeWriteback(client, operations);
      } catch (error) {
        if (error instanceof WritebackError) {
          const failed = {
            ...run,
            state: "WRITEBACK_FAILED",
            writeback: { at: new Date().toISOString(), results: error.results },
            evidence: run.evidence.map((item) => item.claim === "DataHub write-back completed"
              ? { ...item, state: "FAIL", artifact: error.results.map((result) => `${result.tool}:${result.status}`).join(", ") }
              : item)
          };
          await store.save(failed, "DATAHUB_WRITEBACK_FAILED");
        }
        throw error;
      } finally { await client.close(); }
      const updated = {
        ...run,
        state: "CERTIFIED_AND_WRITTEN_BACK",
        writeback: { at: new Date().toISOString(), results },
        evidence: run.evidence.map((item) => item.claim === "DataHub write-back completed" ? { ...item, state: "PASS", artifact: results.map((result) => result.tool).join(", ") } : item)
      };
      await store.save(updated, "DATAHUB_WRITEBACK_COMPLETED");
      return json(response, 200, updated);
    }
    if (url.pathname.startsWith("/api/")) return json(response, 404, { error: "API route not found" });
    return serveStatic(request, response);
  } catch (error) {
    const status = error instanceof ContractError || error instanceof SyntaxError ? 400 : 500;
    return json(response, status, { error: error.message, details: error.details || [] });
  }
}

const server = http.createServer(handler);
server.listen(port, host, () => {
  console.log(`ContextSeal listening on http://${host}:${port} (${mode} mode)`);
});

export { server };
