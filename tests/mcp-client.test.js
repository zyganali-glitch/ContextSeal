import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { DataHubMcpClient, DataHubStdioMcpClient, McpError, createDataHubMcpClient } from "../src/datahub/mcp-client.js";

test("MCP client preserves session and calls named tools", async () => {
  const requests = [];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ headers: options.headers, body, redirect: options.redirect });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: "ok" }] } }), {
      status: 200,
      headers: { "content-type": "application/json", "mcp-session-id": "session-1" }
    });
  };
  const client = new DataHubMcpClient({ url: "https://datahub.test/mcp", token: "test-only", fetchImpl });
  assert.deepEqual(client.provenance(), { transport: "http", launcherPackage: null });
  await client.initialize();
  await client.callTool("get_lineage", { urn: "urn:li:test" });
  assert.equal(requests[0].body.method, "initialize");
  assert.equal(requests[1].body.method, "notifications/initialized");
  assert.equal("id" in requests[1].body, false);
  assert.equal(requests[2].body.params.name, "get_lineage");
  assert.equal(requests[2].headers["mcp-session-id"], "session-1");
  assert.equal(requests[0].headers.authorization, "Bearer test-only");
  assert.equal(requests.every((request) => request.redirect === "error"), true);
});

test("MCP client fails closed on HTTP and protocol errors", async () => {
  const httpClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response("down", { status: 503 })
  });
  await assert.rejects(() => httpClient.listTools(), McpError);

  const protocolClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "denied" } }), { status: 200 })
  });
  await assert.rejects(() => protocolClient.listTools(), /denied/);

  const toolErrorClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response(JSON.stringify({
      jsonrpc: "2.0", id: 1,
      result: { isError: true, content: [{ type: "text", text: "validation failed" }] }
    }), { status: 200 })
  });
  await assert.rejects(() => toolErrorClient.callTool("update_description"), /validation failed/);
});

test("HTTP MCP errors never echo credential-like remote details", async () => {
  const pasted = ["github", "pat", "M7".repeat(16)].join("_");
  const client = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        error: { message: `remote failure ${pasted}`, data: { diagnostic: pasted } }
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  await assert.rejects(() => client.listTools(), (error) => {
    assert.equal(error.message.includes(pasted), false);
    assert.match(error.message, /redacted/);
    assert.equal(error.data, null);
    return true;
  });
});

test("HTTP MCP transport requires HTTPS off loopback and rejects ambiguous URL components", () => {
  for (const url of ["http://127.0.0.1:8000/mcp", "http://localhost:8000/mcp", "http://[::1]:8000/mcp", "https://datahub.test/mcp"]) {
    assert.doesNotThrow(() => new DataHubMcpClient({ url, fetchImpl: async () => {} }));
  }
  for (const url of [
    "http://datahub.test/mcp",
    "ftp://datahub.test/mcp",
    "https://user:pass@datahub.test/mcp",
    "https://datahub.test/mcp?token=value",
    "https://datahub.test/mcp#fragment"
  ]) {
    assert.throws(() => new DataHubMcpClient({ url, fetchImpl: async () => {} }), /DATAHUB_MCP_URL|Remote/);
  }
});

test("stdio MCP transport never sends a DataHub token to an insecure remote GMS URL", () => {
  for (const url of ["http://127.0.0.1:8080", "http://localhost:8080", "http://[::1]:8080", "https://datahub.test"]) {
    assert.doesNotThrow(() => createDataHubMcpClient({ DATAHUB_GMS_URL: url }));
  }
  for (const url of [
    "http://datahub.test:8080",
    "ftp://datahub.test",
    "https://user:pass@datahub.test",
    "https://datahub.test?token=value",
    "https://datahub.test#fragment"
  ]) {
    assert.throws(() => createDataHubMcpClient({ DATAHUB_GMS_URL: url }), /DATAHUB_GMS_URL|Remote/);
  }
});

