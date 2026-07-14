import { spawn } from "node:child_process";

export class McpError extends Error {
  constructor(message, data = null) {
    super(message);
    this.name = "McpError";
    this.data = data;
  }
}

function assertToolResult(name, result) {
  if (!result?.isError) return result;
  const message = result.content?.filter((item) => item.type === "text").map((item) => item.text).join(" | ") || "Unknown tool error.";
  throw new McpError(`DataHub MCP tool failed (${name}): ${message}`);
}

export class DataHubMcpClient {
  constructor({ url, token = "", fetchImpl = fetch }) {
    if (!url) throw new Error("DataHub MCP URL is required.");
    this.url = url;
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.sessionId = null;
    this.nextId = 1;
  }

  async request(method, params = {}) {
    const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: this.nextId++, method, params })
    });
    if (!response.ok) throw new McpError(`DataHub MCP request failed with HTTP ${response.status}.`);
    this.sessionId = response.headers.get("mcp-session-id") || this.sessionId;
    const text = await response.text();
    const payload = text.startsWith("event:")
      ? JSON.parse(text.split("\n").find((line) => line.startsWith("data:"))?.slice(5) || "{}")
      : JSON.parse(text);
    if (payload.error) throw new McpError(payload.error.message || "DataHub MCP returned an error.", payload.error.data);
    return payload.result;
  }

  async initialize() {
    return this.request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "ContextSeal", version: "0.1.0" }
    });
  }

  async listTools() {
    return this.request("tools/list");
  }

  async callTool(name, args = {}) {
    return assertToolResult(name, await this.request("tools/call", { name, arguments: args }));
  }

  async close() {}
}

export class DataHubStdioMcpClient {
  constructor({
    command = "uvx",
    args = ["mcp-server-datahub@latest"],
    env = {},
    spawnImpl = spawn,
    timeoutMs = 30_000
  } = {}) {
    if (!command) throw new Error("DataHub MCP command is required.");
    this.command = command;
    this.args = args;
    this.env = env;
    this.spawnImpl = spawnImpl;
    this.timeoutMs = timeoutMs;
    this.process = null;
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutBuffer = "";
    this.stderrTail = [];
  }

  start() {
    if (this.process) return;
    this.process = this.spawnImpl(this.command, this.args, {
      env: { ...process.env, ...this.env },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");
    this.process.stdout.on("data", (chunk) => this.consume(chunk));
    this.process.stderr.on("data", (chunk) => {
      this.stderrTail.push(...String(chunk).split(/\r?\n/).filter(Boolean));
      this.stderrTail = this.stderrTail.slice(-20);
    });
    this.process.on("error", (error) => this.failAll(new McpError(`DataHub MCP process failed: ${error.message}`)));
    this.process.on("exit", (code) => {
      const suffix = this.stderrTail.length ? ` ${this.stderrTail.join(" | ")}` : "";
      this.failAll(new McpError(`DataHub MCP process exited with code ${code}.${suffix}`));
      this.process = null;
    });
  }

  consume(chunk) {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let payload;
      try { payload = JSON.parse(line); } catch { continue; }
      if (payload.id == null || !this.pending.has(payload.id)) continue;
      const pending = this.pending.get(payload.id);
      this.pending.delete(payload.id);
      clearTimeout(pending.timer);
      if (payload.error) pending.reject(new McpError(payload.error.message || "DataHub MCP returned an error.", payload.error.data));
      else pending.resolve(payload.result);
    }
  }

  failAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  send(payload) {
    this.start();
    this.process.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  async request(method, params = {}) {
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const suffix = this.stderrTail.length ? ` ${this.stderrTail.join(" | ")}` : "";
        reject(new McpError(`DataHub MCP request timed out: ${method}.${suffix}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.send({ jsonrpc: "2.0", id, method, params });
    return response;
  }

  notify(method, params = {}) {
    this.send({ jsonrpc: "2.0", method, params });
  }

  async initialize() {
    const result = await this.request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "ContextSeal", version: "0.1.0" }
    });
    this.notify("notifications/initialized");
    return result;
  }

  async listTools() {
    return this.request("tools/list");
  }

  async callTool(name, args = {}) {
    return assertToolResult(name, await this.request("tools/call", { name, arguments: args }));
  }

  async close() {
    if (!this.process) return;
    const child = this.process;
    this.process = null;
    child.stdin.end();
    child.kill();
  }
}

function parseArgs(value) {
  if (!value) return ["mcp-server-datahub@latest"];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
  } catch {}
  throw new Error("DATAHUB_MCP_ARGS must be a JSON array of strings.");
}

export function createDataHubMcpClient(env = process.env, dependencies = {}) {
  const transport = env.DATAHUB_MCP_TRANSPORT || "stdio";
  if (transport === "http") {
    return new DataHubMcpClient({
      url: env.DATAHUB_MCP_URL,
      token: env.DATAHUB_GMS_TOKEN || "",
      fetchImpl: dependencies.fetchImpl || fetch
    });
  }
  if (transport !== "stdio") throw new Error(`Unsupported DATAHUB_MCP_TRANSPORT: ${transport}`);
  return new DataHubStdioMcpClient({
    command: env.DATAHUB_MCP_COMMAND || "uvx",
    args: parseArgs(env.DATAHUB_MCP_ARGS),
    env: {
      DATAHUB_GMS_URL: env.DATAHUB_GMS_URL || "http://localhost:8080",
      DATAHUB_GMS_TOKEN: env.DATAHUB_GMS_TOKEN || "",
      TOOLS_IS_MUTATION_ENABLED: env.DATAHUB_MCP_MUTATIONS_ENABLED === "true" ? "true" : "false"
    },
    spawnImpl: dependencies.spawnImpl || spawn,
    timeoutMs: Number(env.DATAHUB_MCP_TIMEOUT_MS || 30_000)
  });
}
