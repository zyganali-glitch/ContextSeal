import { spawn } from "node:child_process";
import { containsRuntimeCredential } from "../security/credential-scan.js";

const DEFAULT_MCP_ARGS = Object.freeze(["mcp-server-datahub@0.6.0"]);
const DEFAULT_MAX_MCP_MESSAGE_BYTES = 16 * 1024 * 1024;
const VERSIONED_DATAHUB_MCP_PACKAGE = /^mcp-server-datahub@\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/;
const SAFE_CHILD_ENV = new Set([
  "PATH", "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "TEMP", "TMP",
  "HOME", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "PROGRAMDATA",
  "UV_CACHE_DIR", "XDG_CACHE_HOME", "XDG_CONFIG_HOME", "XDG_DATA_HOME",
  "SSL_CERT_FILE", "SSL_CERT_DIR", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE",
  "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "LANG", "LC_ALL", "NODE_EXTRA_CA_CERTS"
]);
const DATAHUB_CHILD_ENV = new Set(["DATAHUB_GMS_URL", "DATAHUB_GMS_TOKEN", "TOOLS_IS_MUTATION_ENABLED"]);

export class McpError extends Error {
  constructor(message, data = null) {
    super(message);
    this.name = "McpError";
    this.data = data;
  }
}

function safeExternalMessage(value, fallback) {
  const message = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return containsRuntimeCredential(message)
    ? `${fallback} Credential-like detail was redacted.`
    : message;
}

function safeExternalData(value) {
  if (value == null) return null;
  return containsRuntimeCredential(JSON.stringify(value)) ? null : value;
}

function loopbackHostname(hostname) {
  const normalized = String(hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
  return normalized === "localhost" || normalized === "::1" || /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

function validatedMcpUrl(value) {
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new Error("DATAHUB_MCP_URL must be a valid URL."); }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error("DATAHUB_MCP_URL must use HTTPS, or HTTP on loopback only.");
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("DATAHUB_MCP_URL must not contain userinfo, query parameters, or a fragment.");
  }
  if (parsed.protocol === "http:" && !loopbackHostname(parsed.hostname)) {
    throw new Error("Remote DATAHUB_MCP_URL endpoints must use HTTPS.");
  }
  return parsed.toString();
}

function validatedDataHubGmsUrl(value) {
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new Error("DATAHUB_GMS_URL must be a valid URL."); }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) {
    throw new Error("DATAHUB_GMS_URL must use HTTPS, or HTTP on loopback only.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("DATAHUB_GMS_URL must not contain userinfo, query parameters, or a fragment.");
  }
  if (parsed.protocol === "http:" && !loopbackHostname(parsed.hostname)) {
    throw new Error("Remote DATAHUB_GMS_URL endpoints must use HTTPS.");
  }
  return parsed.toString();
}

function minimalChildEnvironment(overrides) {
  const child = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (SAFE_CHILD_ENV.has(key.toUpperCase()) && value != null) child[key] = value;
  }
  for (const [key, value] of Object.entries(overrides || {})) {
    if (!DATAHUB_CHILD_ENV.has(key)) throw new Error(`Unsupported DataHub MCP child environment key: ${key}`);
    child[key] = String(value ?? "");
  }
  return child;
}

function assertToolResult(name, result) {
  if (!result?.isError) return result;
  const raw = result.content?.filter((item) => item.type === "text").map((item) => item.text).join(" | ");
  const message = safeExternalMessage(raw, "Unknown tool error.");
  throw new McpError(`DataHub MCP tool failed (${name}): ${message}`);
}

