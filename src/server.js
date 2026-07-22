import http from "node:http";
import path from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "./env.js";
import { analyzeChange, decideRun } from "./core/workflow.js";
import { ContractError, validateChangeRequest } from "./core/contracts.js";
import { enrichRunWithAi } from "./ai/adapter.js";
import { PassportVerificationError } from "./core/passport.js";
import { createDataHubMcpClient } from "./datahub/mcp-client.js";
import {
  buildWritebackOperations,
  collectWritebackReadback,
  executeWriteback,
  WritebackError
} from "./datahub/writeback.js";
import { collectLiveEvidence } from "./datahub/live-context.js";
import { RunStore, RunStoreConflictError } from "./store.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");

await loadEnvFile(root);
const policy = JSON.parse(await readFile(path.join(root, "config", "policy.json"), "utf8"));
const fixtureRequest = JSON.parse(await readFile(path.join(root, "examples", "retail-change-request.json"), "utf8"));
const fixtureContext = JSON.parse(await readFile(path.join(root, "examples", "retail-context-graph.json"), "utf8"));
const stateRoot = process.env.CONTEXTSEAL_STATE_DIR
  ? path.resolve(process.env.CONTEXTSEAL_STATE_DIR)
  : path.join(root, ".contextseal");
const store = new RunStore(stateRoot);
await store.initialize();

const mode = process.env.CONTEXTSEAL_MODE || "fixture";
const port = Number(process.env.PORT || 4173);
const host = process.env.CONTEXTSEAL_HOST || process.env.HOST || "127.0.0.1";
const MAX_REQUEST_BODY_BYTES = 1_000_000;
const REQUEST_URL_BASE = "http://contextseal.local";

const SECURITY_HEADERS = Object.freeze({
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
});

class HttpRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
  }
}

function liveSecurityConfiguration() {
  if (mode !== "datahub") return { operatorToken: null, allowedTargets: new Set() };
  const operatorToken = process.env.CONTEXTSEAL_OPERATOR_TOKEN?.trim();
  if (!operatorToken) {
    throw new Error("DataHub mode requires CONTEXTSEAL_OPERATOR_TOKEN; live API did not start.");
  }
  const dataHubToken = process.env.DATAHUB_GMS_TOKEN?.trim();
  if (dataHubToken && dataHubToken === operatorToken) {
    throw new Error("CONTEXTSEAL_OPERATOR_TOKEN must not reuse DATAHUB_GMS_TOKEN.");
  }
  let parsed;
  try { parsed = JSON.parse(process.env.CONTEXTSEAL_ALLOWED_TARGET_URNS || ""); }
  catch { throw new Error("DataHub mode requires CONTEXTSEAL_ALLOWED_TARGET_URNS as a valid JSON array."); }
  if (!Array.isArray(parsed) || parsed.length === 0
      || parsed.some((item) => typeof item !== "string" || !item.startsWith("urn:li:") || !item.trim())
      || new Set(parsed).size !== parsed.length) {
    throw new Error("CONTEXTSEAL_ALLOWED_TARGET_URNS must be a non-empty unique JSON array of DataHub URNs.");
  }
  return { operatorToken, allowedTargets: new Set(parsed) };
}

const liveSecurity = liveSecurityConfiguration();

function tokenDigest(value) {
  return createHash("sha256").update(value).digest();
}

function authorizedOperator(request) {
  if (mode !== "datahub") return true;
  const match = String(request.headers.authorization || "").match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return false;
  return timingSafeEqual(tokenDigest(match[1]), tokenDigest(liveSecurity.operatorToken));
}

function jsonContentType(request) {
  const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  return contentType === "application/json" || /^application\/[a-z0-9.+-]+\+json$/.test(contentType);
}

function assertAllowedTarget(targetUrn) {
  if (mode === "datahub" && !liveSecurity.allowedTargets.has(targetUrn)) {
    throw new ContractError("Requested target is outside CONTEXTSEAL_ALLOWED_TARGET_URNS.");
  }
}

function assertPolicyAllows(changeType) {
  if (!Array.isArray(policy.supportedChanges) || !policy.supportedChanges.includes(changeType)) {
    throw new ContractError(`Active policy does not support change type: ${changeType || "missing"}.`);
  }
}

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function applySecurityHeaders(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
}

async function body(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > MAX_REQUEST_BODY_BYTES) {
      throw new HttpRequestError("Request body exceeds 1 MB.", 413);
    }
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
  } catch {
    throw new HttpRequestError("Malformed JSON request body.", 400);
  }
}

