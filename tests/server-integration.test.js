import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const changeRequest = JSON.parse(await readFile(path.join(root, "examples", "retail-change-request.json"), "utf8"));
const operatorToken = "integration-operator-token";
const mcpToken = "integration-mcp-token";
const operatorTokenKey = ["CONTEXTSEAL", "OPERATOR", "TOKEN"].join("_");
const dataHubTokenKey = ["DATAHUB", "GMS", "TOKEN"].join("_");
const jobUrn = "urn:li:dataset:(urn:li:dataPlatform:airflow,customer_360.build_segments,PROD)";
const dashboardUrn = "urn:li:dataset:(urn:li:dataPlatform:looker,executive_customer_health,PROD)";

const targetEntity = {
  urn: changeRequest.targetUrn,
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

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

async function freePort() {
  const server = net.createServer();
  const port = await listen(server);
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function readRequestBody(request) {
  let text = "";
  for await (const chunk of request) text += chunk;
  return text ? JSON.parse(text) : null;
}

async function createFakeMcp(t, {
  readback = "PASS",
  failMutation = null,
  mutationDelayMs = 0
} = {}) {
  const calls = [];
  const mutations = [];
  const catalog = { propertyValues: null, description: "", document: null };
  const server = http.createServer(async (request, response) => {
    const payload = await readRequestBody(request);
    calls.push({
      authorization: request.headers.authorization,
      contentType: request.headers["content-type"],
      payload
    });
    if (!payload || payload.jsonrpc !== "2.0") {
      response.writeHead(400).end();
      return;
    }
    if (payload.method === "notifications/initialized") {
      response.writeHead(204).end();
      return;
    }
    let result;
    if (payload.method === "initialize") {
      result = {
        protocolVersion: "2025-03-26",
        serverInfo: { name: "contextseal-fake-datahub", version: "integration" },
        capabilities: { tools: {} }
      };
    } else if (payload.method === "tools/call") {
      const { name, arguments: args } = payload.params;
      if (name === "get_entities") {
        const postWriteEntity = {
          ...targetEntity,
          editableProperties: { description: catalog.description },
          structuredProperties: {
            properties: Object.entries(catalog.propertyValues || {}).map(([propertyUrn, values]) => ({
              structuredProperty: { urn: propertyUrn },
              values: values.map((value) => typeof value === "number" ? { numberValue: value } : { stringValue: value })
            }))
          }
        };
        result = {
          isError: false,
          structuredContent: {
            result: [catalog.document && readback === "PASS" ? postWriteEntity : targetEntity]
           }
         };
      } else if (name === "list_schema_fields") {
        result = {
          isError: false,
          structuredContent: {
            urn: changeRequest.targetUrn,
            fields: [{ fieldPath: "customer_email", type: "STRING", nullable: false }],
            totalFields: 1,
            returned: 1,
            remainingCount: 0,
            matchingCount: null,
            offset: args.offset
          }
        };
      } else if (name === "get_lineage") {
        result = {
          isError: false,
          structuredContent: {
            downstreams: {
              total: 2,
              searchResults: [{ entity: jobEntity, degree: 1 }, { entity: dashboardEntity, degree: 2 }],
              hasMore: false
            }
          }
        };
      } else if (name === "get_lineage_paths_between") {
        const target = args.target_urn;
        const pathUrns = target === jobUrn
          ? [changeRequest.targetUrn, jobUrn]
          : [changeRequest.targetUrn, jobUrn, dashboardUrn];
        result = {
          isError: false,
          structuredContent: {
            source: changeRequest.targetUrn,
            target,
            pathCount: 1,
            paths: [{ path: pathUrns.map((urn) => ({ urn, type: "DATASET" })) }]
          }
        };
      } else if (name === "get_dataset_queries") {
        result = {
          isError: false,
          structuredContent: {
            total: 1,
            queries: [{
              queryId: "integration-query",
              datasetUrn: changeRequest.targetUrn,
              sql: "select customer_email from gold_customers"
            }]
          }
        };
      } else if (["add_structured_properties", "update_description", "save_document"].includes(name)) {
        mutations.push({ name, args });
        if (mutationDelayMs && name === "add_structured_properties") {
          await new Promise((resolve) => setTimeout(resolve, mutationDelayMs));
        }
        if (name === failMutation) {
          result = { isError: false, structuredContent: { success: false } };
        } else {
          if (name === "add_structured_properties") catalog.propertyValues = args.property_values;
          if (name === "update_description") catalog.description += args.description;
          if (name === "save_document") {
            catalog.document = {
              urn: "urn:li:document:contextseal-integration",
              title: args.title,
              content: args.content
            };
          }
          result = {
            isError: false,
            structuredContent: {
              success: true,
              ...(name === "save_document" ? { urn: catalog.document.urn } : {})
            }
          };
        }
      } else if (name === "grep_documents") {
        const document = catalog.document;
        result = {
          isError: false,
          structuredContent: {
            results: document ? [{
              urn: document.urn,
              title: document.title,
              total_matches: 1,
              matches: [{ excerpt: document.content, position: 1 }]
            }] : [],
            total_matches: document ? 1 : 0,
            documents_with_matches: document ? 1 : 0
          }
        };
      } else {
        result = { isError: true, content: [{ type: "text", text: `unexpected tool ${name}` }] };
      }
    } else {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id, error: { code: -32601, message: "unknown method" } }));
      return;
    }
    response.writeHead(200, {
      "content-type": "application/json",
      "mcp-session-id": "integration-session"
    });
    response.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result }));
  });
  const port = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { url: `http://127.0.0.1:${port}/mcp`, calls, mutations, catalog };
}