function positiveByteLimit(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive safe integer.`);
  return value;
}

async function boundedResponseText(response, maxBytes) {
  const declared = response.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    throw new McpError("DataHub MCP response exceeded the configured size limit.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    bytes += chunk.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new McpError("DataHub MCP response exceeded the configured size limit.");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes).toString("utf8");
}

export class DataHubMcpClient {
  constructor({
    url,
    token = "",
    fetchImpl = fetch,
    timeoutMs = 30_000,
    maxResponseBytes = DEFAULT_MAX_MCP_MESSAGE_BYTES
  }) {
    if (!url) throw new Error("DataHub MCP URL is required.");
    this.url = validatedMcpUrl(url);
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.maxResponseBytes = positiveByteLimit(maxResponseBytes, "MCP response byte limit");
    this.sessionId = null;
    this.nextId = 1;
  }

  parseResponse(text, contentType, expectedId) {
    const payloads = [];
    if (/text\/event-stream/i.test(contentType) || /^\s*(?:event:|data:)/m.test(text)) {
      const events = text.replace(/\r\n/g, "\n").split(/\n\n+/);
      for (const event of events) {
        const data = event.split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n")
          .trim();
        if (!data || data === "[DONE]") continue;
        try { payloads.push(JSON.parse(data)); }
        catch { throw new McpError("DataHub MCP returned malformed SSE JSON."); }
      }
    } else {
      try { payloads.push(JSON.parse(text)); }
      catch { throw new McpError("DataHub MCP returned malformed JSON."); }
    }
    const correlated = payloads.filter((item) => item?.id === expectedId);
    if (correlated.length !== 1) {
      throw new McpError(correlated.length
        ? "DataHub MCP returned ambiguous duplicate responses for the request ID."
        : "DataHub MCP response did not correlate to the request ID.");
    }
    const [payload] = correlated;
    if (payload.jsonrpc !== "2.0") throw new McpError("DataHub MCP response has an invalid JSON-RPC version.");
    if (payload.error) throw new McpError(
      safeExternalMessage(payload.error.message, "DataHub MCP returned an error."),
      safeExternalData(payload.error.data)
    );
    if (!("result" in payload)) throw new McpError("DataHub MCP response is missing a JSON-RPC result.");
    return payload.result;
  }

  async send(method, params = {}, { notification = false } = {}) {
    const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    const id = notification ? null : this.nextId++;
    const controller = new AbortController();
    let timer;
    let response;
    try {
      response = await Promise.race([
        this.fetchImpl(this.url, {
          method: "POST",
          headers,
          // Never let an MCP endpoint turn this credentialed backend client
          // into a redirect-following SSRF primitive. MCP URLs are explicit.
          redirect: "error",
          signal: controller.signal,
          body: JSON.stringify({ jsonrpc: "2.0", ...(!notification ? { id } : {}), method, params })
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new McpError(`DataHub MCP request timed out: ${method}.`));
          }, this.timeoutMs);
        })
      ]);
    } catch (error) {
      if (error instanceof McpError) throw error;
      if (error?.name === "AbortError") throw new McpError(`DataHub MCP request timed out: ${method}.`);
      throw new McpError(`DataHub MCP request failed: ${method}.`);
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new McpError(`DataHub MCP request failed with HTTP ${response.status}.`);
    this.sessionId = response.headers.get("mcp-session-id") || this.sessionId;
    let bodyTimer;
    let text;
    try {
      text = await Promise.race([
        boundedResponseText(response, this.maxResponseBytes),
        new Promise((_, reject) => {
          bodyTimer = setTimeout(() => {
            controller.abort();
            reject(new McpError(`DataHub MCP response body timed out: ${method}.`));
          }, this.timeoutMs);
        })
      ]);
    } catch (error) {
      if (error instanceof McpError) throw error;
      if (error?.name === "AbortError") throw new McpError(`DataHub MCP response body timed out: ${method}.`);
      throw new McpError(`DataHub MCP response body failed: ${method}.`);
    } finally {
      clearTimeout(bodyTimer);
    }
    if (notification) {
      if (!text.trim()) return null;
      // Some servers acknowledge notifications with a JSON-RPC response. Parse
      // only enough to reject explicit protocol errors; no request ID is expected.
      let payload;
      try { payload = JSON.parse(text); } catch { return null; }
      if (payload?.error) throw new McpError(
        safeExternalMessage(payload.error.message, "DataHub MCP rejected a notification."),
        safeExternalData(payload.error.data)
      );
      return null;
    }
    if (!text.trim()) throw new McpError("DataHub MCP returned an empty JSON-RPC response.");
    return this.parseResponse(text, response.headers.get("content-type") || "", id);
  }

  async request(method, params = {}) {
    return this.send(method, params);
  }

  async notify(method, params = {}) {
    return this.send(method, params, { notification: true });
  }

  async initialize() {
    const result = await this.request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "ContextSeal", version: "0.1.0" }
    });
    await this.notify("notifications/initialized");
    return result;
  }

  async listTools() {
    return this.request("tools/list");
  }

  async callTool(name, args = {}) {
    return assertToolResult(name, await this.request("tools/call", { name, arguments: args }));
  }

  provenance() {
    // Deliberately omit tenant URLs, headers, session IDs, and credentials.
    return { transport: "http", launcherPackage: null };
  }

  async close() {}
}

export class DataHubStdioMcpClient {
  constructor({
    command = "uvx",
    args = [...DEFAULT_MCP_ARGS],
    env = {},
    spawnImpl = spawn,
    timeoutMs = 30_000,
    maxMessageBytes = DEFAULT_MAX_MCP_MESSAGE_BYTES
  } = {}) {
    if (!command) throw new Error("DataHub MCP command is required.");
    this.command = command;
    this.args = args;
    this.env = env;
    this.spawnImpl = spawnImpl;
    this.timeoutMs = timeoutMs;
    this.maxMessageBytes = positiveByteLimit(maxMessageBytes, "MCP stdio message byte limit");
    this.process = null;
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutBuffer = "";
    this.stderrObserved = false;
  }

  start() {
    if (this.process) return;
    this.stderrObserved = false;
    this.process = this.spawnImpl(this.command, this.args, {
      env: minimalChildEnvironment(this.env),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });
    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");
    this.process.stdout.on("data", (chunk) => this.consume(chunk));
    // Drain stderr so the child cannot block, but never retain or surface it:
    // subprocess diagnostics can contain URLs, tokens, or source metadata.
    this.process.stderr.on("data", () => { this.stderrObserved = true; });
    this.process.on("error", () => this.failAll(new McpError("DataHub MCP process failed to start; external detail was withheld.")));
    this.process.on("exit", (code) => {
      const suffix = this.stderrObserved ? " Subprocess diagnostics were redacted." : "";
      this.failAll(new McpError(`DataHub MCP process exited with code ${code}.${suffix}`));
      this.process = null;
    });
  }

  consume(chunk) {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() || "";
    if (Buffer.byteLength(this.stdoutBuffer, "utf8") > this.maxMessageBytes
        || lines.some((line) => Buffer.byteLength(line, "utf8") > this.maxMessageBytes)) {
      this.stdoutBuffer = "";
      this.failAll(new McpError("DataHub MCP stdio response exceeded the configured size limit."));
      const child = this.process;
      this.process = null;
      child?.kill();
      return;
    }
    for (const line of lines) {
      if (!line.trim()) continue;
      let payload;
      try { payload = JSON.parse(line); } catch { continue; }
      if (payload.id == null || !this.pending.has(payload.id)) continue;
      const pending = this.pending.get(payload.id);
      this.pending.delete(payload.id);
      clearTimeout(pending.timer);
      if (payload.error) pending.reject(new McpError(
        safeExternalMessage(payload.error.message, "DataHub MCP returned an error."),
        safeExternalData(payload.error.data)
      ));
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
        const suffix = this.stderrObserved ? " Subprocess diagnostics were redacted." : "";
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

  provenance() {
    const launcherPackage = this.args.find((value) => VERSIONED_DATAHUB_MCP_PACKAGE.test(value)) || null;
    // Never persist the executable path or arbitrary arguments: either may
    // expose a workstation path or command-line secret.
    return { transport: "stdio", launcherPackage };
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
  if (!value) return [...DEFAULT_MCP_ARGS];
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
      fetchImpl: dependencies.fetchImpl || fetch,
      timeoutMs: Number(env.DATAHUB_MCP_TIMEOUT_MS || 30_000)
    });
  }
  if (transport !== "stdio") throw new Error(`Unsupported DATAHUB_MCP_TRANSPORT: ${transport}`);
  return new DataHubStdioMcpClient({
    command: env.DATAHUB_MCP_COMMAND || "uvx",
    args: parseArgs(env.DATAHUB_MCP_ARGS),
    env: {
      DATAHUB_GMS_URL: validatedDataHubGmsUrl(env.DATAHUB_GMS_URL || "http://localhost:8080"),
      DATAHUB_GMS_TOKEN: env.DATAHUB_GMS_TOKEN || "",
      TOOLS_IS_MUTATION_ENABLED: env.DATAHUB_MCP_MUTATIONS_ENABLED === "true" ? "true" : "false"
    },
    spawnImpl: dependencies.spawnImpl || spawn,
    timeoutMs: Number(env.DATAHUB_MCP_TIMEOUT_MS || 30_000)
  });
}