test("stdio MCP client completes initialization and tool calls over JSON lines", async () => {
  const requests = [];
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => child.emit("exit", 0);
  child.stdin.setEncoding("utf8");
  let buffer = "";
  child.stdin.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines.filter(Boolean)) {
      const request = JSON.parse(line);
      requests.push(request);
      if (request.id == null) continue;
      const result = request.method === "tools/list" ? { tools: [{ name: "get_entities" }] } : { protocolVersion: "2025-03-26" };
      child.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result })}\n`);
    }
  });

  const client = new DataHubStdioMcpClient({ spawnImpl: () => child, timeoutMs: 1_000 });
  assert.deepEqual(client.provenance(), { transport: "stdio", launcherPackage: "mcp-server-datahub@0.6.0" });
  await client.initialize();
  const tools = await client.listTools();
  assert.equal(tools.tools[0].name, "get_entities");
  assert.equal(requests[0].method, "initialize");
  assert.equal(requests[1].method, "notifications/initialized");
  await client.close();
});

test("HTTP MCP client enforces timeouts, request correlation, and multi-event SSE", async () => {
  const timeoutClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    timeoutMs: 5,
    fetchImpl: async () => new Promise(() => {})
  });
  await assert.rejects(() => timeoutClient.listTools(), /timed out/);

  const bodyTimeoutClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    timeoutMs: 5,
    fetchImpl: async () => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"jsonrpc":"2.0"'));
      }
    }), { status: 200, headers: { "content-type": "application/json" } })
  });
  await assert.rejects(() => bodyTimeoutClient.listTools(), /response body timed out/);

  const oversizedClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    maxResponseBytes: 64,
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { padding: "x".repeat(100) } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });
  await assert.rejects(() => oversizedClient.listTools(), /size limit/);

  const mismatchedClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 99, result: {} }), { status: 200 })
  });
  await assert.rejects(() => mismatchedClient.listTools(), /correlate/);

  const wrongVersionClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response(JSON.stringify({ jsonrpc: "1.0", id: 1, result: {} }), { status: 200 })
  });
  await assert.rejects(() => wrongVersionClient.listTools(), /JSON-RPC version/);

  const sseClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response([
      "event: message",
      'data: {"jsonrpc":"2.0","method":"notifications/progress","params":{}}',
      "",
      "event: message",
      'data: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"get_entities"}]}}',
      ""
    ].join("\n"), { status: 200, headers: { "content-type": "text/event-stream" } })
  });
  assert.equal((await sseClient.listTools()).tools[0].name, "get_entities");

  const sseErrorClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response([
      "data: {\"jsonrpc\":\"2.0\",\"id\":2,\"result\":{}}",
      "",
      "data: {\"jsonrpc\":\"2.0\",\"id\":1,\"error\":{\"code\":-32000,\"message\":\"denied\"}}",
      ""
    ].join("\n"), { status: 200, headers: { "content-type": "text/event-stream" } })
  });
  await assert.rejects(() => sseErrorClient.listTools(), /denied/);

  const duplicateClient = new DataHubMcpClient({
    url: "https://datahub.test/mcp",
    fetchImpl: async () => new Response([
      'data: {"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
      "",
      'data: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"unexpected"}]}}',
      ""
    ].join("\n"), { status: 200, headers: { "content-type": "text/event-stream" } })
  });
  await assert.rejects(() => duplicateClient.listTools(), /ambiguous duplicate/);
});

test("stdio MCP errors redact subprocess stderr", async () => {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => child.emit("exit", 0);
  const secret = ["DATAHUB", "GMS", "TOKEN=not-for-api-output"].join("_");
  const client = new DataHubStdioMcpClient({ spawnImpl: () => child, timeoutMs: 5 });
  const pending = client.listTools();
  child.stderr.write(`${secret}\n`);
  await assert.rejects(pending, (error) => {
    assert.equal(error.message.includes(secret), false);
    assert.match(error.message, /redacted/);
    return true;
  });
  await client.close();
});

test("stdio MCP client bounds an unterminated response before parsing or persistence", async () => {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => child.emit("exit", 0);
  const client = new DataHubStdioMcpClient({ spawnImpl: () => child, timeoutMs: 1_000, maxMessageBytes: 64 });
  const pending = client.listTools();
  child.stdout.write("x".repeat(65));
  await assert.rejects(pending, /size limit/);
  await client.close();
});

test("stdio MCP child receives only runtime essentials and DataHub-scoped variables", async (t) => {
  const previousOperator = process.env.CONTEXTSEAL_OPERATOR_TOKEN;
  const previousGithub = process.env.GITHUB_TOKEN;
  process.env.CONTEXTSEAL_OPERATOR_TOKEN = "operator-secret-that-must-not-cross";
  process.env.GITHUB_TOKEN = "github-secret-that-must-not-cross";
  t.after(() => {
    if (previousOperator == null) delete process.env.CONTEXTSEAL_OPERATOR_TOKEN;
    else process.env.CONTEXTSEAL_OPERATOR_TOKEN = previousOperator;
    if (previousGithub == null) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousGithub;
  });

  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => child.emit("exit", 0);
  let spawnOptions;
  const client = new DataHubStdioMcpClient({
    env: {
      DATAHUB_GMS_URL: "http://localhost:8080",
      DATAHUB_GMS_TOKEN: "datahub-scoped-test-only",
      TOOLS_IS_MUTATION_ENABLED: "false"
    },
    spawnImpl: (_command, _args, options) => { spawnOptions = options; return child; }
  });
  client.start();
  assert.equal(spawnOptions.env.DATAHUB_GMS_TOKEN, "datahub-scoped-test-only");
  assert.equal(spawnOptions.env.TOOLS_IS_MUTATION_ENABLED, "false");
  assert.equal("CONTEXTSEAL_OPERATOR_TOKEN" in spawnOptions.env, false);
  assert.equal("GITHUB_TOKEN" in spawnOptions.env, false);
  await client.close();

  const unsafe = new DataHubStdioMcpClient({
    env: { CONTEXTSEAL_OPERATOR_TOKEN: "must-not-pass" },
    spawnImpl: () => child
  });
  assert.throws(() => unsafe.start(), /Unsupported DataHub MCP child environment key/);
});

test("client factory keeps local stdio mutations disabled by default", () => {
  let options;
  const spawnImpl = (_command, _args, value) => {
    options = value;
    return null;
  };
  const client = createDataHubMcpClient({ DATAHUB_GMS_URL: "http://localhost:8080" }, { spawnImpl });
  assert.equal(client.env.TOOLS_IS_MUTATION_ENABLED, "false");
  assert.equal(client.command, "uvx");
  assert.deepEqual(client.args, ["mcp-server-datahub@0.6.0"]);
  assert.equal(options, undefined);
});
