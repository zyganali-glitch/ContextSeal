import path from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "../src/env.js";
import { createDataHubMcpClient } from "../src/datahub/mcp-client.js";
import { collectLiveEvidence } from "../src/datahub/live-context.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await loadEnvFile(root);
const request = JSON.parse(await readFile(path.join(root, "examples", "retail-change-request.json"), "utf8"));
const client = createDataHubMcpClient();
let liveEvidence;
try { liveEvidence = await collectLiveEvidence(client, request); }
finally { await client.close(); }

const output = {
  status: "PASS",
  transport: process.env.DATAHUB_MCP_TRANSPORT || "stdio",
  mutationToolsEnabled: process.env.DATAHUB_MCP_MUTATIONS_ENABLED === "true",
  ...liveEvidence
};
const outputPath = path.join(root, "examples", "outputs", "live-datahub-read-evidence.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`PASS live DataHub evidence: ${output.evidence.length} MCP calls -> ${path.relative(root, outputPath)}`);