async function startContextSeal(t, fakeMcp, { mutationsEnabled = false } = {}) {
  const port = await freePort();
  const stateRoot = await mkdtemp(path.join(os.tmpdir(), "contextseal-server-"));
  const output = { stdout: "", stderr: "" };
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: root,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PORT: String(port),
      CONTEXTSEAL_HOST: "127.0.0.1",
      CONTEXTSEAL_MODE: "datahub",
      [operatorTokenKey]: operatorToken,
      CONTEXTSEAL_ALLOWED_TARGET_URNS: JSON.stringify([changeRequest.targetUrn]),
      CONTEXTSEAL_STATE_DIR: stateRoot,
      DATAHUB_MCP_TRANSPORT: "http",
      DATAHUB_MCP_URL: fakeMcp.url,
      [dataHubTokenKey]: mcpToken,
      DATAHUB_MCP_MUTATIONS_ENABLED: mutationsEnabled ? "true" : "false",
      DATAHUB_MCP_TIMEOUT_MS: "5000"
    }
  });
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output.stdout = `${output.stdout}${chunk}`.slice(-4000); });
  child.stderr.on("data", (chunk) => { output.stderr = `${output.stderr}${chunk}`.slice(-4000); });
  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`ContextSeal exited early (${child.exitCode}): ${output.stderr}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    if (!health.ok) throw new Error(`health returned ${health.status}`);
  } catch (error) {
    throw new Error(`ContextSeal did not start: ${error.message}; ${output.stderr}`);
  }
  t.after(async () => {
    if (child.exitCode == null) {
      child.kill();
      await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    }
    await rm(stateRoot, { recursive: true, force: true });
  });
  return { baseUrl, stateRoot, output };
}

async function api(baseUrl, pathname, {
  method = "GET",
  token = operatorToken,
  contentType = "application/json",
  body = undefined
} = {}) {
  const headers = {};
  if (token != null) headers.authorization = `Bearer ${token}`;
  if (method === "POST" && contentType != null) headers["content-type"] = contentType;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) })
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, payload: text ? JSON.parse(text) : null };
}

async function rawHttpRequest(baseUrl, requestText) {
  const endpoint = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: endpoint.hostname, port: Number(endpoint.port) });
    let response = "";
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end(requestText));
    socket.on("data", (chunk) => { response += chunk; });
    socket.on("end", () => resolve(response));
    socket.on("error", reject);
  });
}

async function analyzeAndApprove(baseUrl) {
  const analyzed = await api(baseUrl, "/api/analyze", {
    method: "POST",
    body: { request: changeRequest }
  });
  assert.equal(analyzed.status, 201);
  const approved = await api(baseUrl, `/api/runs/${analyzed.payload.runId}/decision`, {
    method: "POST",
    body: {
      decision: "APPROVE",
      reviewer: "integration-owner",
      note: "Approve exact staged migration only.",
      scopeAccepted: true
    }
  });
  assert.equal(approved.status, 200);
  return approved.payload;
}

async function persistedRun(stateRoot, runId) {
  return JSON.parse(await readFile(path.join(stateRoot, "runs", `${runId}.json`), "utf8"));
}

test("spawned live server rejects pasted credentials before MCP or persistence and never echoes them", async (t) => {
  const fake = await createFakeMcp(t);
  const app = await startContextSeal(t, fake, { mutationsEnabled: false });
  const malformedSecret = ["github", "pat", "J6".repeat(16)].join("_");
  const malformed = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: `{"request":{"rationale":"${malformedSecret}"`
  });
  assert.equal(malformed.status, 400);
  assert.equal(JSON.stringify(malformed.payload).includes(malformedSecret), false);
  assert.equal(malformed.payload.error, "Malformed JSON request body.");
  assert.deepEqual(await readdir(path.join(app.stateRoot, "runs")), []);
  assert.deepEqual(fake.calls, []);

  const pastedRequestSecret = ["github", "pat", "Q8".repeat(16)].join("_");
  const rejectedRequest = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: {
      request: {
        ...changeRequest,
        rationale: `Urgent migration ${pastedRequestSecret}`
      }
    }
  });
  assert.equal(rejectedRequest.status, 400);
  assert.equal(JSON.stringify(rejectedRequest.payload).includes(pastedRequestSecret), false);
  assert.match(rejectedRequest.payload.error, /Invalid change request/);
  assert.deepEqual(await readdir(path.join(app.stateRoot, "runs")), []);
  assert.deepEqual(fake.calls, []);

  const analyzed = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: { request: changeRequest }
  });
  assert.equal(analyzed.status, 201);
  const pastedApprovalSecret = `Bearer ${`R9${"s".repeat(30)}`}`;
  const rejectedApproval = await api(app.baseUrl, `/api/runs/${analyzed.payload.runId}/decision`, {
    method: "POST",
    body: {
      decision: "APPROVE",
      reviewer: "integration-owner",
      note: `Approve exact scope. ${pastedApprovalSecret}`,
      scopeAccepted: true
    }
  });
  assert.equal(rejectedApproval.status, 400);
  assert.equal(JSON.stringify(rejectedApproval.payload).includes(pastedApprovalSecret), false);
  assert.match(rejectedApproval.payload.error, /Invalid approval/);
  const persisted = await persistedRun(app.stateRoot, analyzed.payload.runId);
  assert.equal(persisted.state, "AWAITING_HUMAN");
  assert.equal("approval" in persisted, false);
  assert.equal(`${app.output.stdout}\n${app.output.stderr}`.includes(pastedRequestSecret), false);
  assert.equal(`${app.output.stdout}\n${app.output.stderr}`.includes(pastedApprovalSecret), false);
});

test("spawned live server survives malformed Host input and applies browser isolation headers", async (t) => {
  const fake = await createFakeMcp(t);
  const app = await startContextSeal(t, fake, { mutationsEnabled: false });
  const raw = await rawHttpRequest(
    app.baseUrl,
    "GET /api/health HTTP/1.1\r\nHost: [\r\nConnection: close\r\n\r\n"
  );
  assert.match(raw, /^HTTP\/1\.1 (?:200|400)/);

  const health = await api(app.baseUrl, "/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-frame-options"), "DENY");
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.match(health.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(health.headers.get("access-control-allow-origin"), null);
});

test("spawned live server caps request bodies by bytes before analysis", async (t) => {
  const fake = await createFakeMcp(t);
  const app = await startContextSeal(t, fake, { mutationsEnabled: false });
  const oversized = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: JSON.stringify({ padding: "x".repeat(1_000_000) })
  });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.payload.error, "Request body exceeds 1 MB.");
  assert.deepEqual(fake.calls, []);
  assert.deepEqual(await readdir(path.join(app.stateRoot, "runs")), []);
});

test("spawned live server enforces operator auth, JSON, allowlist, refresh supersession, and disabled mutations", async (t) => {
  const fake = await createFakeMcp(t);
  const app = await startContextSeal(t, fake, { mutationsEnabled: false });

  const unauthenticated = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    token: null,
    body: { request: changeRequest }
  });
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get("www-authenticate"), /^Bearer /);
  assert.equal((await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    token: "wrong-token",
    body: { request: changeRequest }
  })).status, 401);
  assert.equal((await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    contentType: "text/plain",
    body: JSON.stringify({ request: changeRequest })
  })).status, 415);
  const unwrapped = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: changeRequest
  });
  assert.equal(unwrapped.status, 400);
  assert.match(unwrapped.payload.error, /explicit change request object/);
  const outside = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: { request: { ...changeRequest, targetUrn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,outside,PROD)" } }
  });
  assert.equal(outside.status, 400);
  assert.match(outside.payload.error, /outside/);

  const analyzed = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: { request: changeRequest }
  });
  assert.equal(analyzed.status, 201);
  assert.equal(analyzed.payload.mode, "datahub");
  assert.equal(analyzed.payload.evidence.find((item) => item.claim === "DataHub context retrieved").state, "PASS");
  assert.match(analyzed.payload.liveEvidence.rawEvidenceHash, /^[a-f0-9]{64}$/);
  assert.ok(fake.calls.length > 0);
  assert.equal(fake.calls.every((call) => call.authorization === `Bearer ${mcpToken}`), true);
  assert.equal(fake.calls.every((call) => call.contentType === "application/json"), true);

  const refreshed = await api(app.baseUrl, `/api/runs/${analyzed.payload.runId}/live-evidence`, {
    method: "POST",
    body: {}
  });
  assert.equal(refreshed.status, 200);
  assert.notEqual(refreshed.payload.runId, analyzed.payload.runId);
  assert.equal(refreshed.payload.supersedesRunId, analyzed.payload.runId);
  const old = await persistedRun(app.stateRoot, analyzed.payload.runId);
  assert.equal(old.state, "SUPERSEDED");
  assert.equal(old.supersededByRunId, refreshed.payload.runId);
  assert.equal((await api(app.baseUrl, `/api/runs/${analyzed.payload.runId}/decision`, {
    method: "POST",
    body: { decision: "REJECT", reviewer: "operator", note: "stale", scopeAccepted: false }
  })).status, 409);
  assert.equal((await api(app.baseUrl, `/api/runs/${analyzed.payload.runId}/writeback`, {
    method: "POST",
    body: {}
  })).status, 409);

  const approved = await api(app.baseUrl, `/api/runs/${refreshed.payload.runId}/decision`, {
    method: "POST",
    body: {
      decision: "APPROVE",
      reviewer: "integration-owner",
      note: "Approve refreshed evidence only.",
      scopeAccepted: true
    }
  });
  assert.equal(approved.status, 200);
  const disabled = await api(app.baseUrl, `/api/runs/${approved.payload.runId}/writeback`, {
    method: "POST",
    body: {}
  });
  assert.equal(disabled.status, 409);
  assert.match(disabled.payload.error, /disabled/);
  assert.deepEqual(fake.mutations, []);
});

test("spawned live server records an explicit rejection and never exposes write-back", async (t) => {
  const fake = await createFakeMcp(t);
  const app = await startContextSeal(t, fake, { mutationsEnabled: true });
  const analyzed = await api(app.baseUrl, "/api/analyze", {
    method: "POST",
    body: { request: changeRequest }
  });
  assert.equal(analyzed.status, 201);

  const rejected = await api(app.baseUrl, `/api/runs/${analyzed.payload.runId}/decision`, {
    method: "POST",
    body: {
      decision: "REJECT",
      reviewer: "integration-owner",
      note: "Reject until the proposed scope is narrowed.",
      scopeAccepted: false
    }
  });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.payload.state, "REJECTED");
  assert.equal(rejected.payload.approval.scopeAccepted, false);
  assert.equal(rejected.payload.passport.status, "REJECTED");

  const blocked = await api(app.baseUrl, `/api/runs/${analyzed.payload.runId}/writeback`, {
    method: "POST",
    body: {}
  });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.payload.state, "REJECTED");
  assert.deepEqual(fake.mutations, []);
  assert.equal((await persistedRun(app.stateRoot, analyzed.payload.runId)).state, "REJECTED");
});

test("spawned live server serializes concurrent write-back, verifies read-back, and blocks replay", async (t) => {
  const fake = await createFakeMcp(t, { mutationDelayMs: 100 });
  const app = await startContextSeal(t, fake, { mutationsEnabled: true });
  const approved = await analyzeAndApprove(app.baseUrl);
  const requests = await Promise.all([
    api(app.baseUrl, `/api/runs/${approved.runId}/writeback`, { method: "POST", body: {} }),
    api(app.baseUrl, `/api/runs/${approved.runId}/writeback`, { method: "POST", body: {} })
  ]);
  assert.deepEqual(
    requests.map((item) => item.status).sort((a, b) => a - b),
    [200, 409],
    JSON.stringify(requests)
  );
  const successful = requests.find((item) => item.status === 200).payload;
  assert.equal(successful.state, "CERTIFIED_AND_WRITTEN_BACK");
  assert.equal(successful.writeback.readback.state, "PASS");
  assert.ok(Date.parse(successful.writeback.startedAt) <= Date.parse(successful.writeback.mutationsCompletedAt));
  assert.equal(successful.writeback.at, successful.writeback.mutationsCompletedAt);
  assert.ok(Date.parse(successful.writeback.mutationsCompletedAt) <= Date.parse(successful.writeback.readback.observedAt));
  assert.ok(Date.parse(successful.writeback.readback.observedAt) <= Date.parse(successful.writeback.completedAt));
  assert.deepEqual(fake.mutations.map((item) => item.name), [
    "add_structured_properties",
    "update_description",
    "save_document"
  ]);
  assert.equal((await persistedRun(app.stateRoot, approved.runId)).state, "CERTIFIED_AND_WRITTEN_BACK");
  const replay = await api(app.baseUrl, `/api/runs/${approved.runId}/writeback`, { method: "POST", body: {} });
  assert.equal(replay.status, 409);
  assert.equal(replay.payload.replayBlocked, true);
  assert.equal(fake.mutations.length, 3);
});

test("spawned live server returns and persists an explicit failed read-back envelope", async (t) => {
  const fake = await createFakeMcp(t, { readback: "FAIL" });
  const app = await startContextSeal(t, fake, { mutationsEnabled: true });
  const approved = await analyzeAndApprove(app.baseUrl);
  const response = await api(app.baseUrl, `/api/runs/${approved.runId}/writeback`, { method: "POST", body: {} });
  assert.equal(response.status, 502);
  assert.match(response.payload.error, /read-back verification did not PASS/);
  assert.equal(response.payload.run.state, "WRITEBACK_VERIFICATION_FAILED");
  assert.equal(response.payload.run.writeback.readback.state, "FAIL");
  const persisted = await persistedRun(app.stateRoot, approved.runId);
  assert.equal(persisted.state, "WRITEBACK_VERIFICATION_FAILED");
  assert.equal(persisted.writeback.readback.attemptCount, 3);
  assert.equal(fake.mutations.length, 3);
});

test("spawned live server returns and persists partial mutation receipts without retrying side effects", async (t) => {
  const fake = await createFakeMcp(t, { failMutation: "update_description" });
  const app = await startContextSeal(t, fake, { mutationsEnabled: true });
  const approved = await analyzeAndApprove(app.baseUrl);
  const response = await api(app.baseUrl, `/api/runs/${approved.runId}/writeback`, { method: "POST", body: {} });
  assert.equal(response.status, 502);
  assert.match(response.payload.error, /stopped at update_description/);
  assert.equal(response.payload.run.state, "WRITEBACK_FAILED");
  assert.deepEqual(response.payload.run.writeback.mutationReceipts.map((item) => item.status), ["PASS", "FAIL"]);
  const persisted = await persistedRun(app.stateRoot, approved.runId);
  assert.equal(persisted.state, "WRITEBACK_FAILED");
  assert.deepEqual(persisted.writeback.mutationReceipts.map((item) => item.status), ["PASS", "FAIL"]);
  const replay = await api(app.baseUrl, `/api/runs/${approved.runId}/writeback`, { method: "POST", body: {} });
  assert.equal(replay.status, 409);
  assert.equal(fake.mutations.length, 2);
});
