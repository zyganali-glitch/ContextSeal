import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/env.js";
import { decideRun } from "../src/core/workflow.js";
import { analyzeWithLiveContext } from "../src/datahub/analysis.js";
import { createDataHubMcpClient } from "../src/datahub/mcp-client.js";
import { buildWritebackOperations, executeWriteback, WritebackError } from "../src/datahub/writeback.js";
import { RunStore } from "../src/store.js";

const helpText = `Usage: node scripts/run-live-proof.js [--read-only]\n\nRuns the disposable-local DataHub proof path without starting the web UI.\n--read-only  capture and persist fresh MCP read evidence only\n--help       print this message\n`;

if (process.argv.includes("--help")) {
  console.log(helpText);
  process.exit(0);
}

const readOnly = process.argv.includes("--read-only");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadEnvFile(root);

process.env.CONTEXTSEAL_MODE = "datahub";
process.env.DATAHUB_MCP_TRANSPORT ||= "stdio";
process.env.DATAHUB_MCP_COMMAND ||= "uvx";
process.env.DATAHUB_MCP_ARGS ||= '["mcp-server-datahub@latest"]';
process.env.DATAHUB_GMS_URL ||= "http://localhost:8080";

const policy = JSON.parse(await readFile(path.join(root, "config", "policy.json"), "utf8"));
const request = JSON.parse(await readFile(path.join(root, "examples", "retail-change-request.json"), "utf8"));
const context = JSON.parse(await readFile(path.join(root, "examples", "retail-context-graph.json"), "utf8"));
context.observedAt = new Date().toISOString();

const store = new RunStore(path.join(root, ".contextseal"));
await store.initialize();

if (!String(process.env.DATAHUB_GMS_TOKEN || "").trim()) {
  console.warn("WARN DATAHUB_GMS_TOKEN is unset. Continuing because some disposable local DataHub setups allow local access without a token.");
}

const run = await analyzeWithLiveContext({
  request,
  context,
  policy,
  mode: "datahub",
  enrichRun: async (value) => value
});
await store.save(run, "ANALYSIS_COMPLETED");

if (!run.liveEvidence) {
  throw new Error("Live MCP evidence was not attached to the datahub-mode run.");
}

const outputDirectory = path.join(root, "examples", "outputs");
await mkdir(outputDirectory, { recursive: true });

const readArtifactPath = path.join(outputDirectory, "live-datahub-read-evidence.json");
const readArtifact = {
  status: "PASS",
  transport: process.env.DATAHUB_MCP_TRANSPORT || "stdio",
  mutationToolsEnabled: process.env.DATAHUB_MCP_MUTATIONS_ENABLED === "true",
  ...run.liveEvidence
};
await writeFile(readArtifactPath, `${JSON.stringify(readArtifact, null, 2)}\n`, "utf8");

if (readOnly) {
  console.log(`PASS live read-only proof ${run.runId} -> ${path.relative(root, readArtifactPath)}`);
  process.exit(0);
}

if (process.env.DATAHUB_MCP_MUTATIONS_ENABLED !== "true") {
  throw new Error("Full live proof requires DATAHUB_MCP_MUTATIONS_ENABLED=true. Re-run with mutations enabled or pass --read-only.");
}

const approved = decideRun(run, {
  decision: "APPROVE",
  reviewer: "w23-recovery-script",
  note: "Approved safe competition-only write-back after refreshed live MCP capture.",
  scopeAccepted: true
});
await store.save(approved, "APPROVED_FOR_WRITEBACK");

const operations = buildWritebackOperations(approved, policy);
const client = createDataHubMcpClient();
let results;

try {
  await client.initialize();
  results = await executeWriteback(client, operations);
} catch (error) {
  if (error instanceof WritebackError) {
    const failed = {
      ...approved,
      state: "WRITEBACK_FAILED",
      writeback: { at: new Date().toISOString(), results: error.results },
      evidence: approved.evidence.map((item) => item.claim === "DataHub write-back completed"
        ? { ...item, state: "FAIL", artifact: error.results.map((result) => `${result.tool}:${result.status}`).join(", ") }
        : item)
    };
    await store.save(failed, "DATAHUB_WRITEBACK_FAILED");
  }
  throw error;
} finally {
  await client.close();
}

const updated = {
  ...approved,
  state: "CERTIFIED_AND_WRITTEN_BACK",
  writeback: { at: new Date().toISOString(), results },
  evidence: approved.evidence.map((item) => item.claim === "DataHub write-back completed"
    ? { ...item, state: "PASS", artifact: results.map((result) => result.tool).join(", ") }
    : item)
};
await store.save(updated, "DATAHUB_WRITEBACK_COMPLETED");

const writebackArtifactPath = path.join(outputDirectory, "live-datahub-writeback-evidence.json");
const writebackArtifact = {
  evidenceBoundary: "Disposable local DataHub with synthetic ContextSeal metadata; no production or customer data.",
  exportedAt: new Date().toISOString(),
  run: updated
};
await writeFile(writebackArtifactPath, `${JSON.stringify(writebackArtifact, null, 2)}\n`, "utf8");

console.log(`PASS live write-back proof ${updated.runId} -> ${path.relative(root, readArtifactPath)}, ${path.relative(root, writebackArtifactPath)}`);