async function serveStatic(url, response) {
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(publicRoot, `.${pathname}`);
  const relative = path.relative(publicRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return json(response, 403, { error: "Forbidden" });
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
  applySecurityHeaders(response);
  try {
    const url = new URL(request.url || "/", REQUEST_URL_BASE);
    if (request.method === "POST" && url.pathname.startsWith("/api/")) {
      if (!authorizedOperator(request)) {
        response.setHeader("www-authenticate", 'Bearer realm="ContextSeal operator"');
        return json(response, 401, { error: "Operator bearer token is required." });
      }
      if (!jsonContentType(request)) {
        return json(response, 415, { error: "POST requests require Content-Type: application/json." });
      }
    }
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
      const rawChangeRequest = mode === "datahub" ? input.request : input.request || fixtureRequest;
      if (!rawChangeRequest || typeof rawChangeRequest !== "object" || Array.isArray(rawChangeRequest)) {
        throw new ContractError("DataHub mode requires an explicit change request object.");
      }
      const changeRequest = validateChangeRequest(rawChangeRequest);
      assertAllowedTarget(changeRequest.targetUrn);
      assertPolicyAllows(changeRequest.changeType);
      let context;
      let liveEvidence = null;
      if (mode === "datahub") {
        const client = createDataHubMcpClient();
        try {
          const collected = await collectLiveEvidence(client, changeRequest, {
            maxHops: policy.impactMaxHops,
            maxResults: 100
          });
          ({ normalizedContext: context, ...liveEvidence } = collected);
        } finally {
          await client.close();
        }
      } else {
        context = input.context || { ...fixtureContext, observedAt: new Date().toISOString() };
      }
      const run = await enrichRunWithAi(
        analyzeChange({ request: changeRequest, context, policy, mode, liveEvidence })
      );
      await store.save(run, "ANALYSIS_COMPLETED", { expectedState: null });
      return json(response, 201, run);
    }
    const decisionMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/decision$/);
    if (request.method === "POST" && decisionMatch) {
      const run = await store.get(decisionMatch[1]);
      if (!run) return json(response, 404, { error: "Run not found" });
      assertAllowedTarget(run.request?.targetUrn);
      if (run.state === "SUPERSEDED") {
        return json(response, 409, {
          error: "Run was superseded by refreshed live evidence and cannot be decided.",
          supersededByRunId: run.supersededByRunId
        });
      }
      const decided = decideRun(run, await body(request));
      await store.save(decided, decided.state, { expectedState: "AWAITING_HUMAN" });
      return json(response, 200, decided);
    }
    const liveMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/live-evidence$/);
    if (request.method === "POST" && liveMatch) {
      const run = await store.get(liveMatch[1]);
      if (!run) return json(response, 404, { error: "Run not found" });
      assertAllowedTarget(run.request?.targetUrn);
      if (mode !== "datahub") return json(response, 409, { error: "Live evidence requires CONTEXTSEAL_MODE=datahub." });
      if (run.state !== "AWAITING_HUMAN") return json(response, 409, { error: "Only an undecided run can refresh live evidence." });
      const client = createDataHubMcpClient();
      let collected;
      try {
        collected = await collectLiveEvidence(client, run.request, {
          maxHops: policy.impactMaxHops,
          maxResults: 100
        });
      }
      finally { await client.close(); }
      const { normalizedContext, ...liveEvidence } = collected;
      const replacement = await enrichRunWithAi(
        analyzeChange({ request: run.request, context: normalizedContext, policy, mode, liveEvidence })
      );
      const transition = await store.supersede(run.runId, replacement, "LIVE_MCP_EVIDENCE_CAPTURED", {
        expectedState: "AWAITING_HUMAN"
      });
      return json(response, 200, transition.replacement);
    }
    const writebackMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/writeback$/);
    if (request.method === "POST" && writebackMatch) {
      const run = await store.get(writebackMatch[1]);
      if (!run) return json(response, 404, { error: "Run not found" });
      assertAllowedTarget(run.request?.targetUrn);
      if (run.state === "SUPERSEDED") {
        return json(response, 409, {
          error: "Run was superseded by refreshed live evidence and cannot be written back.",
          supersededByRunId: run.supersededByRunId
        });
      }
      if (run.state !== "APPROVED_FOR_WRITEBACK") {
        return json(response, 409, {
          error: `Run state ${run.state} is not eligible for write-back.`,
          state: run.state,
          replayBlocked: Boolean(run.writeback)
        });
      }
      if (mode === "datahub" && !run.liveEvidence) {
        return json(response, 409, { error: "Live MCP evidence is required before DataHub write-back." });
      }
      const now = new Date();
      const operations = buildWritebackOperations(run, policy, now);
      if (mode !== "datahub") {
        return json(response, 200, { status: "FIXTURE_ONLY", operations, evidenceState: "NOT_RUN", message: "No catalog was mutated." });
      }
      if (process.env.DATAHUB_MCP_MUTATIONS_ENABLED !== "true") {
        return json(response, 409, { error: "Mutation gate is disabled.", operations });
      }
      const writebackStartedAt = new Date().toISOString();
      await store.save({
        ...run,
        state: "WRITEBACK_IN_PROGRESS",
        writeback: { startedAt: writebackStartedAt, mutationReceipts: [], readback: null }
      }, "DATAHUB_WRITEBACK_STARTED", { expectedState: "APPROVED_FOR_WRITEBACK" });
      let client = null;
      let mutationReceipts;
      try {
        client = createDataHubMcpClient();
        await client.initialize();
        mutationReceipts = await executeWriteback(client, operations, { run, policy, now: new Date() });
        const mutationsCompletedAt = new Date().toISOString();
        const readback = await collectWritebackReadback(client, run, mutationReceipts, { policy });
        const writebackCompletedAt = new Date().toISOString();
        const readbackPassed = readback.state === "PASS";
        const updated = {
          ...run,
          state: readbackPassed ? "CERTIFIED_AND_WRITTEN_BACK" : "WRITEBACK_VERIFICATION_FAILED",
          writeback: {
            startedAt: writebackStartedAt,
            at: mutationsCompletedAt,
            mutationsCompletedAt,
            completedAt: writebackCompletedAt,
            mutationReceipts,
            readback
          },
          evidence: run.evidence.map((item) => {
            if (item.claim === "DataHub write-back completed") {
              return { ...item, state: "PASS", artifact: mutationReceipts.map((result) => result.tool).join(", ") };
            }
            if (item.claim === "Durable DataHub read-back verified") {
              return { ...item, state: readback.state, artifact: "structured properties, description, and exact document binding excerpts" };
            }
            return item;
          })
        };
        await store.save(updated, readbackPassed ? "DATAHUB_WRITEBACK_COMPLETED" : "DATAHUB_WRITEBACK_VERIFICATION_FAILED", {
          expectedState: "WRITEBACK_IN_PROGRESS"
        });
        if (!readbackPassed) {
          return json(response, 502, {
            error: "DataHub write-back completed, but durable read-back verification did not PASS.",
            run: updated
          });
        }
        return json(response, 200, updated);
      } catch (error) {
        if (error instanceof WritebackError) {
          const failed = {
            ...run,
            state: "WRITEBACK_FAILED",
            writeback: {
              startedAt: writebackStartedAt,
              completedAt: new Date().toISOString(),
              mutationReceipts: error.results,
              readback: error.readback || null
            },
            evidence: run.evidence.map((item) => {
              if (item.claim === "DataHub write-back completed") {
                return { ...item, state: "FAIL", artifact: error.results.map((result) => `${result.tool}:${result.status}`).join(", ") };
              }
              if (item.claim === "Durable DataHub read-back verified") {
                return { ...item, state: error.readback?.state || "NOT_RUN", artifact: error.readback ? "structured properties, description, and exact document binding excerpts" : null };
              }
              return item;
            })
          };
          await store.save(failed, "DATAHUB_WRITEBACK_FAILED", { expectedState: "WRITEBACK_IN_PROGRESS" });
          return json(response, 502, { error: error.message, run: failed });
        }
        throw error;
      } finally {
        if (client) await client.close();
      }
    }
    if (url.pathname.startsWith("/api/")) return json(response, 404, { error: "API route not found" });
    return serveStatic(url, response);
  } catch (error) {
    const status = error instanceof HttpRequestError
      ? error.status
      : error instanceof RunStoreConflictError
        ? 409
        : error instanceof ContractError || error instanceof PassportVerificationError
          ? 400
          : 500;
    return json(response, status, { error: error.message, details: error.details || [] });
  }
}

const server = http.createServer(handler);
server.listen(port, host, () => {
  console.log(`ContextSeal listening on http://${host}:${port} (${mode} mode)`);
});

export { server };
