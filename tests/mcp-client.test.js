import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { DataHubMcpClient, DataHubStdioMcpClient, McpError, createDataHubMcpClient } from "../src/datahub/mcp-client.js";

test("MCP client preserves session and calls named tools", async () => {
  const requests = [];
  const fetchImpl = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push({ headers: options.headers, body });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result: { content: [{ type: "text", text: "ok" }] } }), {
      status: 200,
      headers: { "content-type": "application/json", "mcp-session-id": "session-1" }
    });
  };
  const client = new DataHubMcpClient({ url: "https://datahub.test/mcp", token: "test-only", fetchImpl });
  await client.initialize();
  await client.callTool("get_lineage", { urn: "urn:li:test" });
  const initializeRequest = requests.find((request) => request.body.method === "initialize");
  const toolRequest = requests.find((request) => request.body.method === "tools/call");
  assert.equal(initializeRequest.body.method, "initialize");
  assert.equal(toolRequest.body.params.name, "get_lineage");
  assert.equal(toolRequest.headers["mcp-session-id"], "session-1");
  assert.equal(initializeRequest.headers.authorization, "Bearer test-only");
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
  await client.initialize();
  const tools = await client.listTools();
  assert.equal(tools.tools[0].name, "get_entities");
  assert.equal(requests[0].method, "initialize");
  assert.equal(requests[1].method, "notifications/initialized");
  await client.close();
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
  assert.equal(options, undefined);
});
